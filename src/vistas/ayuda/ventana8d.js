// Instructivo del 8D en una ventana emergente, para no perder lo que se está diligenciando.
import { icon } from "../../componentes/iconos.js";
import { instructivo8DHTML } from "./instructivo8d.js";

export function abrirInstructivo8D(){
  document.getElementById("modalInstructivo8D")?.remove();
  const capa = document.createElement("div");
  capa.id = "modalInstructivo8D";
  capa.className = "panel-overlay";
  capa.style.zIndex = "60";
  capa.innerHTML = `<div class="panel" style="max-width:820px;">
    <div class="panel-head"><div style="font-size:15.5px;font-weight:700;">Instructivo del 8D</div><button class="panel-close" id="cerrarInstructivo" aria-label="Cerrar">${icon("x")}</button></div>
    <div class="panel-body help">${instructivo8DHTML()}</div></div>`;
  document.body.appendChild(capa);
  capa.addEventListener("click", e => { if(e.target === capa) capa.remove(); });
  capa.querySelector("#cerrarInstructivo").addEventListener("click", () => capa.remove());
}
