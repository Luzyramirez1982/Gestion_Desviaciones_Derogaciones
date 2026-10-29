// Aviso flotante breve (éxito o error). Los de error se quedan más tiempo.
export function aviso(texto, tipo = "ok"){
  let caja = document.getElementById("avisos");
  if(!caja){
    caja = document.createElement("div");
    caja.id = "avisos";
    caja.setAttribute("role", "status");
    caja.setAttribute("aria-live", "polite");
    document.body.appendChild(caja);
  }
  const el = document.createElement("div");
  el.className = "aviso aviso-" + tipo;
  el.textContent = texto;
  caja.appendChild(el);
  setTimeout(() => el.remove(), tipo === "error" ? 9000 : 4000);
}
