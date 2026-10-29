// Antes de mostrar el formulario se carga el borrador (si se abrió uno) o se deja en blanco.
import { emptyD8 } from "../../dominio/d8.js";

export async function preparar(ctx){
  const clave = ctx.parametro || "";
  if(ctx.formulario && ctx.formulario.clave === clave) return;
  const f = {clave, rec: null, d8: emptyD8(), archivos: [], aviso: ""};
  if(clave){
    try { f.rec = await ctx.repo.cargarRegistro(clave); if(f.rec.d8) f.d8 = structuredClone(f.rec.d8); }
    catch(e){ ctx.error(e); }
    if(f.rec && !(f.rec.borrador && f.rec.reportadoPorId === ctx.yo.id)){ f.rec = null; }
  }
  ctx.formulario = f;
}
