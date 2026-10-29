// Crea a la primera Administradora: su cuenta de ingreso en Neon y su alta en la aplicación.
// Hace tres cosas: (1) crea la cuenta con correo y contraseña, (2) la anota como Administrador en la base,
// (3) le da el rol de administración de Neon Auth, para que pueda crear las demás cuentas desde la aplicación.
//
// Antes: haber corrido aplicar-migraciones y tener VITE_NEON_URL y DATABASE_URL en el .env.
// Uso (PowerShell), con la contraseña en una variable para que no quede en el historial de comandos:
//   $env:CLAVE_ADMIN = "UnaClave2026"
//   node scripts/crear-primer-admin.mjs --correo persona@empresa.com --nombre "Nombre Apellido"
import { createClient } from "@neondatabase/neon-js";
import { validarClave } from "../src/auth/clave.js";
import { conectar } from "./conexion.mjs";

const arg = (n) => { const i = process.argv.indexOf("--" + n); return i > 0 ? process.argv[i + 1] : ""; };
const correo = arg("correo").trim().toLowerCase();
const nombre = arg("nombre").trim();
const clave = process.env.CLAVE_ADMIN || "";
const urlNeon = process.env.VITE_NEON_URL;
// Neon exige el origen de la página que pide la cuenta: sirve la dirección de desarrollo, que viene permitida.
const origen = process.env.ORIGEN_APP || "http://localhost:5173";

const falla = (msg) => { console.error(msg); process.exit(1); };
if(!correo || !nombre) falla('Uso: node scripts/crear-primer-admin.mjs --correo persona@empresa.com --nombre "Nombre Apellido"  (y la contraseña en $env:CLAVE_ADMIN)');
if(!clave) falla("Falta la contraseña: escríbala en la variable CLAVE_ADMIN (ver el comienzo de este archivo).");
if(validarClave(clave, clave)) falla(validarClave(clave, clave));
if(!urlNeon) falla("Falta VITE_NEON_URL (la dirección pública de Neon, sin claves) en el .env.");

const db = await conectar();
try {
  const hay = await db.query("select count(*)::int as n from perfiles where rol = 'Administrador' and activo");
  if(hay.rows[0].n > 0) falla("Ya existe un Administrador activo. Los demás se crean desde la aplicación (Usuarios).");

  const cliente = createClient(urlNeon);
  const r = await cliente.auth.signUp.email({ email: correo, password: clave, name: nombre }, { headers: { Origin: origen } });
  let id = r.data && r.data.user && r.data.user.id;
  if(r.error){
    if(!/already exists|user_already_exists/i.test(r.error.message || "")) falla("Neon no pudo crear la cuenta: " + (r.error.message || JSON.stringify(r.error)));
    const ya = await db.query('select id from neon_auth."user" where lower(email) = $1', [correo]);
    if(!ya.rows[0]) falla("La cuenta ya existe pero no se encontró. Revise Neon > Auth > Users.");
    id = ya.rows[0].id;
    console.log("La cuenta de ingreso ya existía: se conserva su contraseña actual.");
  }

  await db.query(
    "insert into perfiles (id, nombre, correo, rol, area, debe_cambiar_clave) values ($1, $2, $3, 'Administrador', '', false)",
    [id, nombre, correo]);
  await db.query('update neon_auth."user" set role = $1 where id = $2', ["admin", id]);
  console.log(`Listo: ${nombre} (${correo}) ya es Administradora y puede ingresar a la aplicación.`);
} finally { await db.end(); }
