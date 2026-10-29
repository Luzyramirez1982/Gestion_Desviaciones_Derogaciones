import { esc } from "../util/html.js";

// Cuadro de diálogo propio (el del navegador se ve distinto en cada equipo). Devuelve una promesa.
function dialogo({ titulo, mensaje = "", campo = null, aceptar = "Aceptar", cancelar = "Cancelar", peligro = false }){
  return new Promise(resolve => {
    const fondo = document.createElement("div");
    fondo.className = "modal-fondo";
    fondo.innerHTML = `<div class="modal" role="dialog" aria-modal="true">
      <h3>${esc(titulo)}</h3>
      ${mensaje ? `<p>${esc(mensaje)}</p>` : ""}
      ${campo ? `<textarea rows="3" placeholder="${esc(campo.placeholder || "")}"></textarea><div class="auth-msg err" style="display:none;margin-top:8px;"></div>` : ""}
      <div class="modal-botones">
        ${cancelar ? `<button type="button" class="btn btn-outline" data-no>${esc(cancelar)}</button>` : ""}
        <button type="button" class="btn ${peligro ? "btn-danger-outline" : "btn-primary"}" data-si>${esc(aceptar)}</button>
      </div></div>`;
    document.body.appendChild(fondo);
    const area = fondo.querySelector("textarea"), err = fondo.querySelector(".auth-msg");
    const cerrar = (v) => { fondo.remove(); resolve(v); };
    fondo.querySelector("[data-no]")?.addEventListener("click", () => cerrar(null));
    fondo.querySelector("[data-si]").addEventListener("click", () => {
      if(!campo) return cerrar(true);
      const t = area.value.trim();
      if(campo.minimo && t.length < campo.minimo){ err.textContent = campo.error || "Escriba el motivo."; err.style.display = "block"; return; }
      cerrar(t);
    });
    fondo.addEventListener("keydown", e => { if(e.key === "Escape") cerrar(null); });
    (area || fondo.querySelector("[data-si]")).focus();
  });
}
export const confirmar = (titulo, mensaje, opciones = {}) => dialogo({titulo, mensaje, ...opciones}).then(r => r === true);
export const pedirTexto = (titulo, mensaje, campo, opciones = {}) => dialogo({titulo, mensaje, campo, ...opciones});
export const informar = (titulo, mensaje) => dialogo({titulo, mensaje, cancelar: ""});
