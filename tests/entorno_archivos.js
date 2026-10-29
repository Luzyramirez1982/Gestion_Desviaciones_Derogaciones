// Entorno de prueba de los archivos: la función «archivos» de verdad (functions/archivos/manejador.js), con un bucket
// simulado en memoria y la base de prueba (PGlite) respondiendo como lo haría la Data API de Neon:
// según la persona dueña del token. Se instala sobre `fetch` y se quita al terminar.
import { crearManejador } from "../functions/archivos/manejador.js";

export const URL_FUNCION = "https://archivos.test";
export const URL_API = "https://api.test/rest/v1";
export const ORIGEN = "https://app.test";

// `c` es el cliente de prueba (tests/cliente_pglite.js). El token de la persona es "t-<su id>".
export function crearEntornoArchivos(c){
  const bucket = new Map();                                    // ruta -> { bytes, tipo }
  const fallos = { poner: false, registrar: false, sinSesionPrimerasVeces: 0 };   // para simular averías
  const borrados = [];
  const consultas = [];                                        // qué funciones de la base se consultaron

  const almacen = {
    async poner(ruta, bytes, tipo){ if(fallos.poner) throw new Error("bucket caído"); bucket.set(ruta, { bytes, tipo }); },
    async leer(ruta){ const o = bucket.get(ruta); return o ? { bytes: o.bytes, tipo: o.tipo } : null; },
    async borrar(ruta){ borrados.push(ruta); bucket.delete(ruta); },
  };
  const manejar = crearManejador({ dataApiUrl: URL_API, almacen, origenes: [ORIGEN], esperaMs: 0 });
  const fetchReal = globalThis.fetch;

  async function enrutador(entrada, init = {}){
    const url = String(entrada instanceof Request ? entrada.url : entrada);
    if(url.startsWith(URL_API + "/rpc/")){
      const nombre = url.slice((URL_API + "/rpc/").length);
      consultas.push(nombre);
      const m = /^Bearer t-(.+)$/.exec(new Headers(init.headers).get("authorization") || "");
      if(!m) return new Response(JSON.stringify({ message: "JWT invalid" }), { status: 401 });
      if(nombre === "registrar_archivo" && fallos.registrar){
        return new Response(JSON.stringify({ message: "Falla simulada al anotar." }), { status: 400 });
      }
      // Simula que Neon, en las primeras consultas, no reconoce la sesión (la base cree que no hay nadie).
      if(fallos.sinSesionPrimerasVeces > 0){
        fallos.sinSesionPrimerasVeces--;
        if(nombre === "puede_leer_archivo") return new Response("false", { status: 200 });
        return new Response(JSON.stringify({ message: "No tiene permiso para subir archivos." }), { status: 400 });
      }
      const r = await c.llamarRpc(m[1], nombre, JSON.parse(init.body));
      if(r.error){
        const sinPermiso = /permission denied/.test(r.error.message);
        return new Response(JSON.stringify({ message: r.error.message }), { status: sinPermiso ? 403 : 400 });
      }
      return new Response(JSON.stringify(r.data), { status: 200 });
    }
    if(url.startsWith(URL_FUNCION)) return manejar(new Request(url, init));
    return fetchReal(entrada, init);                           // por ejemplo los enlaces blob: del navegador
  }

  return {
    bucket, fallos, borrados, consultas, manejar, token: (uid) => "t-" + uid,
    instalar(){ globalThis.fetch = enrutador; },
    quitar(){ globalThis.fetch = fetchReal; },
  };
}
