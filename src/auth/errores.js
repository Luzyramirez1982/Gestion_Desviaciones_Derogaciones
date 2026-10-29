// Traduce los errores del servicio de ingreso a mensajes claros para la clienta.
export function traducirErrorAuth(err){
  const m = String((err && err.message) || err || "");
  if(/invalid login credentials|invalid email or password/i.test(m)) return "Correo o contraseña incorrectos.";
  if(/email not confirmed/i.test(m)) return "Debe confirmar su correo antes de ingresar. Hable con el Administrador.";
  if(/already registered|already exists|user_already_exists/i.test(m)) return "Ya existe una cuenta de acceso con ese correo.";
  if(/password should be at least|weak password|password_too_short|too short/i.test(m)) return "La contraseña es muy débil: use al menos 8 caracteres con letras y números.";
  if(/rate limit|too many/i.test(m)) return "Demasiados intentos seguidos. Espere unos minutos y vuelva a intentarlo.";
  if(/invalid password|incorrect password|current password/i.test(m)) return "La contraseña actual no coincide. Ingrese de nuevo con su contraseña temporal.";
  if(/same as the old|different from the old/i.test(m)) return "La nueva contraseña debe ser diferente de la anterior.";
  if(/failed to fetch|network/i.test(m)) return "No hay conexión con el servidor. Revise su internet y vuelva a intentarlo.";
  return m || "Ocurrió un error inesperado.";
}
