// Formatos de texto para mostrar: tamaños de archivo y fechas.
export function fmtSize(bytes){
  if(!bytes) return "";
  if(bytes < 1024) return bytes + " B";
  if(bytes < 1048576) return (bytes / 1024).toFixed(0) + " KB";
  return (bytes / 1048576).toFixed(1) + " MB";
}

// Fecha y hora de la base (UTC) como la ve la clienta, en hora de Colombia.
export function fmtFecha(iso){
  if(!iso) return "";
  const d = new Date(iso);
  if(isNaN(d)) return String(iso);
  return d.toLocaleString("es-CO", {dateStyle: "medium", timeStyle: "short", timeZone: "America/Bogota"});
}
