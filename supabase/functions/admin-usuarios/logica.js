// Reglas de la función "admin-usuarios" (crear, restablecer, desactivar y activar personas).
// Está separada de index.ts para poder probarla sin Supabase.

export const ROLES = ["Administrador", "Responsable del proceso", "Aprobador autorizado"];
const ACCIONES = ["crear", "restablecer", "desactivar", "activar"];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Revisa lo que llega desde la aplicación. Devuelve { ok: true, datos } o { ok: false, error }.
export function validarSolicitud(cuerpo){
  if(!cuerpo || typeof cuerpo !== "object") return { ok: false, error: "La solicitud está vacía." };
  const accion = cuerpo.accion;
  if(!ACCIONES.includes(accion)) return { ok: false, error: "La acción no es válida." };

  if(accion === "crear"){
    const nombre = String(cuerpo.nombre || "").trim();
    const correo = String(cuerpo.correo || "").trim().toLowerCase();
    const area = String(cuerpo.area || "").trim();
    if(nombre.length < 3) return { ok: false, error: "Escriba el nombre completo." };
    if(!CORREO.test(correo)) return { ok: false, error: "El correo no es válido." };
    if(!ROLES.includes(cuerpo.rol)) return { ok: false, error: "El rol no es válido." };
    return { ok: true, datos: { accion, nombre: nombre.slice(0, 120), correo, rol: cuerpo.rol, area: area.slice(0, 120) } };
  }

  if(!UUID.test(String(cuerpo.id || ""))) return { ok: false, error: "No se indicó a qué persona se refiere." };
  return { ok: true, datos: { accion, id: String(cuerpo.id).toLowerCase() } };
}

// Contraseña temporal: 10 caracteres con mayúsculas, minúsculas, números y un símbolo.
// Sin letras que se confunden (I, l, O, 0, 1). "azar(n)" devuelve un número de 0 a n-1.
export function generarClaveTemporal(azar){
  const grupos = ["ABCDEFGHJKLMNPQRSTUVWXYZ", "abcdefghijkmnpqrstuvwxyz", "23456789", "#$%*+?"];
  const plan = [0, 0, 1, 1, 1, 2, 2, 2, 3, 1];
  const letras = plan.map(i => grupos[i][azar(grupos[i].length)]);
  // se mezclan para que el símbolo y los números no queden siempre en la misma posición
  for(let i = letras.length - 1; i > 0; i--){ const j = azar(i + 1); [letras[i], letras[j]] = [letras[j], letras[i]]; }
  return letras.join("");
}

// ¿Quién puede hacer qué? Solo un Administrador activo, y nadie puede desactivarse a sí mismo.
export function permitido(quien, datos){
  if(!quien || quien.rol !== "Administrador" || !quien.activo) return { ok: false, error: "Solo un Administrador puede hacer esto." };
  if(datos.accion === "desactivar" && datos.id === quien.id) return { ok: false, error: "No puede desactivar su propia cuenta." };
  return { ok: true };
}
