// Función del servidor para administrar personas. Solo la puede usar un Administrador.
//
// Por qué existe: crear cuentas de acceso exige la clave "service_role", que NUNCA debe estar en
// el navegador. Aquí vive como secreto del servidor y la aplicación solo le pide el trabajo.
//
// Acciones (POST con JSON): crear, restablecer, desactivar, activar. Ver logica.js.
// Despliegue: supabase functions deploy admin-usuarios   (Supabase pone SUPABASE_URL,
// SUPABASE_ANON_KEY y SUPABASE_SERVICE_ROLE_KEY solos).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.118.0";
import { generarClaveTemporal, permitido, validarSolicitud } from "./logica.js";

const cabeceras = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};
const responder = (estado: number, cuerpo: unknown) => new Response(JSON.stringify(cuerpo), { status: estado, headers: cabeceras });

const azar = (n: number) => crypto.getRandomValues(new Uint32Array(1))[0] % n;

Deno.serve(async (req: Request) => {
  if(req.method === "OPTIONS") return new Response("ok", { headers: cabeceras });
  if(req.method !== "POST") return responder(405, { error: "Método no permitido." });

  const url = Deno.env.get("SUPABASE_URL")!;
  const token = (req.headers.get("Authorization") || "").replace(/^Bearer /i, "");
  if(!token) return responder(401, { error: "Debe iniciar sesión." });

  // 1. ¿Quién llama? Se comprueba el token con Supabase.
  const comoUsuario = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data: sesion, error: errSesion } = await comoUsuario.auth.getUser(token);
  if(errSesion || !sesion.user) return responder(401, { error: "Su sesión no es válida. Ingrese de nuevo." });

  // 2. ¿Es un Administrador activo? Se lee con la clave del servidor, no con lo que diga el navegador.
  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const { data: quien } = await admin.from("perfiles").select("id, rol, activo").eq("id", sesion.user.id).maybeSingle();

  let cuerpo;
  try { cuerpo = await req.json(); } catch { return responder(400, { error: "La solicitud no se pudo leer." }); }
  const val = validarSolicitud(cuerpo);
  if(!val.ok) return responder(400, { error: val.error });
  const datos = val.datos;
  const permiso = permitido(quien, datos);
  if(!permiso.ok) return responder(403, { error: permiso.error });

  try {
    if(datos.accion === "crear"){
      const clave = generarClaveTemporal(azar);
      const { data: nuevo, error } = await admin.auth.admin.createUser({
        email: datos.correo, password: clave, email_confirm: true, user_metadata: { nombre: datos.nombre },
      });
      if(error || !nuevo.user){
        const yaExiste = /already|registered|exists/i.test(error?.message || "");
        return responder(yaExiste ? 409 : 500, { error: yaExiste ? "Ya existe una cuenta con ese correo." : "No se pudo crear la cuenta." });
      }
      const { error: errPerfil } = await admin.from("perfiles").insert({
        id: nuevo.user.id, nombre: datos.nombre, correo: datos.correo, rol: datos.rol, area: datos.area,
        activo: true, debe_cambiar_clave: true,
      });
      if(errPerfil){
        await admin.auth.admin.deleteUser(nuevo.user.id); // no se deja una cuenta sin perfil
        return responder(500, { error: "No se pudo guardar a la persona. No se creó la cuenta." });
      }
      return responder(200, { id: nuevo.user.id, correo: datos.correo, clave });
    }

    if(datos.accion === "restablecer"){
      const clave = generarClaveTemporal(azar);
      const { error } = await admin.auth.admin.updateUserById(datos.id, { password: clave });
      if(error) return responder(404, { error: "No se encontró a esa persona." });
      await admin.from("perfiles").update({ debe_cambiar_clave: true }).eq("id", datos.id);
      return responder(200, { id: datos.id, clave });
    }

    // desactivar / activar: se marca en la base de datos (corta el acceso de inmediato) y se bloquea el ingreso.
    const activar = datos.accion === "activar";
    const { error: errPerfil } = await admin.from("perfiles").update({ activo: activar }).eq("id", datos.id);
    if(errPerfil) return responder(409, { error: errPerfil.message }); // por ejemplo: debe quedar un Administrador activo
    await admin.auth.admin.updateUserById(datos.id, { ban_duration: activar ? "none" : "876000h" });
    return responder(200, { id: datos.id, activo: activar });
  } catch (e) {
    console.error(e);
    return responder(500, { error: "Ocurrió un error inesperado." });
  }
});
