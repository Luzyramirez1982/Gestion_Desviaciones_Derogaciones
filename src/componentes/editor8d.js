// Editor del reporte 8D con las herramientas 5W2H (D2) y 5 Porqués (D4), y las tablas de acciones D3 y D5.
// Trabaja sobre un objeto d8 en memoria: cada cambio en pantalla lo actualiza y avisa con alCambiar().
import { esc } from "../util/html.js";
import { D8_FIELDS, W2H_FIELDS, WHYS_COUNT, WHYS_REQUIRED, ACT_TABLES } from "../dominio/constantes.js";
import { emptyD8, emptyActRow } from "../dominio/d8.js";
import { icon } from "./ui.js";

function tablaAcciones(tipo, filas, { deshabilitado, personas }){
  const cfg = ACT_TABLES[tipo], dis = deshabilitado ? "disabled" : "";
  filas = filas && filas.length ? filas : [emptyActRow(tipo)];
  return `<div class="tool-box">
    <div class="tool-title">${esc(cfg.titulo)} <span class="hint" style="font-weight:400;">— registre una fila por acción</span></div>
    <div class="act-row act-head">${cfg.cols.map(c => `<div>${esc(c.label)}</div>`).join("")}<div></div></div>
    ${filas.map((f, i) => `<div class="act-row">
      ${cfg.cols.map(c => `<div><span class="act-lbl">${esc(c.label)}</span><input type="${c.type || "text"}" ${c.list ? 'list="listaPersonas"' : ""} placeholder="${esc(c.ph || "")}" value="${esc(f[c.key] || "")}" data-act="${tipo}|${i}|${c.key}" ${dis}></div>`).join("")}
      <div>${!deshabilitado && filas.length > 1 ? `<button type="button" class="btn btn-danger-outline btn-sm" data-quitar-fila="${tipo}|${i}" title="Quitar fila">${icon("x")}</button>` : ""}</div>
    </div>`).join("")}
    ${!deshabilitado ? `<button type="button" class="btn btn-outline btn-sm" data-agregar-fila="${tipo}">${icon("plus")} Agregar ${tipo === "d3" ? "acción de contención" : "acción correctiva"}</button>` : ""}
    <datalist id="listaPersonas">${(personas || []).map(p => `<option value="${esc(p.nombre)}">`).join("")}</datalist>
  </div>`;
}

export function d8HTML(d8, { deshabilitado = false, personas = [] } = {}){
  d8 = d8 || emptyD8();
  const dis = deshabilitado ? "disabled" : "";
  return D8_FIELDS.map(f => {
    if(f.key === "d2") return `<div class="d8-field"><label>${esc(f.label)}</label>
      <div class="tool-box"><div class="tool-title">Herramienta 5W2H</div>
        ${W2H_FIELDS.map(w => `<div class="tool-row"><div class="tool-q"><b>${esc(w.label)}</b><span>${esc(w.pregunta)}</span></div>
          <textarea data-w2h="${w.key}" rows="1" ${dis}>${esc(d8.w2h ? d8.w2h[w.key] : "")}</textarea></div>`).join("")}
      </div>
      <textarea data-d8="d2" rows="2" placeholder="${esc(f.hint)}" ${dis}>${esc(d8.d2)}</textarea></div>`;
    if(f.key === "d4"){
      const porques = d8.whys || [];
      return `<div class="d8-field"><label>${esc(f.label)}</label>
        <div class="tool-box"><div class="tool-title">Herramienta 5 Porqués <span class="hint" style="font-weight:400;">— pregunte "¿por qué?" sobre la respuesta anterior hasta llegar a la causa raíz (mínimo ${WHYS_REQUIRED}).</span></div>
          ${Array.from({length: WHYS_COUNT}, (_, i) => `<div class="tool-row"><div class="tool-q"><b>¿Por qué? ${i + 1}</b><span>${i < WHYS_REQUIRED ? "Obligatorio" : "Si aplica"}</span></div>
            <textarea data-why="${i}" rows="1" ${dis}>${esc(porques[i] || "")}</textarea></div>`).join("")}
        </div>
        <textarea data-d8="d4" rows="2" placeholder="${esc(f.hint)}" ${dis}>${esc(d8.d4)}</textarea></div>`;
    }
    if(f.key === "d3" || f.key === "d5") return `<div class="d8-field"><label>${esc(f.label)}</label>
      <div data-caja-acciones="${f.key}">${tablaAcciones(f.key, d8[ACT_TABLES[f.key].prop], {deshabilitado, personas})}</div>
      <textarea data-d8="${f.key}" rows="1" placeholder="${esc(f.hint)}" ${dis}>${esc(d8[f.key])}</textarea></div>`;
    return `<div class="d8-field"><label>${esc(f.label)}</label>
      <textarea data-d8="${f.key}" rows="2" placeholder="${esc(f.hint)}" ${dis}>${esc(d8[f.key])}</textarea></div>`;
  }).join("");
}

// Conecta el editor con el objeto d8: lo que se escribe queda en el objeto y se avisa a quien guarda.
export function enlazarD8(contenedor, d8, { alCambiar = () => {}, personas = [], deshabilitado = false } = {}){
  d8.w2h = d8.w2h || {}; d8.whys = d8.whys || ["", "", "", "", ""];
  contenedor.addEventListener("input", e => {
    const t = e.target;
    if(t.dataset.d8) d8[t.dataset.d8] = t.value;
    else if(t.dataset.w2h) d8.w2h[t.dataset.w2h] = t.value;
    else if(t.dataset.why !== undefined) d8.whys[Number(t.dataset.why)] = t.value;
    else if(t.dataset.act){
      const [tipo, i, clave] = t.dataset.act.split("|");
      const prop = ACT_TABLES[tipo].prop;
      d8[prop] = d8[prop] && d8[prop].length ? d8[prop] : [emptyActRow(tipo)];
      d8[prop][Number(i)][clave] = t.value;
    } else return;
    alCambiar();
  });
  const repintar = (tipo) => {
    const caja = contenedor.querySelector(`[data-caja-acciones="${tipo}"]`);
    caja.innerHTML = tablaAcciones(tipo, d8[ACT_TABLES[tipo].prop], {deshabilitado, personas});
  };
  contenedor.addEventListener("click", e => {
    const agregar = e.target.closest("[data-agregar-fila]"), quitar = e.target.closest("[data-quitar-fila]");
    if(agregar){
      const tipo = agregar.dataset.agregarFila, prop = ACT_TABLES[tipo].prop;
      d8[prop] = [...(d8[prop] && d8[prop].length ? d8[prop] : [emptyActRow(tipo)]), emptyActRow(tipo)];
      repintar(tipo); alCambiar();
    } else if(quitar){
      const [tipo, i] = quitar.dataset.quitarFila.split("|"), prop = ACT_TABLES[tipo].prop;
      d8[prop] = d8[prop].filter((_, k) => k !== Number(i));
      repintar(tipo); alCambiar();
    }
  });
}
