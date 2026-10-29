// Formulario de nuevo registro: área, tipo específico (con "Otro"), GTC 45 para SST, vigencia, 8D, firma,
// borradores y reenvío de solicitudes devueltas. Dividido en: preparar.js (cargar el borrador),
// plantilla.js (el HTML), clasificacion.js (campos que dependen unos de otros), acciones.js
// (guardar y enviar) y montar.js (conecta todo lo anterior con los botones).
export { preparar } from "./preparar.js";
export { html } from "./plantilla.js";
export { montar } from "./montar.js";
export { datosDelFormulario } from "./datos.js";
