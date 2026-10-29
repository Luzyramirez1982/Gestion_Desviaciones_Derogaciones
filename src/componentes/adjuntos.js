// Prepara los archivos antes de subirlos: comprime las fotos en el navegador y revisa los límites.
import { MAX_FILE_MB, MAX_FILES_BATCH } from "../dominio/constantes.js";
import { CALIDAD, dimensionesMaximas, esFotoComprimible, nombreComprimido, revisarArchivos } from "../util/imagen.js";

async function comprimir(archivo){
  if(!esFotoComprimible(archivo.type) || typeof createImageBitmap !== "function") return archivo;
  try {
    const bmp = await createImageBitmap(archivo);
    const {ancho, alto, cambia} = dimensionesMaximas(bmp.width, bmp.height);
    // Una foto chica y liviana se deja como está: recomprimirla solo le quitaría calidad.
    if(!cambia && archivo.size < 400 * 1024){ bmp.close?.(); return archivo; }
    const lienzo = document.createElement("canvas");
    lienzo.width = ancho; lienzo.height = alto;
    lienzo.getContext("2d").drawImage(bmp, 0, 0, ancho, alto);
    bmp.close?.();
    const probarWebp = lienzo.toDataURL("image/webp").startsWith("data:image/webp");
    const tipo = probarWebp ? "image/webp" : "image/jpeg";
    const blob = await new Promise(ok => lienzo.toBlob(ok, tipo, CALIDAD));
    if(!blob || blob.size >= archivo.size) return archivo;
    return new File([blob], nombreComprimido(archivo.name, tipo), {type: tipo, lastModified: Date.now()});
  } catch { return archivo; }   // si algo falla se sube la foto original
}

// Devuelve { validos: File[], avisos: string[] } listo para subir.
export async function prepararArchivos(lista, { yaHay = 0 } = {}){
  const comprimidos = await Promise.all(Array.from(lista || []).map(comprimir));
  const { validos, rechazados } = revisarArchivos(comprimidos, {maxMB: MAX_FILE_MB, maxPorCargue: MAX_FILES_BATCH, yaHay});
  return {validos, avisos: rechazados.map(r => `${r.nombre}: ${r.motivo}`)};
}
