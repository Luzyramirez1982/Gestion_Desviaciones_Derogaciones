export function esc(s){
  return String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}

// Deja pasar solo enlaces seguros: https, y archivos de imagen o PDF.
// Así nadie puede esconder código malicioso dentro de un enlace.
export function urlSegura(url){
  const u = String(url ?? "").trim();
  if(/^(https:\/\/|blob:)/i.test(u)) return u;
  if(/^data:(image\/(png|jpe?g|gif|webp)|application\/pdf|text\/plain);base64,[A-Za-z0-9+/=]*$/i.test(u)) return u;
  return "";
}
