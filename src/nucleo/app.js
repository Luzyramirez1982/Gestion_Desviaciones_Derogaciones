// Armado de la aplicación: sesión, menú por rol, rutas y recarga de datos.
// Las pantallas viven en src/vistas/ y solo hablan con el repositorio (src/datos/repositorio.js).
import { esc } from "../util/html.js";
import { STAGES } from "../dominio/constantes.js";
import { icon } from "../componentes/iconos.js";
import { aviso } from "../componentes/avisos.js";
import * as vAuth from "../vistas/auth.js";
import * as vPanel from "../vistas/panel.js";
import * as vLista from "../vistas/lista.js";
import * as vFormulario from "../vistas/formulario.js";
import * as vDetalle from "../vistas/detalle.js";
import * as vUsuarios from "../vistas/usuarios.js";
import * as vTipos from "../vistas/tipos.js";
import * as vEliminados from "../vistas/eliminados.js";
import * as vAlmacenamiento from "../vistas/almacenamiento.js";
import * as vAyuda from "../vistas/ayuda/index.js";
import { conectarEnVivo } from "./envivo.js";

// Cada opción del menú dice qué rol la ve.
const MENU = [
  {id: "panel", etiqueta: "Panel de control", icono: "dashboard", vista: vPanel},
  {id: "nuevo", etiqueta: "Nuevo registro", icono: "plus", vista: vFormulario, soloCreadores: true},
  {id: "registros", etiqueta: "Registros", icono: "list", vista: vLista},
  {id: "usuarios", etiqueta: "Usuarios", icono: "users", vista: vUsuarios, soloAdmin: true},
  {id: "tipos", etiqueta: "Tipos de desviación o derogación", icono: "tag", vista: vTipos, soloAdmin: true},
  {id: "eliminados", etiqueta: "Registros eliminados", icono: "trash", vista: vEliminados, soloAdmin: true},
  {id: "almacenamiento", etiqueta: "Uso del almacenamiento", icono: "db", vista: vAlmacenamiento, soloAdmin: true},
  {id: "ayuda", etiqueta: "Instructivo", icono: "help", vista: vAyuda},
];

export async function arrancar(raiz, repo, { hashInicial = "" } = {}){
  const ctx = {
    raiz, repo, demo: !!repo.demo, yo: null,
    base: {perfiles: [], areas: [], tipos: [], configuracion: {}}, registros: [], eliminados: [],
    auth: {modo: null, err: "", msg: "", cargando: true},
    vista: "panel", abierto: null, filtros: {busqueda: "", area: "Todas", tipo: "Todos", etapa: "Todas", pagina: 1},
    pendientes: new Set(),            // guardadores con cambios sin guardar (para avisar al cerrar la pestaña)
  };
  conectarEnVivo(ctx);
  ctx.esAdmin = () => !!ctx.yo && ctx.yo.rol === "Administrador";
  ctx.puedeCrear = () => !!ctx.yo && ["Responsable del proceso", "Administrador"].includes(ctx.yo.rol);
  ctx.nombresAreas = () => ctx.base.areas.map(a => a.nombre);
  ctx.menu = () => MENU.filter(m => (!m.soloAdmin || ctx.esAdmin()) && (!m.soloCreadores || ctx.puedeCrear()));
  ctx.misBorradores = () => ctx.registros.filter(r => r.borrador && ctx.yo && r.reportadoPorId === ctx.yo.id);

  ctx.error = (e) => { aviso((e && e.message) || "Ocurrió un error inesperado.", "error"); };
  ctx.ok = (t) => aviso(t, "ok");

  // Carga lo que necesita la pantalla: catálogos y registros que esta persona puede ver.
  ctx.recargar = async () => {
    const [base, registros] = await Promise.all([repo.cargarBase(), repo.listarRegistros()]);
    ctx.base = base; ctx.registros = registros;
    if(ctx.esAdmin()) ctx.eliminados = await repo.listarEliminados().catch(() => ctx.eliminados);
  };

  ctx.render = () => {
    if(!ctx.yo || ctx.auth.modo || ctx.auth.cargando){ raiz.innerHTML = vAuth.html(ctx); vAuth.montar(ctx, raiz); return; }
    const actual = ctx.menu().find(m => m.id === ctx.vista) || ctx.menu()[0];
    const arriba = raiz.querySelector(".panel-body")?.scrollTop || 0;   // para no perder el lugar al repintar el detalle
    ctx.vista = actual.id;
    const nBor = ctx.misBorradores().length;
    const botones = ctx.menu().map(m => `<button data-ir="${m.id}" class="${m.id === ctx.vista ? "active" : ""}">${icon(m.icono)}${esc(m.etiqueta)}${m.id === "nuevo" && nBor ? ` <span class="badge" style="background:#fef3c7;color:#92400e;padding:1px 7px;margin-left:auto;">${nBor}</span>` : ""}</button>`).join("");
    const pildora = ctx.demo
      ? `<span class="db-pill" style="background:#fef3c7;color:#92400e;">${icon("db")} Modo demostración</span>`
      : `<span class="db-pill" style="background:#dcfce7;color:#15803d;">${icon("db")} Base de datos conectada</span>`;
    raiz.innerHTML = `
      <aside class="sidebar">
        <div class="sidebar-brand"><div class="name">Gestión de Desviaciones y Derogaciones</div><div class="sub">MATEC</div>${pildora}</div>
        <nav class="nav">${botones}</nav>
        <div class="sidebar-foot">MATEC · ${ctx.base.areas.length} áreas de proceso</div>
      </aside>
      <div class="main">
        ${ctx.demo ? `<div class="demo-banda"><b>MODO DEMOSTRACIÓN:</b> los datos son de ejemplo y se pierden al recargar. No está conectado a ninguna base de datos real.</div>` : ""}
        <div class="mobile-nav">${botones}</div>
        <div class="topbar">
          <div><h1>Gestión de Desviaciones y Derogaciones</h1><div class="cycle">Ciclo: ${STAGES.join(" → ")}</div></div>
          <div class="session">
            <span style="font-weight:600;color:var(--text);">${esc(ctx.yo.nombre)}</span><span class="role-pill">${esc(ctx.yo.rol)}</span>
            <button class="btn btn-outline btn-sm" id="btnCambiarClave">${icon("edit")} Cambiar contraseña</button>
            <button class="btn btn-outline btn-sm" id="btnSalir">Cerrar sesión</button>
          </div>
        </div>
        <div class="content" id="contenido">${actual.vista.html(ctx)}</div>
      </div>
      <div id="capaDetalle">${ctx.abierto ? vDetalle.html(ctx) : ""}</div>`;
    raiz.querySelectorAll("[data-ir]").forEach(b => b.addEventListener("click", () => ctx.ir(b.dataset.ir)));
    raiz.querySelector("#btnSalir").addEventListener("click", () => ctx.cerrarSesion());
    raiz.querySelector("#btnCambiarClave").addEventListener("click", () => { ctx.auth.modo = "cambiar"; ctx.auth.forzado = false; ctx.auth.err = ""; ctx.render(); });
    actual.vista.montar(ctx, raiz.querySelector("#contenido"));
    if(ctx.abierto){
      vDetalle.montar(ctx, raiz.querySelector("#capaDetalle"));
      const cuerpo = raiz.querySelector(".panel-body");
      if(cuerpo) cuerpo.scrollTop = arriba;
    }
    // Los botones "abrir registro" de las listas llevan a la ruta del detalle.
    raiz.querySelectorAll("[data-abrir]").forEach(el => el.addEventListener("click", () => ctx.ir("registros/" + el.dataset.abrir)));
  };

  // Rutas: #/panel, #/registros, #/registros/MTC-001, #/nuevo, #/nuevo/BOR-0001, #/usuarios...
  ctx.ir = (ruta) => { const nueva = "#/" + ruta; if(location.hash !== nueva) location.hash = nueva; return ctx.rutear(); };
  ctx.rutear = async () => {
    if(!ctx.yo) return;
    const [vista, parametro] = location.hash.replace(/^#\/?/, "").split("/").map(decodeURIComponent);
    ctx.vista = vista || "panel";
    ctx.parametro = parametro || "";
    if(ctx.vista === "registros" && parametro){
      await vDetalle.abrir(ctx, parametro);
    } else {
      if(ctx.abierto) await vDetalle.cerrar(ctx, {sinRuta: true});
    }
    if(ctx.vista === "nuevo") await vFormulario.preparar(ctx);
    if(ctx.vista === "eliminados" && ctx.esAdmin()) ctx.eliminados = await repo.listarEliminados().catch(() => ctx.eliminados);
    ctx.render();
  };
  const alCambiarRuta = () => { ctx.rutear(); };
  window.addEventListener("hashchange", alCambiarRuta);

  ctx.entrar = async (perfil) => {
    ctx.yo = perfil;
    ctx.auth = {modo: perfil.debeCambiarClave ? "cambiar" : null, forzado: perfil.debeCambiarClave, err: "", msg: "", cargando: false};
    try { await ctx.recargar(); } catch(e){ ctx.auth.err = e.message; }
    if(!ctx.auth.modo) await ctx.iniciarEnVivo?.();
    if(!location.hash || location.hash === "#") location.hash = "#/panel";
    await ctx.rutear();
    ctx.render();
  };

  ctx.cerrarSesion = async () => {
    try { await repo.cerrarSesion(); } catch { /* da igual: se limpia la pantalla de todos modos */ }
    ctx.detenerEnVivo?.();
    Object.assign(ctx, {yo: null, registros: [], eliminados: [], abierto: null});
    ctx.auth = {modo: null, err: "", msg: "Sesión cerrada.", cargando: false};
    location.hash = "";
    ctx.render();
  };

  // Avisa si se intenta cerrar la pestaña con cambios sin guardar.
  const alCerrarPestana = e => {
    if([...ctx.pendientes].some(g => g.hayPendientes())){ e.preventDefault(); e.returnValue = ""; }
  };
  window.addEventListener("beforeunload", alCerrarPestana);
  // Quita lo que la aplicación dejó escuchando (las pruebas montan la aplicación varias veces).
  ctx.destruir = () => {
    window.removeEventListener("hashchange", alCambiarRuta);
    window.removeEventListener("beforeunload", alCerrarPestana);
    ctx.detenerEnVivo?.();
  };

  repo.alEventoSesion?.(evento => {
    if(evento === "recuperar"){ ctx.auth = {modo: "recuperar", forzado: true, err: "", msg: "", cargando: false}; ctx.render(); }
  });

  // Arranque: ¿ya hay una sesión abierta?
  ctx.render();
  const recuperando = /type=recovery/.test(hashInicial);
  try {
    const perfil = await repo.sesionActual();
    if(recuperando){
      ctx.yo = perfil;
      ctx.auth = {modo: "recuperar", forzado: true, err: "", msg: "", cargando: false};
      history.replaceState(null, "", location.pathname + location.search);
      ctx.render();
    } else if(perfil) await ctx.entrar(perfil);
    else { ctx.auth.cargando = false; ctx.render(); }
  } catch(e){ ctx.auth = {modo: null, err: e.message, msg: "", cargando: false}; ctx.render(); }
  return ctx;
}
