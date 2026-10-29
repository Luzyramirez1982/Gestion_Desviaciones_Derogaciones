// Carga las áreas y los tipos de desviación o derogación con los que arranca la base (los mismos de siempre).
// Es seguro repetirlo: lo que ya existe no se toca. Después el Administrador los edita desde la aplicación.
import { TIPOS_POR_DEFECTO } from "../src/dominio/catalogo.js";
import { conectar } from "./conexion.mjs";

const areas = [...new Set(TIPOS_POR_DEFECTO.map(t => t.area))];
const db = await conectar();
try {
  await db.query("begin");
  for(const [orden, nombre] of areas.entries())
    await db.query("insert into areas (nombre, orden) values ($1, $2) on conflict do nothing", [nombre, orden]);
  for(const { id, area, nombre, ...resto } of TIPOS_POR_DEFECTO)
    await db.query("insert into tipos (id, area, nombre, data) values ($1, $2, $3, $4) on conflict do nothing", [id, area, nombre, JSON.stringify(resto)]);
  await db.query("commit");
  console.log(`Listo: ${areas.length} áreas y ${TIPOS_POR_DEFECTO.length} tipos.`);
} catch(e){
  await db.query("rollback"); console.error(e.message); process.exit(1);
} finally { await db.end(); }