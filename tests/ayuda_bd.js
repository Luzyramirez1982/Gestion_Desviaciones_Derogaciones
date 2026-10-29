// Prepara una base de datos de prueba para los tests: un PostgreSQL que corre dentro de Node,
// con lo que Neon trae de fábrica (roles, esquema "auth", permisos por defecto) y los
// mismos archivos SQL que se ejecutan en Neon.
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";

export const ADMIN = "00000000-0000-0000-0000-000000000001";
export const RESP_CALIDAD = "00000000-0000-0000-0000-000000000002";
export const RESP_PRODUCCION = "00000000-0000-0000-0000-000000000003";
export const APROBADOR = "00000000-0000-0000-0000-000000000004";

export const solicitud = (o = {}) => ({ tipoGestion: "Desviación", area: "Calidad Producto", criticidad: "Menor", descripcion: "Prueba", ...o });

export const derogacion = (o = {}) => solicitud({
  tipoGestion: "Derogación", alcanceDerogacion: "Temporal", vigenciaInicio: "2026-11-01", vigenciaFin: "2026-11-30", ...o,
});

// La imagen de la firma de cada persona va en su propia carpeta.
export const firmaDe = (uid, archivo = "firma.png") => `firmas/${uid}/${archivo}`;

// opciones.antes: SQL que se ejecuta antes de las migraciones (por ejemplo, la base de la versión anterior).
export async function iniciarBD(opciones = {}){
  const db = new PGlite();
  await db.exec(`
    create role anonymous nologin;
    create role authenticated nologin;
    create schema auth;
    -- Igual que en Neon: auth.user_id() devuelve el identificador de la cuenta que hizo la petición.
    create function auth.user_id() returns text language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '') $$;
    grant usage on schema auth, public to anonymous, authenticated;
    alter default privileges in schema public grant all on tables to anonymous, authenticated;
    alter default privileges in schema public grant all on sequences to anonymous, authenticated;
    alter default privileges in schema public grant execute on functions to anonymous, authenticated;
  `);
  if(opciones.antes) await db.exec(opciones.antes);
  const carpeta = new URL("../db/migraciones/", import.meta.url);
  for(const archivo of readdirSync(carpeta).filter(f => f.endsWith(".sql")).sort()){
    await db.exec(readFileSync(new URL(archivo, carpeta), "utf8"));
  }
  await db.exec(`
    insert into perfiles (id, nombre, correo, rol, area) values
      ('${ADMIN}', 'Natalia', 'admin@x.co', 'Administrador', ''),
      ('${RESP_CALIDAD}', 'Juan', 'calidad@x.co', 'Responsable del proceso', 'Calidad Producto'),
      ('${RESP_PRODUCCION}', 'Camila', 'produccion@x.co', 'Responsable del proceso', 'Producción'),
      ('${APROBADOR}', 'Carlos', 'aprobador@x.co', 'Aprobador autorizado', '');
  `);

  // Ejecuta algo "como si fuera" esa persona (igual que cuando entra con su sesión en la app).
  async function como(id, fn){
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claim.sub', $1, false)", [id || ""]);
    await db.exec(id ? "set role authenticated" : "set role anonymous");
    try { return await fn(); } finally { await db.exec("reset role"); }
  }
  const q = (texto, params) => db.query(texto, params).then(r => r.rows);
  // Crea una solicitud como la persona en sesión; si se envía, firma con la imagen de su carpeta.
  const crear = async (data, borrador = false) => {
    const [{ uid }] = await q("select auth.user_id() as uid");
    return q("select * from crear_registro($1::jsonb, $2, $3)", [JSON.stringify(data), borrador, borrador ? "" : firmaDe(uid)]).then(r => r[0]);
  };

  // Deja un archivo ya guardado (como si se hubiera subido), para probar reglas que no son de la subida.
  const archivoGuardado = (ruta, tamano) => db.query(
    "insert into archivos (ruta, tipo, tamano, contenido) values ($1, 'application/pdf', $2, 'AAAA') on conflict do nothing", [ruta, tamano]);

  return { db, como, q, crear, archivoGuardado };
}