// Reglas de la contraseña (las mismas que ya usaba la aplicación en index.html).
// Devuelve el mensaje de error, o vacío si la contraseña es válida.
export function validarClave(p1, p2){
  if(!p1 || p1.length < 8) return "La contraseña debe tener al menos 8 caracteres.";
  if(!/[A-Za-z]/.test(p1) || !/[0-9]/.test(p1)) return "La contraseña debe combinar letras y números.";
  if(p1 !== p2) return "Las dos contraseñas no coinciden.";
  return "";
}
