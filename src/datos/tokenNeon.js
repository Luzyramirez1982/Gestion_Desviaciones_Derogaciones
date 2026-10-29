// Saca de Neon el token de la sesión vigente (lo que la función «archivos» usa para saber quién pregunta).
// Neon lo renueva solo cuando vence. Si no hay sesión, devuelve vacío.
export async function tokenDeSesion(cliente){
  const auth = cliente.auth;
  try {
    const r = await auth.token();
    const token = r && r.data && r.data.token;
    if(token) return token;
  } catch { /* se prueba el otro camino */ }
  const { data } = await auth.getSession();
  const sesion = data && data.session;
  return (sesion && (sesion.access_token || sesion.token)) || "";
}