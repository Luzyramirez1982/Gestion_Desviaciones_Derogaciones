// Cuánto espacio gratis se ha usado y cuándo avisar (70 % y 90 %).
export const AVISO_PORCENTAJE = 70, ALERTA_PORCENTAJE = 90;

export function nivelUso(usado, limite){
  const pct = limite > 0 ? Math.min(100, (usado / limite) * 100) : 0;
  const nivel = pct >= ALERTA_PORCENTAJE ? "alerta" : pct >= AVISO_PORCENTAJE ? "aviso" : "normal";
  return {pct, nivel};
}

export function bytesLegibles(n){
  if(n < 1024) return `${n} B`;
  if(n < 1048576) return `${(n / 1024).toFixed(0)} KB`;
  if(n < 1073741824) return `${(n / 1048576).toFixed(1)} MB`;
  return `${(n / 1073741824).toFixed(2)} GB`;
}

// Mensaje para la clienta según el nivel, diciendo qué hacer.
export function mensajeUso(nombre, nivel){
  if(nivel === "alerta") return `${nombre}: casi lleno (más del ${ALERTA_PORCENTAJE} %). Haga un respaldo y avise al equipo técnico ya: cuando se llena, la aplicación deja de guardar.`;
  if(nivel === "aviso") return `${nombre}: ya pasó el ${AVISO_PORCENTAJE} %. Conviene planear cómo liberar espacio (por ejemplo, archivar registros cerrados hace mucho).`;
  return "";
}
