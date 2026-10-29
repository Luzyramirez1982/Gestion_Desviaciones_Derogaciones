// Detalle de un registro: etapas, firmas con sus requisitos, devolver, rechazar, retroceder,
// convertir en derogación, ajustar alcance, bitácora y adjuntos. Dividido en: ciclo.js (abrir,
// cerrar, estado de guardado), plantilla.js (el HTML), acciones.js (qué pasa al pulsar cada
// botón), archivos.js (enlaces a firmas y adjuntos) y montar.js (conecta todo lo anterior).
export { abrir, cerrar } from "./ciclo.js";
export { html } from "./plantilla.js";
export { montar, repintar } from "./montar.js";
