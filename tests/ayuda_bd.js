// Prepara una base de datos de prueba para los tests: un PostgreSQL que corre dentro de Node,
// con lo que Supabase trae de fábrica (roles, esquema "auth", permisos por defecto) y los
// mismos archivos SQL que se ejecutarán en Supabase.
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

export const FIRMA = "firmas/prueba/firma.png";

export async function iniciarBD(){
  const db = new PGlite();
  await db.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create schema auth;
    create table auth.users (id uuid primary key, email text);
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth, public to anon, authenticated;
    alter default privileges in schema public grant all on tables to anon, authenticated;
    alter default privileges in schema public grant all on sequences to anon, authenticated;
    alter default privileges in schema public grant execute on functions to anon, authenticated;
  `);
  const carpeta = new URL("../supabase/migrations/", import.meta.url);
  for(const archivo of readdirSync(carpeta).filter(f => f.endsWith(".sql")).sort()){
    await db.exec(readFileSync(new URL(archivo, carpeta), "utf8"));
  }
  await db.exec(`
    insert into auth.users (id, email) values
      ('${ADMIN}', 'admin@x.co'), ('${RESP_CALIDAD}', 'calidad@x.co'),
      ('${RESP_PRODUCCION}', 'produccion@x.co'), ('${APROBADOR}', 'aprobador@x.co');
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
    await db.exec(id ? "set role authenticated" : "set role anon");
    try { return await fn(); } finally { await db.exec("reset role"); }
  }
  const q = (texto, params) => db.query(texto, params).then(r => r.rows);
  const crear = (data, borrador = false) =>
    q("select * from crear_registro($1::jsonb, $2, $3)", [JSON.stringify(data), borrador, borrador ? "" : FIRMA]).then(r => r[0]);

  return { db, como, q, crear };
}
