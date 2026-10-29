// Reglas para achicar las fotos antes de subirlas (así el espacio gratis dura mucho más).
export const MAX_LADO_PX = 1600;
export const CALIDAD = 0.8;

// Tamaño final de la foto: el lado más largo queda en 1600 px como máximo, sin deformarla ni agrandarla.
export function dimensionesMaximas(ancho, alto, max = MAX_LADO_PX){
  const mayor = Math.max(ancho, alto);
  if(!mayor || mayor <= max) return {ancho, alto, cambia: false};
  const f = max / mayor;
  return {ancho: Math.max(1, Math.round(ancho * f)), alto: Math.max(1, Math.round(alto * f)), cambia: true};
}

// Solo se comprimen fotos comunes; PDF, Word y Excel se suben tal cual. Los GIF se dejan porque pueden estar animados.
export const esFotoComprimible = (tipo) => /^image\/(jpeg|png|webp)$/i.test(String(tipo || ""));

// La foto comprimida se guarda con el mismo nombre pero con la extensión del formato nuevo.
export function nombreComprimido(nombre, tipo){
  const ext = tipo === "image/webp" ? ".webp" : ".jpg";
  const base = String(nombre || "foto").replace(/\.[^.]+$/, "") || "foto";
  return base + ext;
}

// Separa los archivos válidos de los que se rechazan, con el motivo en lenguaje claro.
export function revisarArchivos(archivos, { maxMB = 5, maxPorCargue = 10, yaHay = 0, maxPorRegistro = 50 } = {}){
  const validos = [], rechazados = [];
  for(const a of archivos){
    if(validos.length >= maxPorCargue) rechazados.push({nombre: a.name, motivo: `Solo se pueden subir ${maxPorCargue} archivos a la vez.`});
    else if(yaHay + validos.length >= maxPorRegistro) rechazados.push({nombre: a.name, motivo: `Un registro admite hasta ${maxPorRegistro} archivos.`});
    else if(!a.size) rechazados.push({nombre: a.name, motivo: "El archivo está vacío."});
    else if(a.size > maxMB * 1048576) rechazados.push({nombre: a.name, motivo: `Pesa más de ${maxMB} MB.`});
    else validos.push(a);
  }
  return {validos, rechazados};
}
