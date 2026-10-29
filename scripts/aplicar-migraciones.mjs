// Aplica los archivos de db/migraciones/ en orden. Es seguro repetirlo: lo que ya se aplicó no se vuelve a correr.
// Antes de usarlo hay que activar la Data API en Neon (crea el esquema "auth" y los roles que usan las reglas).
import { readdirSync, readFileSync } from "node:fs";
import { conectar } from "./conexion.mjs";

const carpeta = new URL("../db/migraciones/", import.meta.url);
const db = await conectar();
try {
  const { rows } = await db.query("select to_regprocedure('auth.user_id()') as f, (select count(*) from pg_roles where rolname in ('anonymous','authenticated')) as roles");
  if(!rows[0].f || Number(rows[0].roles) < 2){
    console.error("Esta base todavía no tiene la Data API activada (faltan auth.user_id() o los roles anonymous/authenticated).");
    console.error("En Neon: Postgres database > Data API > Enable Data API (con «Use Neon Auth» marcado). Luego repita este paso.");
    process.exit(1);
  }
  await db.query("create table if not exists migraciones_aplicadas (nombre text primary key, aplicada_en timestamptz not null default now())");
  const hechas = new Set((await db.query("select nombre from migraciones_aplicadas")).rows.map(r => r.nombre));
  for(const archivo of readdirSync(carpeta).filter(f => f.endsWith(".sql")).sort()){
    if(hechas.has(archivo)){ console.log(`= ${archivo} (ya aplicada)`); continue; }
    await db.query("begin");
    try {
      await db.query(readFileSync(new URL(archivo, carpeta), "utf8"));
      await db.query("insert into migraciones_aplicadas (nombre) values ($1)", [archivo]);
      await db.query("commit");
      console.log(`+ ${archivo}`);
    } catch(e){
      await db.query("rollback");
      console.error(`x ${archivo}: ${e.message}`);
      process.exit(1);
    }
  }
  console.log("Listo. Ahora, en Neon > Data API, pulse «Refresh schema cache».");
} finally { await db.end(); }