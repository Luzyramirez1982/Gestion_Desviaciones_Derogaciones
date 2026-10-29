// Cómo la aplicación sube y baja archivos: habla con la función de servidor «archivos» (functions/archivos/),
// que guarda las claves del bucket. A la función se le manda siempre la sesión de la persona.
// `obtenerToken` devuelve el token de sesión vigente; así este archivo se prueba sin Neon.

async function mensajeDe(respuesta, porDefecto){
  try {
    const json = await respuesta.json();
    if(json && json.error) return json.error;
  } catch { /* la respuesta no traía explicación */ }
  return porDefecto;
}

export function crearAlmacenFuncion(urlFuncion, obtenerToken){
  const base = String(urlFuncion).replace(/\/+$/, "");

  async function pedir(ruta, opciones = {}){
    const token = await obtenerToken();
    if(!token){ const e = new Error("Su sesión venció. Ingrese de nuevo."); e.codigo = "sesion_vencida"; throw e; }
    try {
      return await fetch(`${base}/archivo?ruta=${encodeURIComponent(ruta)}`, {
        ...opciones, headers: { ...(opciones.headers || {}), Authorization: `Bearer ${token}` },
      });
    } catch {
      const e = new Error("No hay conexión con el servidor. Revise su internet y vuelva a intentarlo.");
      e.codigo = "sin_conexion";
      throw e;
    }
  }

  return {
    async subir(ruta, tipo, blob){
      const r = await pedir(ruta, { method: "PUT", headers: { "Content-Type": tipo }, body: blob });
      if(!r.ok) throw new Error(await mensajeDe(r, "No se pudo subir el archivo. Intente de nuevo."));
    },
    async bajar(ruta){
      const r = await pedir(ruta);
      if(!r.ok) throw new Error(await mensajeDe(r, "No se pudo abrir el archivo."));
      return r.blob();
    },
  };
}
