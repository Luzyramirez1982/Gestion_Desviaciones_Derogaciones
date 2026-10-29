// La dirección pública de la aplicación (la que se comparte con los usuarios).
// Solo cuenta si es una dirección publicada de verdad: nunca un archivo local, localhost ni una red interna.
export function direccionPublicada(ubicacion){
  try {
    const u = new URL(ubicacion);
    if(u.protocol !== "https:") return "";
    const h = u.hostname;
    if(h === "localhost" || h === "127.0.0.1" || h === "[::1]" || /\.(local|internal|test)$/.test(h)) return "";
    if(/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(h)) return "";
    return u.origin + u.pathname.replace(/index\.html$/, "");
  } catch { return ""; }
}

// Para guardar el enlace que escribe la persona: debe ser https.
export function enlaceValido(texto){
  const t = String(texto || "").trim();
  if(!t) return "";
  try { return new URL(t).protocol === "https:" ? t : null; } catch { return null; }
}
