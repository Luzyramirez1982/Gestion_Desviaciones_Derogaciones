// Migra los datos de la versión anterior a la base de datos nueva. Tres pasos, siempre en este orden:
//
//   1. exportar  Copia las tablas de la versión anterior a archivos JSON (copia de seguridad y punto de partida).
//   2. simular   Lee esos archivos y dice qué se migraría y qué avisos hay. No escribe nada en ninguna base.
//   3. aplicar   Guarda los datos en la base nueva (después de ejecutar las migraciones 0000 a 0005).
//
// Uso:
//   node scripts/migrar-v1-a-v2.mjs exportar --destino exportacion [--sufijo _v1]
//   node scripts/migrar-v1-a-v2.mjs simular  --exportacion exportacion
//   node scripts/migrar-v1-a-v2.mjs aplicar  --exportacion exportacion --proyecto <identificador> [--repetir]
//
// Variables: SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY del proyecto con el que se trabaja
// (en "exportar", el de la versión anterior; en "aplicar", el nuevo). Nunca subir esas claves a git.
// "--sufijo _v1" se usa en "exportar" si el paso 0000 ya apartó las tablas viejas con ese sufijo.
import { createClient } from "@supabase/supabase-js";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { planificar } from "../src/migracion/v1a2.js";
import { aplicarPlan, proyectoCoincide } from "../src/migracion/aplicar.js";

const TABLAS = ["registros", "usuarios", "tipos_desviacion", "configuracion", "registros_eliminados"];
const [, , comando, ...resto] = process.argv;
const opciones = {};
for(let i = 0; i < resto.length; i++){
  if(!resto[i].startsWith("--")) continue;
  const clave = resto[i].slice(2);
  opciones[clave] = resto[i + 1] && !resto[i + 1].startsWith("--") ? resto[++i] : true;
}

function fallar(mensaje){ console.error("Error: " + mensaje); process.exit(1); }

function conectar(){
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
  if(!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) fallar("faltan las variables SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY.");
  return { url: SUPABASE_URL, sb: createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } }) };
}

function leerExportacion(carpeta){
  if(!carpeta || !existsSync(carpeta)) fallar("indique la carpeta de la exportación con --exportacion.");
  const exp = {};
  for(const t of [...TABLAS, "auth_users"]){
    const ruta = join(carpeta, `${t}.json`);
    if(!existsSync(ruta)) fallar(`falta el archivo ${ruta}.`);
    exp[t] = JSON.parse(readFileSync(ruta, "utf8"));
  }
  return exp;
}

function mostrarResumen(plan){
  console.log("\nResumen de lo que se migraría:");
  for(const [k, v] of Object.entries(plan.resumen)) console.log(`  ${k}: ${v}`);
  if(plan.sinCuenta.length){
    console.log("\nPersonas SIN cuenta de acceso (hay que crearlas con la función admin-usuarios; no se migran como personas):");
    plan.sinCuenta.forEach(p => console.log(`  - ${p.nombre} <${p.correo}> · ${p.rol}${p.area ? " · " + p.area : ""}`));
  }
  if(plan.avisos.length){
    console.log(`\nAvisos (${plan.avisos.length}):`);
    plan.avisos.forEach(a => console.log("  - " + a));
  }
}

// Las operaciones que necesita aplicarPlan, con la clave del servidor.
function clienteSupabase(sb){
  const ok = ({ error }, donde) => { if(error) throw new Error(`${donde}: ${error.message}`); };
  return {
    async upsert(tabla, filas, unica){
      for(let i = 0; i < filas.length; i += 200) ok(await sb.from(tabla).upsert(filas.slice(i, i + 200), { onConflict: unica }), tabla);
    },
    async reemplazar(tabla, columna, valor, filas){
      ok(await sb.from(tabla).delete().eq(columna, valor), tabla);
      if(filas.length) ok(await sb.from(tabla).insert(filas), tabla);
    },
    async subir(ruta, bytes, tipo){
      ok(await sb.storage.from("archivos").upload(ruta, bytes, { contentType: tipo, upsert: true }), ruta);
    },
    async contar(tabla){
      const { count, error } = await sb.from(tabla).select("*", { count: "exact", head: true });
      if(error) throw new Error(`${tabla}: ${error.message}`);
      return count;
    },
    async establecerConsecutivo(n){ ok(await sb.rpc("establecer_consecutivo", { p_ultimo: n }), "consecutivo"); },
  };
}

if(comando === "exportar"){
  const destino = opciones.destino;
  if(!destino || destino === true) fallar("indique la carpeta con --destino.");
  const sufijo = opciones.sufijo && opciones.sufijo !== true ? opciones.sufijo : "";
  const { sb } = conectar();
  mkdirSync(destino, { recursive: true });
  for(const t of TABLAS){
    const filas = [];
    for(let desde = 0; ; desde += 1000){
      const { data, error } = await sb.from(t + sufijo).select("*").order("id").range(desde, desde + 999);
      if(error) fallar(`no se pudo leer ${t + sufijo}: ${error.message}`);
      filas.push(...data);
      if(data.length < 1000) break;
    }
    writeFileSync(join(destino, `${t}.json`), JSON.stringify(filas));
    console.log(`${t}: ${filas.length} filas`);
  }
  const cuentas = [];
  for(let pagina = 1; ; pagina++){
    const { data, error } = await sb.auth.admin.listUsers({ page: pagina, perPage: 1000 });
    if(error) fallar(`no se pudieron leer las cuentas de acceso: ${error.message}`);
    cuentas.push(...data.users.map(u => ({ id: u.id, email: u.email })));
    if(data.users.length < 1000) break;
  }
  writeFileSync(join(destino, "auth_users.json"), JSON.stringify(cuentas));
  console.log(`auth_users: ${cuentas.length} cuentas\nListo. Guarde esta carpeta en un lugar seguro: contiene datos reales y NO debe subirse a git.`);
} else if(comando === "simular"){
  const plan = planificar(leerExportacion(opciones.exportacion));
  mostrarResumen(plan);
  // El informe no incluye el contenido de los registros, solo el resumen y los avisos.
  writeFileSync("informe-migracion.json", JSON.stringify({ resumen: plan.resumen, sinCuenta: plan.sinCuenta, avisos: plan.avisos }, null, 2));
  console.log("\nNo se escribió nada en ninguna base de datos. Informe: informe-migracion.json");
} else if(comando === "aplicar"){
  const { url, sb } = conectar();
  if(!proyectoCoincide(url, opciones.proyecto)){
    fallar("el identificador de --proyecto no coincide con la dirección de SUPABASE_URL. Es una protección para no migrar en el proyecto equivocado.");
  }
  const plan = planificar(leerExportacion(opciones.exportacion));
  mostrarResumen(plan);
  if(plan.perfiles.length === 0 || !plan.perfiles.some(p => p.rol === "Administrador")){
    fallar("no hay ningún Administrador con cuenta de acceso entre las personas a migrar. Cree primero la cuenta del Administrador.");
  }
  console.log(`\nAplicando en ${new URL(url).hostname} ...`);
  try {
    const hecho = await aplicarPlan(plan, clienteSupabase(sb), { permitirRepetir: opciones.repetir === true, alAvanzar: p => console.log(`  listo: ${p}`) });
    console.log("\nMigración terminada:", JSON.stringify(hecho));
  } catch(e){ fallar(e.message); }
} else {
  fallar("uso: migrar-v1-a-v2.mjs exportar|simular|aplicar  (ver las instrucciones al inicio del archivo).");
}
