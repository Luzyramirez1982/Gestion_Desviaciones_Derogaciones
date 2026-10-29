// Descargas: PDF de trazabilidad y Excel histórico. Las librerías pesadas se cargan solo al usarlas.
import { isClosed } from "../src/dominio/registro.js";
import { nowStamp, todayISO } from "../src/util/fechas.js";
import { hojasHistorico } from "../src/exportar/excel.js";
import { armarPDF } from "../src/exportar/pdf.js";
import { urlSegura } from "../src/util/html.js";

async function comoDataUrl(url){
  const r = await fetch(url);
  if(!r.ok) throw new Error("No se pudo leer la imagen de la firma.");
  const blob = await r.blob();
  return new Promise((ok, mal) => { const fr = new FileReader(); fr.onload = () => ok(fr.result); fr.onerror = mal; fr.readAsDataURL(blob); });
}

export async function descargarPDF(ctx, rec){
  if(!rec || !isClosed(rec)) throw new Error("El PDF de trazabilidad se habilita cuando el registro finaliza todas sus etapas (Cierre).");
  const [{ jsPDF }, { autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  // Las firmas viven en el almacenamiento privado: se piden con enlace temporal y se incrustan en el PDF.
  const firmas = {};
  await Promise.all(Object.entries(rec.firmas).map(async ([espacio, f]) => {
    if(!f.ruta) return;
    try { const url = urlSegura(await ctx.repo.urlArchivo(f.ruta)); if(url) firmas[espacio] = url.startsWith("data:") ? url : await comoDataUrl(url); } catch { /* se deja sin imagen */ }
  }));
  const doc = armarPDF({jsPDF, autoTable}, rec, {firmas, usuario: ctx.yo, generado: nowStamp()});
  doc.save("Trazabilidad_" + rec.id + ".pdf");
}

export async function descargarExcel(ctx){
  const hojas = hojasHistorico({registros: ctx.registros, eliminados: ctx.eliminados, esAdmin: ctx.esAdmin()});
  if(!ctx.registros.some(r => !r.borrador || r.devuelta)) throw new Error("No hay registros para descargar.");
  const { default: escribirExcel } = await import("write-excel-file/browser");
  await escribirExcel(hojas).toFile("Historico_Desviaciones_MATEC_" + todayISO(0) + ".xlsx");
}
