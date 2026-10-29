// Crea el primer Administrador de una base nueva (cuenta de acceso + perfil) con una contraseña temporal.
// Se usa una sola vez, antes de entrar por primera vez a la aplicación. Las demás cuentas las crea el
// Administrador desde la pantalla «Usuarios».
//
// Uso:
//   SUPABASE_URL=https://<proyecto>.supabase.co SUPABASE_SERVICE_ROLE_KEY=<clave del servidor> \
//   node scripts/crear-primer-admin.mjs --nombre "Nombre Apellido" --correo persona@empresa.com --proyecto <identificador>
//
// Opciones: --sin-catalogo  no crea las áreas y tipos iniciales.
// La clave del servidor (service_role) solo se escribe en la terminal: nunca va a git, a config.js ni a la aplicación.
// La contraseña temporal se muestra una sola vez; la persona debe cambiarla en su primer ingreso.
import { createClient } from "@supabase/supabase-js";
import { randomInt } from "node:crypto";
import { crearPrimerAdmin, leerOpciones, validarEntradas } from "../src/admin/primerAdmin.js";

const opciones = leerOpciones(process.argv.slice(2));
const revision = validarEntradas(opciones, process.env);
if(!revision.ok){ console.error("Error: " + revision.error); process.exit(1); }

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
try {
  const r = await crearPrimerAdmin(sb, revision.datos, { azar: (n) => randomInt(n), sembrarCatalogo: !opciones["sin-catalogo"] });
  console.log("\nAdministrador creado.\n");
  console.log("  Usuario:             " + revision.datos.correo);
  console.log("  Contraseña temporal: " + r.clave);
  console.log("\nEsta contraseña NO se vuelve a mostrar. Entréguela a la persona por un medio seguro;");
  console.log("al ingresar, la aplicación le pedirá cambiarla.");
  if(r.sembrado.areas) console.log(`\nSe crearon ${r.sembrado.areas} áreas y ${r.sembrado.tipos} tipos iniciales (se pueden editar desde la aplicación).`);
} catch(e){
  console.error("Error: " + e.message);
  process.exit(1);
}
