// Abrir y cerrar el registro, y mantenerlo guardado solo. No sabe dibujar la pantalla (eso es
// plantilla.js y montar.js): así este archivo no depende de ellos ni al revés.
import { esc } from "../../util/html.js";
import { crearGuardador, textoEstado } from "../../util/guardador.js";

export async function abrir(ctx, id){
  if(ctx.abierto && ctx.abierto.id === id) return;
  if(ctx.abierto) await cerrar(ctx, {sinRuta: true});
  try {
    const rec = await ctx.repo.cargarRegistro(id);
    const abierto = {id, rec, guardador: null};
    abierto.guardador = crearGuardador({
      guardar: async () => { const nuevo = await ctx.repo.guardarRegistro(abierto.rec.id, abierto.rec.version, abierto.rec); abierto.rec.version = nuevo.version; },
      alEstado: (estado, msg) => pintarEstado(ctx, estado, msg),
    });
    ctx.pendientes.add(abierto.guardador);
    ctx.abierto = abierto;
  } catch(e){ ctx.error(e); ctx.abierto = null; location.hash = "#/registros"; }
}

export async function cerrar(ctx, { sinRuta = false } = {}){
  const a = ctx.abierto;
  if(!a) return;
  await a.guardador.ahora();
  ctx.pendientes.delete(a.guardador);
  ctx.abierto = null;
  if(!sinRuta){ await ctx.recargar().catch(() => {}); ctx.ir("registros"); }
}

export function pintarEstado(ctx, estado, msg){
  const caja = ctx.raiz.querySelector("#estadoGuardado");
  if(!caja) return;
  caja.className = "estado-guardado " + estado;
  caja.innerHTML = esc(textoEstado(estado)) + (estado === "error" ? ` <button type="button" data-reintentar title="${esc(msg)}">Reintentar</button>` : "")
    + (estado === "conflicto" ? ` <button type="button" data-recargar-registro>Recargar registro</button>` : "");
  caja.title = msg || "";
  const aviso = ctx.raiz.querySelector("#avisoConflicto");
  if(aviso) aviso.style.display = estado === "conflicto" ? "flex" : "none";
}
