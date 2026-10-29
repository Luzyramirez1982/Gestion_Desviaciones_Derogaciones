// Da de alta a la primera Administradora en la aplicación.
// Antes: crear su cuenta de ingreso en Neon (Auth > Users > Add user) y, en ese mismo menú, «Make admin»
// (así podrá crear las demás cuentas desde la aplicación). Uso:
//   node scripts/crear-primer-admin.mjs --correo persona@empresa.com --nombre "Nombre Apellido"
import { conectar } from "./conexion.mjs";

const arg = (n) => { const i = process.argv.indexOf("--" + n); return i > 0 ? process.argv[i + 1] : ""; };
const correo = arg("correo").trim().toLowerCase();
const nombre = arg("nombre").trim();
if(!correo || !nombre){
  console.error('Uso: node scripts/crear-primer-admin.mjs --correo persona@empresa.com --nombre "Nombre Apellido"');
  process.exit(1);
}
const db = await conectar();
try {
  const { rows } = await db.query('select id from neon_auth."user" where lower(email) = $1', [correo]);
  if(!rows[0]){
    console.error(`No hay una cuenta de ingreso con el correo ${correo}. Créela primero en Neon > Auth > Users.`);
    process.exit(1);
  }
  const hay = await db.query("select count(*)::int as n from perfiles where rol = 'Administrador' and activo");
  if(hay.rows[0].n > 0){
    console.error("Ya existe un Administrador activo. Los demás se crean desde la aplicación (Usuarios).");
    process.exit(1);
  }
  await db.query(
    "insert into perfiles (id, nombre, correo, rol, area, debe_cambiar_clave) values ($1, $2, $3, 'Administrador', '', false)",
    [rows[0].id, nombre, correo]);
  console.log(`Listo: ${nombre} (${correo}) ya es Administradora de la aplicación.`);
} finally { await db.end(); }