// Conecta los botones y campos del detalle ya dibujado: delega en acciones.js (qué pasa al
// pulsar cada uno) y usa ciclo.js para cerrar el panel y pintar el estado de guardado.
import { esc } from "../../util/html.js";
import { FIRMA_SLOTS } from "../../dominio/constantes.js";
import { isClosed, esDueno, requisitosFirma } from "../../dominio/registro.js";
import { icon } from "../../componentes/iconos.js";
import { confirmar, pedirTexto } from "../../componentes/dialogos.js";
import { enlazarD8 } from "../../componentes/editor8d.js";
import { montarFirma } from "../../componentes/firma.js";
import { prepararArchivos } from "../../componentes/adjuntos.js";
import { abrirInstructivo8D } from "../ayuda/ventana8d.js";
import { cerrar, pintarEstado } from "./ciclo.js";
import { html, estado8D } from "./plantilla.js";
import { urlDeFirma, abrirArchivo } from "./archivos.js";
import * as acciones from "./acciones.js";

// Redibuja el panel sin perder el lugar en el que se estaba leyendo (se usa también desde la
// actualización en vivo, en nucleo/envivo.js).
export function repintar(ctx){
  const capa = ctx.raiz.querySelector("#capaDetalle");
  if(!capa) return ctx.render();
  const arriba = capa.querySelector(".panel-body")?.scrollTop || 0;
  capa.innerHTML = html(ctx);
  montar(ctx, capa);
  const cuerpo = capa.querySelector(".panel-body");
  if(cuerpo) cuerpo.scrollTop = arriba;
}

// Vuelve a leer el registro abierto (por ejemplo, tras el aviso de que otra persona lo cambió).
async function recargarAbierto(ctx){
  const a = ctx.abierto;
  if(!a) return;
  a.rec = await ctx.repo.cargarRegistro(a.id);
  a.guardador.reiniciar();
  repintar(ctx);
}

export function montar(ctx, el){
  const a = ctx.abierto, rec = a.rec, g = a.guardador;
  const $ = (s) => el.querySelector(s);
  pintarEstado(ctx, g.estado, g.mensaje);

  $("#cerrarPanel").addEventListener("click", () => cerrar(ctx));
  $("#panelOverlay").addEventListener("click", e => { if(e.target.id === "panelOverlay") cerrar(ctx); });
  el.addEventListener("click", async e => {
    if(e.target.closest("[data-reintentar]")) g.reintentar();
    if(e.target.closest("[data-recargar-registro]")){ try { await recargarAbierto(ctx); } catch(err){ ctx.error(err); } }
    const abrirBtn = e.target.closest("[data-abrir-archivo]");
    if(abrirBtn){ e.preventDefault(); try { await abrirArchivo(ctx, abrirBtn.dataset.abrirArchivo); } catch(err){ ctx.error(err); } }
  });

  // Campos de cada rol: se guardan solos.
  el.querySelectorAll("[data-campo]").forEach(c => c.addEventListener(c.tagName === "SELECT" ? "change" : "input", () => {
    rec[c.dataset.campo] = c.value; g.marcar(); actualizarFaltantes(el, rec, ctx);
  }));
  if(rec.tipoGestion === "Derogación"){
    rec.d8 = rec.d8 || {};
    const puede8D = !isClosed(rec) && !rec.borrador && rec.stage === 1 && (["Aprobador autorizado", "Administrador"].includes(ctx.yo.rol) || esDueno(ctx.yo, rec));
    enlazarD8($("#d8-section"), rec.d8, {
      personas: ctx.base.perfiles, deshabilitado: !puede8D,
      alCambiar: () => { g.marcar(); $("#estado8D").innerHTML = estado8D(rec); actualizarFaltantes(el, rec, ctx); },
    });
    $("#btnInstructivo8D").addEventListener("click", abrirInstructivo8D);
  }
  actualizarFaltantes(el, rec, ctx);

  // Imágenes de las firmas: se piden con enlace temporal y solo se muestran si el enlace es seguro.
  el.querySelectorAll("[data-firma-ruta]").forEach(async img => {
    const url = await urlDeFirma(ctx, img.dataset.firmaRuta);
    if(url) img.src = url;
  });

  const comentario = () => ($("#comentarioEtapa") ? $("#comentarioEtapa").value.trim() : "");

  const firmarBtn = $("#btnFirmar");
  if(firmarBtn){
    const firma = montarFirma($("#firmaCanvas"));
    $("#btnLimpiarFirma").addEventListener("click", () => firma.limpiar());
    firmarBtn.addEventListener("click", () => {
      if(!firma.hayFirma()) return ctx.error(new Error("Dibuje su firma en el recuadro antes de firmar."));
      acciones.firmar(ctx, a, firmarBtn.dataset.slot, firma.imagen(), comentario());
    });
  }
  const quitar = $("#btnQuitarFirma");
  if(quitar) quitar.addEventListener("click", () => acciones.quitarFirma(ctx, a));

  const motivo = async (titulo, mensaje, minimo = 3) => {
    const escrito = comentario();
    if(escrito.length >= minimo) return escrito;
    return pedirTexto(titulo, mensaje, {placeholder: "Escriba el motivo…", minimo, error: "Escriba el motivo."}, {aceptar: "Continuar"});
  };
  $("#btnDevolver")?.addEventListener("click", async () => {
    const m = await motivo("Devolver al Responsable del proceso", "Escriba el motivo para que pueda corregir la solicitud.");
    if(m) acciones.devolver(ctx, a, m);
  });
  $("#btnRechazar")?.addEventListener("click", async () => {
    const m = await motivo("Rechazar solicitud", "Escriba el motivo. Al rechazarla, la solicitud queda cerrada.");
    if(m && await confirmar("¿Rechazar la solicitud?", "Esta acción cierra la solicitud como Rechazada y no se puede deshacer.", {aceptar: "Rechazar", peligro: true}))
      acciones.rechazar(ctx, a, m);
  });
  $("#btnRetroceder")?.addEventListener("click", async () => {
    if(await confirmar("Volver a Evaluación y Aprobación", "Se anulan las firmas de aprobación y de cierre para volver a aprobarlas. Quedará registrado en la bitácora.", {aceptar: "Retroceder"}))
      acciones.retroceder(ctx, a, comentario());
  });
  $("#btnConvertir")?.addEventListener("click", async () => {
    if(await confirmar("Convertir en derogación", "La desviación pasa a ser derogación y se activa el reporte 8D, que debe quedar completo antes de aprobar.", {aceptar: "Convertir"}))
      acciones.convertir(ctx, a);
  });
  $("#btnEliminar")?.addEventListener("click", async () => {
    const m = await pedirTexto("Eliminar registro", `Se eliminará ${rec.id}. Queda una huella (quién, cuándo y por qué) y se puede restaurar desde «Registros eliminados».`,
      {placeholder: "Motivo de la eliminación (mínimo 5 letras)", minimo: 5, error: "Escriba el motivo de la eliminación."}, {aceptar: "Eliminar", peligro: true});
    if(m) acciones.eliminar(ctx, a, m);
  });
  $("#btnPdf")?.addEventListener("click", async () => {
    try { const { descargarPDF } = await import("../../exportar/descargas.js"); await descargarPDF(ctx, rec); } catch(err){ ctx.error(err); }
  });
  el.querySelector("[data-corregir]")?.addEventListener("click", async () => { await cerrar(ctx, {sinRuta: true}); ctx.formulario = null; ctx.ir("nuevo/" + rec.id); });

  // Alcance de la derogación
  if($("#btnAlcance")){
    el.querySelectorAll('[name="alcEdit"]').forEach(r => r.addEventListener("change", () => {
      const def = el.querySelector('[name="alcEdit"]:checked').value === "Definitiva";
      $("#alcFinCaja").style.display = def ? "none" : ""; $("#lblAlcIni").textContent = def ? "Efectiva desde" : "Desde";
    }));
    $("#btnAlcance").addEventListener("click", () => {
      const alcance = el.querySelector('[name="alcEdit"]:checked').value;
      acciones.ajustarAlcance(ctx, a, alcance, $("#alcIni").value, alcance === "Definitiva" ? "" : $("#alcFin").value);
    });
  }

  // Adjuntos
  $("#btnAdjuntar")?.addEventListener("click", async () => {
    const entrada = $("#archivosNuevos");
    if(!entrada.files.length) return ctx.error(new Error("Elija uno o más archivos primero."));
    const { validos, avisos } = await prepararArchivos(entrada.files, {yaHay: rec.adjuntos.length});
    avisos.forEach(m => ctx.error(new Error(m)));
    if(!validos.length) return;
    $("#btnAdjuntar").disabled = true;
    acciones.adjuntar(ctx, a, validos);
  });
}

// Muestra qué falta para poder firmar, mientras la persona va escribiendo.
function actualizarFaltantes(el, rec, ctx){
  const caja = el.querySelector("#faltantesFirma");
  if(!caja) return;
  const slot = FIRMA_SLOTS.find(s => s.key === caja.dataset.slot);
  const falta = slot ? requisitosFirma(rec, slot) : [];
  caja.innerHTML = falta.length ? `<div class="banner banner-amber" style="margin-bottom:8px;">${icon("alert")} <span>Antes de firmar complete: ${falta.map(esc).join("; ")}.</span></div>` : "";
}
