// Conecta los botones y campos del formulario ya dibujado: delega en clasificacion.js (los
// campos que dependen unos de otros) y en acciones.js (guardar, enviar y sus errores).
import { icon } from "../../componentes/iconos.js";
import { montarFirma } from "../../componentes/firma.js";
import { prepararArchivos } from "../../componentes/adjuntos.js";
import { enlazarD8 } from "../../componentes/editor8d.js";
import { abrirInstructivo8D } from "../ayuda/ventana8d.js";
import { listaPendientes } from "./plantilla.js";
import { rellenar } from "./rellenar.js";
import { enlazarClasificacion } from "./clasificacion.js";
import { guardarBorrador, enviarFormulario, avisoConflicto } from "./acciones.js";

export function montar(ctx, el){
  if(ctx.creado){
    el.querySelector("[data-ir-lista]").addEventListener("click", () => { ctx.creado = null; ctx.ir("registros"); });
    el.querySelector("[data-otra]").addEventListener("click", () => { ctx.creado = null; ctx.formulario = null; ctx.parametro = ""; ctx.ir("nuevo"); });
    return;
  }
  const f = ctx.formulario, form = el.querySelector("#formNuevo");
  const $ = (id) => el.querySelector("#" + id);

  const { sincronizarGestion } = enlazarClasificacion(el, form, ctx);

  // ----- 8D, archivos y firma -----
  enlazarD8(el.querySelector("#d8Fieldset"), f.d8, {personas: ctx.base.perfiles});
  $("btnInstructivo8D").addEventListener("click", abrirInstructivo8D);

  const pintarArchivos = () => { $("listaArchivos").innerHTML = listaPendientes(f); };
  $("inputArchivos").addEventListener("change", async e => {
    const { validos, avisos } = await prepararArchivos(e.target.files, {yaHay: f.archivos.length});
    f.archivos.push(...validos);
    e.target.value = "";
    avisos.forEach(a => ctx.error(new Error(a)));
    pintarArchivos();
  });
  $("listaArchivos").addEventListener("click", e => {
    const q = e.target.closest("[data-quitar-pendiente]");
    if(q){ f.archivos.splice(Number(q.dataset.quitarPendiente), 1); pintarArchivos(); }
  });

  const firma = montarFirma($("firmaCanvas"));
  ctx.firmaFormulario = firma;
  $("btnLimpiarFirma").addEventListener("click", () => firma.limpiar());

  el.querySelectorAll("[data-continuar]").forEach(b => b.addEventListener("click", () => {
    ctx.formulario = null; ctx.ir("nuevo/" + b.dataset.continuar);
  }));
  const nuevoLimpio = el.querySelector("[data-nuevo-limpio]");
  if(nuevoLimpio) nuevoLimpio.addEventListener("click", e => { e.preventDefault(); ctx.formulario = null; ctx.ir("nuevo"); });

  // ----- Rellenar con lo guardado en el borrador -----
  if(f.rec) rellenar(form, f.rec, ctx);
  sincronizarGestion();

  // ----- Guardar y enviar -----
  $("btnBorrador").addEventListener("click", async () => {
    const btn = $("btnBorrador"); btn.disabled = true;
    try {
      await guardarBorrador(ctx, f, form);
      ctx.render();
      window.scrollTo?.(0, 0);
    } catch(e){
      if(e.codigo === "conflicto_version") await avisoConflicto(ctx); else ctx.error(e);
      btn.disabled = false;
    }
  });

  form.addEventListener("submit", async e => {
    e.preventDefault();
    const btn = $("btnEnviar");
    btn.disabled = true; btn.textContent = "Enviando…";
    try {
      await enviarFormulario(ctx, f, form, firma);
      ctx.render();
    } catch(err){
      if(err.codigo === "conflicto_version") await avisoConflicto(ctx); else ctx.error(err);
      btn.disabled = false; btn.innerHTML = `${icon("check")} Firmar y enviar solicitud`;
    }
  });
}
