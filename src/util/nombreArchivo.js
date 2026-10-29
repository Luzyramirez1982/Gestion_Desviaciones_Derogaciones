// Deja un nombre de archivo seguro para guardarlo: sin tildes, espacios ni símbolos raros,
// y conservando la extensión (por ejemplo "Informe técnico.pdf" queda "Informe_tecnico.pdf").
export function nombreSeguro(nombre){
  const limpio = String(nombre || "archivo").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9._()-]+/g, "_").replace(/^[._]+/, "").replace(/_+/g, "_");
  const punto = limpio.lastIndexOf(".");
  const base = (punto > 0 ? limpio.slice(0, punto) : limpio).slice(0, 80) || "archivo";
  const ext = punto > 0 ? limpio.slice(punto).slice(0, 12) : "";
  return base + ext;
}
