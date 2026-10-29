// Qué pasa al pulsar cada botón del detalle: guarda lo que se estaba escribiendo, llama al
// repositorio y deja la pantalla al día. Si algo falla por un conflicto de versión, se avisa en
// el indicador de guardado en vez de con un mensaje suelto.
import { pintarEstado } from "./ciclo.js";

// Antes de cualquier acción se guarda lo escrito; si no se pudo, no se sigue.
async function accion(ctx, a, fn, { exito } = {}){
  if(!(await a.guardador.ahora())){ ctx.error(new Error("No se pudo guardar lo que escribió. Revise el aviso de arriba antes de continuar.")); return; }
  try {
    const nuevo = await fn();
    if(nuevo) a.rec = nuevo;
    await ctx.recargar();
    if(exito) ctx.ok(exito);
    ctx.render();
  } catch(err){
    if(err.codigo === "conflicto_version") pintarEstado(ctx, "conflicto", err.message); else ctx.error(err);
  }
}

export const firmar = (ctx, a, slot, imagen, comentario) =>
  accion(ctx, a, () => ctx.repo.firmarEtapa(a.rec.id, slot, imagen, comentario), {exito: "Firma registrada."});

export const quitarFirma = (ctx, a) =>
  accion(ctx, a, () => ctx.repo.quitarFirmaAdmin(a.rec.id), {exito: "Se borró su firma."});

export const devolver = (ctx, a, motivo) =>
  accion(ctx, a, () => ctx.repo.devolverRegistro(a.rec.id, motivo), {exito: "Solicitud devuelta para ajustes."});

export const rechazar = (ctx, a, motivo) =>
  accion(ctx, a, () => ctx.repo.rechazarRegistro(a.rec.id, motivo), {exito: "Solicitud rechazada."});

export const retroceder = (ctx, a, comentario) =>
  accion(ctx, a, () => ctx.repo.retrocederEtapa(a.rec.id, comentario), {exito: "La solicitud volvió a Evaluación y Aprobación."});

export const convertir = (ctx, a) =>
  accion(ctx, a, () => ctx.repo.convertirADerogacion(a.rec.id), {exito: "Convertida en derogación."});

export const ajustarAlcance = (ctx, a, alcance, inicio, fin) =>
  accion(ctx, a, () => ctx.repo.ajustarAlcance(a.rec.id, alcance, inicio, fin), {exito: "Alcance actualizado."});

// Sube los archivos ya validados y recarga el registro para que se vean en la lista de adjuntos.
export function adjuntar(ctx, a, validos){
  return accion(ctx, a, async () => {
    for(const f of validos){ try { await ctx.repo.subirAdjunto(a.rec.id, f); } catch(err){ ctx.error(new Error(`${f.name}: ${err.message}`)); } }
    return ctx.repo.cargarRegistro(a.rec.id);
  }, {exito: "Archivos adjuntados."});
}

// Eliminar no pasa por accion(): no hay nada que guardar y la pantalla se cierra, no se repinta.
export async function eliminar(ctx, a, motivo){
  try {
    await ctx.repo.eliminarRegistro(a.rec.id, motivo);
    a.guardador.reiniciar(); ctx.pendientes.delete(a.guardador); ctx.abierto = null;
    await ctx.recargar(); ctx.ok("Registro eliminado."); ctx.ir("registros");
  } catch(err){ ctx.error(err); }
}
