// Pide al repositorio el enlace temporal de un archivo (firma o adjunto) y lo valida antes de usarlo.
import { urlSegura } from "../../util/html.js";

// Para mostrar la imagen de una firma: si algo falla, simplemente no se muestra (sin alarmar a nadie).
export async function urlDeFirma(ctx, ruta){
  try { return urlSegura(await ctx.repo.urlArchivo(ruta)); } catch { return ""; }
}

// Para abrir un adjunto en una pestaña nueva: aquí sí se avisa si algo falla.
export async function abrirArchivo(ctx, ruta){
  const url = urlSegura(await ctx.repo.urlArchivo(ruta));
  if(!url) throw new Error("No se pudo abrir el archivo.");
  window.open(url, "_blank", "noopener");
}
