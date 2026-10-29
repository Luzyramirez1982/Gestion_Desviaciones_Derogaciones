// Recuadro para dibujar la firma con el mouse o el dedo.
// Devuelve funciones para pedir la imagen (PNG en base64) y para limpiar el recuadro.
export function montarFirma(canvas, alCambiar = () => {}){
  const c = canvas.getContext && canvas.getContext("2d");
  let dibujando = false, hayTrazo = false;
  if(c){ c.strokeStyle = "#1e293b"; c.lineWidth = 2.2; c.lineCap = "round"; c.lineJoin = "round"; }

  function pos(e){
    const r = canvas.getBoundingClientRect();
    const px = e.touches ? e.touches[0].clientX : e.clientX, py = e.touches ? e.touches[0].clientY : e.clientY;
    return {x: (px - r.left) * (canvas.width / (r.width || canvas.width)), y: (py - r.top) * (canvas.height / (r.height || canvas.height))};
  }
  const empezar = (e) => { dibujando = true; hayTrazo = true; const p = pos(e); c?.beginPath(); c?.moveTo(p.x, p.y); e.preventDefault(); };
  const mover = (e) => { if(!dibujando) return; const p = pos(e); c?.lineTo(p.x, p.y); c?.stroke(); e.preventDefault(); };
  const terminar = () => { if(!dibujando) return; dibujando = false; alCambiar(hayTrazo); };

  canvas.addEventListener("mousedown", empezar);
  canvas.addEventListener("mousemove", mover);
  window.addEventListener("mouseup", terminar);
  canvas.addEventListener("touchstart", empezar, {passive: false});
  canvas.addEventListener("touchmove", mover, {passive: false});
  canvas.addEventListener("touchend", terminar);

  return {
    imagen: () => (hayTrazo ? canvas.toDataURL("image/png") : ""),
    limpiar(){ if(c) c.clearRect(0, 0, canvas.width, canvas.height); hayTrazo = false; alCambiar(false); },
    // Para pruebas y para quien no puede dibujar con el puntero: marca el recuadro como firmado.
    hayFirma: () => hayTrazo,
  };
}
