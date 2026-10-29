// Función de servidor «archivos»: sube y entrega los archivos del bucket de Neon (adjuntos y firmas).
//
// Por qué existe: las claves del bucket son secretas y no pueden ir en el navegador. Esta función las guarda,
// recibe la sesión de la persona y le pregunta a la BASE DE DATOS si tiene permiso (las reglas siguen viviendo
// en db/migraciones/). Solo si la base dice que sí, sube o entrega el archivo.
//
// Aquí no hay conexión directa al bucket ni a la base: todo entra por `dependencias`, así se prueba sin internet.
//   dependencias.dataApiUrl  dirección de la Data API de Neon (donde la base responde con la sesión de quien pregunta)
//   dependencias.almacen     { poner(ruta, bytes, tipo), leer(ruta) -> {bytes, tipo} | null, borrar(ruta) }
//   dependencias.origenes    páginas desde las que se permite llamar (lista de direcciones)
//   dependencias.esperaMs    pausa entre reintentos cuando la base no reconoce la sesión (ver `preguntar`)

const MAX_BYTES = 5 * 1048576;
// Lo que la base contesta cuando no reconoce a la persona. En las primeras consultas de una sesión Neon a veces
// responde esto (o «false» al leer) aunque la persona sí tenga permiso, así que antes de negar se vuelve a preguntar.
const SIN_PERFIL = "No tiene permiso para subir archivos.";
const REINTENTOS = 2;
const RUTA_VALIDA = /^(registros|firmas)\/[A-Za-z0-9_-]+\/[A-Za-z0-9._() -]+$/;

export function crearManejador({ dataApiUrl, almacen, origenes = [], esperaMs = 400 }){
  const permitidos = new Set(origenes);

  function cabeceras(request, extra = {}){
    const origen = request.headers.get("origin");
    const h = { "Vary": "Origin", "X-Content-Type-Options": "nosniff", ...extra };
    if(origen && permitidos.has(origen)){
      h["Access-Control-Allow-Origin"] = origen;
      h["Access-Control-Allow-Headers"] = "Authorization, Content-Type";
      h["Access-Control-Allow-Methods"] = "GET, PUT, OPTIONS";
      h["Access-Control-Max-Age"] = "600";
    }
    return h;
  }
  const respuesta = (request, estado, cuerpo, extra) => new Response(cuerpo, { status: estado, headers: cabeceras(request, extra) });
  const error = (request, estado, mensaje) =>
    respuesta(request, estado, JSON.stringify({ error: mensaje }), { "Content-Type": "application/json" });

  const pausa = () => new Promise(r => setTimeout(r, esperaMs));

  // Le pregunta a la base con la sesión de la persona. Si la base la rechaza, no se hace nada.
  async function preguntar(token, funcion, args){
    for(let intento = 0; ; intento++){
      const r = await preguntarUnaVez(token, funcion, args);
      const dudoso = !r.ok ? (r.estado === 403 && r.mensaje === SIN_PERFIL) : (funcion === "puede_leer_archivo" && r.valor !== true);
      if(!dudoso || intento === REINTENTOS) return r;
      await pausa();
    }
  }

  async function preguntarUnaVez(token, funcion, args){
    let r;
    try {
      r = await fetch(`${dataApiUrl}/rpc/${funcion}`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(args),
      });
    } catch { return { ok: false, estado: 502, mensaje: "No se pudo consultar la base de datos. Intente de nuevo." }; }
    const texto = await r.text();
    let json = null;
    try { json = texto ? JSON.parse(texto) : null; } catch { /* respuesta que no es JSON */ }
    if(r.ok) return { ok: true, valor: json };
    if(r.status === 401 || r.status === 403 || /jwt|token|authentication/i.test(String(json && json.message))){
      return { ok: false, estado: 401, mensaje: "Su sesión no es válida. Ingrese de nuevo." };
    }
    // Un RAISE de la base (por ejemplo «No puede adjuntar archivos a este registro.») llega como 400 con su mensaje.
    if(r.status === 400 && json && json.message) return { ok: false, estado: 403, mensaje: json.message };
    return { ok: false, estado: 502, mensaje: "La base de datos no pudo revisar el permiso. Intente de nuevo." };
  }

  async function subir(request, token, url){
    const ruta = url.searchParams.get("ruta") || "";
    const tipo = (request.headers.get("content-type") || "").split(";")[0].trim();
    if(!RUTA_VALIDA.test(ruta) || ruta.includes("..")) return error(request, 400, "La ruta del archivo no es válida.");
    const largo = Number(request.headers.get("content-length"));
    if(largo > MAX_BYTES) return error(request, 413, "Cada archivo puede pesar hasta 5 MB.");

    const bytes = new Uint8Array(await request.arrayBuffer());
    if(bytes.length === 0 || bytes.length > MAX_BYTES) return error(request, 413, "Cada archivo puede pesar hasta 5 MB.");

    const args = { p_ruta: ruta, p_tipo: tipo, p_tamano: bytes.length };
    const permiso = await preguntar(token, "puede_subir_archivo", args);
    if(!permiso.ok) return error(request, permiso.estado, permiso.mensaje);

    try { await almacen.poner(ruta, bytes, tipo); }
    catch { return error(request, 502, "No se pudo guardar el archivo. Intente de nuevo."); }

    // Se anota en la base; si eso falla, se quita el archivo para no dejar uno huérfano.
    const anotado = await preguntar(token, "registrar_archivo", args);
    if(!anotado.ok){
      await almacen.borrar(ruta).catch(() => {});
      return error(request, anotado.estado, anotado.mensaje);
    }
    return respuesta(request, 201, JSON.stringify({ ruta, tamano: bytes.length }), { "Content-Type": "application/json" });
  }

  async function entregar(request, token, url){
    const ruta = url.searchParams.get("ruta") || "";
    if(!RUTA_VALIDA.test(ruta) || ruta.includes("..")) return error(request, 400, "La ruta del archivo no es válida.");
    const permiso = await preguntar(token, "puede_leer_archivo", { p_ruta: ruta });
    if(!permiso.ok) return error(request, permiso.estado, permiso.mensaje);
    // Sin permiso y sin archivo se responde igual: así no se revela qué archivos existen.
    if(permiso.valor !== true) return error(request, 404, "No se encontró el archivo.");

    let archivo;
    try { archivo = await almacen.leer(ruta); }
    catch { return error(request, 502, "No se pudo leer el archivo. Intente de nuevo."); }
    if(!archivo) return error(request, 404, "No se encontró el archivo.");
    return respuesta(request, 200, archivo.bytes, {
      "Content-Type": archivo.tipo || "application/octet-stream",
      "Cache-Control": "private, no-store",
      "Content-Disposition": "attachment",
    });
  }

  return async function manejar(request){
    if(request.method === "OPTIONS") return respuesta(request, 204, null);
    const url = new URL(request.url);
    if(url.pathname !== "/archivo") return error(request, 404, "No existe.");

    const auth = request.headers.get("authorization") || "";
    const token = /^bearer\s+(.+)$/i.exec(auth)?.[1];
    if(!token) return error(request, 401, "Falta iniciar sesión.");

    if(request.method === "PUT") return subir(request, token, url);
    if(request.method === "GET") return entregar(request, token, url);
    return error(request, 405, "Método no permitido.");
  };
}
