// Lógica de scripts/crear-primer-admin.mjs, separada para poder probarla sin Supabase.
// El primer Administrador no se activa desde la pantalla: se crea con ese script, usando la clave del servidor.
import { generarClaveTemporal } from "../../supabase/functions/admin-usuarios/logica.js";
import { proyectoCoincide } from "../migracion/aplicar.js";
import { DEFAULT_AREAS } from "../dominio/constantes.js";
import { TIPOS_POR_DEFECTO } from "../dominio/catalogo.js";

const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Revisa lo que escribió la persona. Devuelve { ok: true, datos } o { ok: false, error }.
export function validarEntradas(opciones, env){
  const nombre = String(opciones.nombre || "").trim();
  const correo = String(opciones.correo || "").trim().toLowerCase();
  if(nombre.length < 3) return { ok: false, error: "Escriba el nombre completo con --nombre \"Nombre Apellido\"." };
  if(!CORREO.test(correo)) return { ok: false, error: "Escriba un correo válido con --correo." };
  if(!env.SUPABASE_URL || !/^https:\/\//.test(env.SUPABASE_URL)) return { ok: false, error: "Falta la variable SUPABASE_URL (debe empezar con https://)." };
  if(!env.SUPABASE_SERVICE_ROLE_KEY) return { ok: false, error: "Falta la variable SUPABASE_SERVICE_ROLE_KEY." };
  if(!opciones.proyecto || opciones.proyecto === true) return { ok: false, error: "Indique el identificador del proyecto con --proyecto, para no crear el Administrador en el proyecto equivocado." };
  if(!proyectoCoincide(env.SUPABASE_URL, String(opciones.proyecto))) return { ok: false, error: "El identificador del proyecto no coincide con SUPABASE_URL. No se hizo nada." };
  return { ok: true, datos: { nombre, correo } };
}

export function leerOpciones(argv){
  const opciones = {};
  for(let i = 0; i < argv.length; i++){
    if(!argv[i].startsWith("--")) continue;
    opciones[argv[i].slice(2)] = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[++i] : true;
  }
  return opciones;
}

// Filas con las que arranca el catálogo si todavía no hay áreas ni tipos.
export const catalogoInicial = () => ({
  areas: DEFAULT_AREAS.map((nombre, orden) => ({ nombre, orden })),
  tipos: TIPOS_POR_DEFECTO.map(t => ({ id: t.id, area: t.area, nombre: t.nombre, data: { desc: t.desc || "" } })),
});

// Crea la cuenta y el perfil de Administrador. sb es un cliente de supabase-js con la clave del servidor.
// Devuelve la contraseña temporal (se muestra una sola vez; no se guarda en ningún lado).
export async function crearPrimerAdmin(sb, { nombre, correo }, { azar, sembrarCatalogo = true }){
  const { data: admins, error: errAdmins } = await sb.from("perfiles").select("id").eq("rol", "Administrador").eq("activo", true).limit(1);
  if(errAdmins) throw new Error("No se pudo consultar la base de datos. ¿Se ejecutaron las migraciones 0000 a 0006? Detalle: " + errAdmins.message);
  if(admins.length) throw new Error("Ya existe un Administrador activo. Las demás cuentas las crea el Administrador desde la aplicación (Usuarios).");

  const clave = generarClaveTemporal(azar);
  const { data, error } = await sb.auth.admin.createUser({ email: correo, password: clave, email_confirm: true, user_metadata: { nombre } });
  if(error || !data || !data.user){
    const yaExiste = /already|registered|exists/i.test((error && error.message) || "");
    throw new Error(yaExiste ? "Ya existe una cuenta con ese correo en Supabase Auth. Bórrela desde el panel de Supabase o use otro correo." : "No se pudo crear la cuenta de acceso.");
  }
  const { error: errPerfil } = await sb.from("perfiles").insert({
    id: data.user.id, nombre, correo, rol: "Administrador", area: "", activo: true, debe_cambiar_clave: true,
  });
  if(errPerfil){
    await sb.auth.admin.deleteUser(data.user.id);   // no se deja una cuenta sin perfil
    throw new Error("No se pudo guardar el perfil de Administrador. No se creó la cuenta. Detalle: " + errPerfil.message);
  }

  const sembrado = { areas: 0, tipos: 0 };
  if(sembrarCatalogo){
    const { data: hayAreas } = await sb.from("areas").select("nombre").limit(1);
    if(!hayAreas.length){
      const cat = catalogoInicial();
      const e1 = await sb.from("areas").insert(cat.areas);
      if(!e1.error){ sembrado.areas = cat.areas.length; const e2 = await sb.from("tipos").insert(cat.tipos); if(!e2.error) sembrado.tipos = cat.tipos.length; }
    }
  }
  return { id: data.user.id, clave, sembrado };
}
