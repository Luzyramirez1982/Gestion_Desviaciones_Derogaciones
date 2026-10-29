// Actualización en vivo: cuando otra persona cambia un registro, la lista se refresca sola.
// También se refresca al volver a la pestaña, y al volver la conexión se reintentan los guardados con error.
import * as vDetalle from "../vistas/detalle/index.js";

// Estas pantallas no tienen formularios a medio llenar, así que se pueden repintar sin perder lo escrito.
const REPINTABLES = ["panel", "registros", "eliminados", "almacenamiento"];

export function conectarEnVivo(ctx, { esperaMs = 400 } = {}){
  let cancelar = null, temporizador = null, refrescando = false;

  async function refrescar(){
    if(!ctx.yo || ctx.auth.modo || refrescando) return;
    refrescando = true;
    try {
      await ctx.recargar();
      const a = ctx.abierto;
      // El registro abierto solo se cambia si la persona no tiene nada sin guardar; si lo tiene, el control de versión avisará.
      if(a && !a.guardador.hayPendientes()){
        const nuevo = await ctx.repo.cargarRegistro(a.id).catch(() => null);
        if(nuevo && nuevo.version !== a.rec.version){ a.rec = nuevo; vDetalle.repintar(ctx); }
      }
      if(REPINTABLES.includes(ctx.vista) && !a) ctx.render();
    } catch { /* si falla, la próxima señal vuelve a intentarlo */ }
    finally { refrescando = false; }
  }
  const programar = () => { clearTimeout(temporizador); temporizador = setTimeout(refrescar, esperaMs); };
  const alVolver = () => { if(!document.hidden) programar(); };
  const alConectar = () => { ctx.pendientes.forEach(g => { if(g.estado === "error") g.reintentar(); }); programar(); };

  ctx.iniciarEnVivo = async () => {
    ctx.detenerEnVivo();
    cancelar = ctx.repo.suscribir ? ctx.repo.suscribir(programar) : null;
    document.addEventListener("visibilitychange", alVolver);
    window.addEventListener("online", alConectar);
  };
  ctx.detenerEnVivo = () => {
    clearTimeout(temporizador);
    if(cancelar){ try { cancelar(); } catch { /* ya estaba cerrado */ } cancelar = null; }
    document.removeEventListener("visibilitychange", alVolver);
    window.removeEventListener("online", alConectar);
  };
}
