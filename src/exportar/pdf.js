// PDF de trazabilidad de un registro cerrado. Recibe jsPDF y autoTable desde afuera para poder probarlo sin navegador.
// firmas: { espacio: "data:image/png;base64,..." } con las imágenes de las firmas ya descargadas.
import { FIRMA_SLOTS, W2H_FIELDS } from "../dominio/constantes.js";
import { vigenciaTexto } from "../dominio/registro.js";
import { gtcLabel } from "../dominio/gtc45.js";
import { emptyD8 } from "../dominio/d8.js";

const NAVY = [20, 46, 71], GRAY = [100, 116, 139], M = 40;
const txt = (v) => (v === undefined || v === null || String(v).trim() === "" ? "—" : String(v));
const tam = (b) => (!b ? "—" : b < 1024 ? b + " B" : b < 1048576 ? (b / 1024).toFixed(0) + " KB" : (b / 1048576).toFixed(1) + " MB");

export function armarPDF({ jsPDF, autoTable }, rec, { firmas = {}, usuario, generado }){
  const doc = new jsPDF({unit: "pt", format: "letter"});
  const W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight();
  let y = 0;

  doc.setFillColor(...NAVY); doc.rect(0, 0, W, 80, "F");
  doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(15);
  doc.text("Reporte de trazabilidad — " + rec.id, M, 32);
  doc.setFont("helvetica", "normal"); doc.setFontSize(9.5);
  doc.text("MATEC · Gestión de Desviaciones y Derogaciones", M, 50);
  doc.setFontSize(8.5);
  doc.text("Generado: " + generado + " · por " + usuario.nombre + " (" + usuario.rol + ")", M, 66);
  doc.setTextColor(30, 41, 59);
  y = 100;

  const seccion = (titulo) => {
    if(y > H - 140){ doc.addPage(); y = 50; }
    doc.setFont("helvetica", "bold"); doc.setFontSize(11.5); doc.setTextColor(...NAVY);
    doc.text(titulo, M, y); doc.setDrawColor(226, 232, 240); doc.line(M, y + 4, W - M, y + 4);
    doc.setTextColor(30, 41, 59); y += 10;
  };
  const subtitulo = (t) => { doc.setFont("helvetica", "bold"); doc.setFontSize(9.5); doc.text(t, M, y); y += 6; };
  const claveValor = (filas) => {
    autoTable(doc, {startY: y, margin: {left: M, right: M}, theme: "grid", body: filas.map(f => [f[0], txt(f[1])]),
      styles: {fontSize: 8.8, cellPadding: 4, valign: "top", lineColor: [226, 232, 240]},
      columnStyles: {0: {cellWidth: 150, fontStyle: "bold", fillColor: [241, 245, 249], textColor: [71, 85, 105]}}});
    y = doc.lastAutoTable.finalY + 16;
  };
  const tabla = (cabecera, cuerpo, extra) => {
    autoTable(doc, {startY: y, margin: {left: M, right: M}, theme: "striped", head: [cabecera],
      body: cuerpo.length ? cuerpo : [cabecera.map((_, i) => (i === 0 ? "Sin información" : ""))],
      styles: {fontSize: 8.5, cellPadding: 4, valign: "top"}, headStyles: {fillColor: NAVY, textColor: 255, fontStyle: "bold"}, ...(extra || {})});
    y = doc.lastAutoTable.finalY + 16;
  };

  seccion("1. Información del solicitante");
  claveValor([["Consecutivo", rec.id], ["Fecha y hora", (rec.fechaHora || "").replace("T", " ")], ["Nombre y apellido (Responsable del proceso)", rec.reportadoPor],
    ["Cargo", rec.cargo], ["Área (según organigrama)", rec.areaSolicitante], ["Proceso", rec.procesoSolicitante]]);

  seccion("2. Clasificación y proyecto");
  claveValor([["Solicitud dirigida al área de", rec.area], ["Solicitud relacionada con temas de", rec.tema || rec.area],
    ["Tipo específico de Desviación o Derogación", rec.tipoEspecifico],
    ...(rec.condicionSeguridad ? [[gtcLabel(rec.peligroSST || rec.tipoEspecifico), rec.condicionSeguridad]] : []),
    ["OT", rec.ot], ["Nombre del proyecto", rec.proyecto], ["Línea de negocio", rec.lineaNegocio],
    ["Figura", rec.tipoGestion], ["Nivel de criticidad", rec.criticidad], ["Condición recurrente", rec.recurrente ? "Sí" : "No"],
    [rec.tipoGestion === "Derogación" ? "Alcance y vigencia de la derogación" : "Vigencia", vigenciaTexto(rec)],
    ["Resultado", rec.resultado === "Rechazada" ? "Rechazada" : "Cerrada"], ["Fecha de cierre", rec.fechaCierre ? String(rec.fechaCierre).slice(0, 10) : ""]]);

  seccion("3. Descripción de la " + rec.tipoGestion.toLowerCase());
  const desc = [["Requisito incumplido", rec.requisitoIncumplido], ["Equipo / método involucrado", rec.equipoInvolucrado], ["Tarea o requerimiento", rec.tareaDescripcion],
    ["Motivo", rec.motivoDesviacion], ["Consecuencias potenciales", rec.consecuenciasPotenciales]];
  if(rec.relacionadoSST) desc.push(["EPP adicional", rec.eppAdicional], ["Procedimientos alternativos", rec.procedimientosAlternativos], ["Compañero de apoyo", rec.companeroApoyo]);
  claveValor(desc);

  seccion("4. Evaluación y aprobación (Aprobador autorizado)");
  claveValor([["Concepto de evaluación", rec.conceptoEvaluacion], ["Medidas de control", rec.controlesCompensatorios], ["Observaciones de la aprobación", rec.observacionesAprobacion]]);

  let n = 5;
  if(rec.tipoGestion === "Derogación"){
    seccion(n++ + ". Reporte 8D");
    const d8 = rec.d8 || emptyD8();
    claveValor([["D1 · Equipo", d8.d1]]);
    subtitulo("D2 · Descripción del problema — 5W2H");
    tabla(["Pregunta", "Respuesta"], W2H_FIELDS.map(w => [w.label + " — " + w.pregunta, txt(d8.w2h && d8.w2h[w.key])]), {columnStyles: {0: {cellWidth: 170, fontStyle: "bold"}}});
    if(d8.d2) claveValor([["Síntesis del problema", d8.d2]]);
    subtitulo("D3 · Acciones de contención");
    tabla(["Acción de contención", "Punto de control", "Fecha", "Responsable"], (d8.contencion || []).filter(r => r.accion || r.puntoControl).map(r => [txt(r.accion), txt(r.puntoControl), txt(r.fecha), txt(r.responsable)]), {columnStyles: {2: {cellWidth: 62}}});
    if(d8.d3) claveValor([["Observaciones D3", d8.d3]]);
    subtitulo("D4 · Causa raíz — 5 Porqués");
    tabla(["#", "¿Por qué?"], (d8.whys || []).map((w, i) => [String(i + 1), txt(w)]), {columnStyles: {0: {cellWidth: 30}}});
    claveValor([["D4 · Causa raíz identificada", d8.d4]]);
    subtitulo("D5 · Acciones correctivas permanentes");
    tabla(["Causa", "Acción correctiva", "Fecha", "Responsable"], (d8.correctivas || []).filter(r => r.causa || r.accion).map(r => [txt(r.causa), txt(r.accion), txt(r.fecha), txt(r.responsable)]), {columnStyles: {2: {cellWidth: 62}}});
    claveValor([...(d8.d5 ? [["Observaciones D5", d8.d5]] : []), ["D6 · Implementación y validación", d8.d6], ["D7 · Acciones preventivas", d8.d7], ["D8 · Cierre y reconocimiento", d8.d8]]);
  }

  seccion(n++ + ". Cierre (Responsable del proceso)");
  claveValor([["Observaciones de cierre", rec.observacionesCierre], ["Cumplimiento de controles", rec.cumplimientoControl]]);

  seccion(n++ + ". Evidencias adjuntas (" + rec.adjuntos.length + ")");
  tabla(["Archivo", "Tamaño", "Cargado por", "Fecha"], rec.adjuntos.map(a => [a.nombre, tam(a.tamano), txt(a.usuario), txt(String(a.fecha || "").slice(0, 10))]));

  seccion(n++ + ". Firmas de aprobación por etapa");
  tabla(["Etapa / firma", "Rol", "Firmado por", "Fecha", "Firma"],
    FIRMA_SLOTS.map(sl => { const f = rec.firmas[sl.key]; return [sl.label, f && f.rol ? f.rol : sl.rol, f ? f.nombre : "Sin firma", f ? txt(String(f.fecha || "").slice(0, 10)) : "—", ""]; }),
    {columnStyles: {4: {cellWidth: 110, minCellHeight: 34}},
      didDrawCell: (d) => {
        if(d.section !== "body" || d.column.index !== 4) return;
        const imagen = firmas[FIRMA_SLOTS[d.row.index] && FIRMA_SLOTS[d.row.index].key];
        if(imagen && imagen.indexOf("data:image") === 0){
          try { doc.addImage(imagen, "PNG", d.cell.x + 3, d.cell.y + 2, 100, d.cell.height - 4); } catch { /* imagen no válida: se deja el espacio vacío */ }
        }
      }});

  seccion(n++ + ". Bitácora de seguimiento");
  tabla(["Fecha", "Etapa", "Rol", "Usuario", "Comentario"], rec.bitacora.map(b => [txt(b.fecha), txt(b.etapa), txt(b.rol), txt(b.usuario), txt(b.comentario)]),
    {columnStyles: {0: {cellWidth: 62}, 1: {cellWidth: 88}, 2: {cellWidth: 82}, 3: {cellWidth: 90}}});

  const paginas = doc.internal.getNumberOfPages();
  for(let i = 1; i <= paginas; i++){
    doc.setPage(i); doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(...GRAY);
    doc.text(rec.id + " · Trazabilidad completa · MATEC", M, H - 20);
    doc.text("Página " + i + " de " + paginas, W - M, H - 20, {align: "right"});
  }
  return doc;
}
