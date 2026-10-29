// Herramienta de los respaldos. Se usa desde el flujo diario de GitHub (docs/respaldo-diario.yml)
// y también a mano para abrir un respaldo.
//
//   node scripts/respaldo.mjs cifrar    <entrada> <salida>      cifra un archivo
//   node scripts/respaldo.mjs descifrar <entrada> <salida>      abre un respaldo cifrado
//   node scripts/respaldo.mjs archivos  <carpeta-de-respaldos>  copia a la carpeta los archivos nuevos de Storage
//
// Variables: BACKUP_PASSPHRASE (siempre), y para "archivos": SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY.
import { createClient } from "@supabase/supabase-js";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { cifrar, descifrar } from "../src/respaldo/cifrado.js";
import { archivosPendientes, listarTodo, rutaEnRespaldo } from "../src/respaldo/archivos.js";

const BUCKET = "archivos";
const [, , comando, a, b] = process.argv;
const frase = process.env.BACKUP_PASSPHRASE || "";

function fallar(mensaje){ console.error("Error: " + mensaje); process.exit(1); }
function guardar(ruta, datos){ mkdirSync(dirname(ruta), { recursive: true }); writeFileSync(ruta, datos); }
function todosLosArchivos(carpeta){
  if(!existsSync(carpeta)) return [];
  return readdirSync(carpeta).flatMap(n => {
    const ruta = join(carpeta, n);
    return statSync(ruta).isDirectory() ? todosLosArchivos(ruta) : [ruta];
  });
}

if((comando === "cifrar" || comando === "descifrar") && a && b){
  if(!frase) fallar("falta la variable BACKUP_PASSPHRASE.");
  try { guardar(b, (comando === "cifrar" ? cifrar : descifrar)(readFileSync(a), frase)); }
  catch(e){ fallar(e.message); }
  console.log(`${comando === "cifrar" ? "Cifrado" : "Descifrado"}: ${b}`);
} else if(comando === "archivos" && a){
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
  if(!frase || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) fallar("faltan BACKUP_PASSPHRASE, SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.");
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const remotos = await listarTodo(supabase.storage, BUCKET);
  // Lo que ya está copiado se reconoce por su ruta dentro de la carpeta de respaldos.
  const existentes = todosLosArchivos(join(a, "archivos")).map(f => f.slice(a.length + 1).split("\\").join("/"));
  const pendientes = archivosPendientes(remotos, existentes);
  let copiados = 0;
  for(const ruta of pendientes){
    const { data, error } = await supabase.storage.from(BUCKET).download(ruta);
    if(error) fallar(`no se pudo descargar ${ruta}: ${error.message}`);
    guardar(join(a, rutaEnRespaldo(ruta)), cifrar(Buffer.from(await data.arrayBuffer()), frase));
    copiados++;
  }
  console.log(`Archivos en la aplicación: ${remotos.length}. Ya estaban respaldados: ${remotos.length - pendientes.length}. Copiados ahora: ${copiados}.`);
} else {
  fallar("uso: respaldo.mjs cifrar|descifrar <entrada> <salida>  ·  respaldo.mjs archivos <carpeta-de-respaldos>");
}
