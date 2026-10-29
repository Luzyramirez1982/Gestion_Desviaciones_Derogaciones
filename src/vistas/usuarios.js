// Usuarios (se crean con la función del servidor), tarjeta para compartir el acceso, enlace de acceso
// a la aplicación y áreas de los Responsables del proceso.
import { esc, urlSegura } from "../util/html.js";
import { ROLES } from "../dominio/constantes.js";
import { mensajeAcceso } from "../dominio/mensajes.js";
import { direccionPublicada, enlaceValido } from "../util/enlace.js";
import { icon } from "../componentes/iconos.js";
import { areaBadge } from "../componentes/insignias.js";
import { confirmar, pedirTexto, informar } from "../componentes/dialogos.js";

// El enlace sale del que guardó el Administrador o, si no hay, de la dirección publicada. Nunca de localhost ni de un archivo local.
export const enlaceAcceso = (ctx) => urlSegura((ctx.base.configuracion.enlace_acceso || {}).url) || direccionPublicada(location.href);

const opcionesArea = (ctx, elegida) => `<option value="" ${!elegida ? "selected" : ""}>— Sin área —</option>` +
  ctx.nombresAreas().map(a => `<option value="${esc(a)}" ${elegida === a ? "selected" : ""}>${esc(a)}</option>`).join("");

function tarjetaCompartir(ctx){
  const sa = ctx.compartir;
  if(!sa) return "";
  const url = enlaceAcceso(ctx);
  return `<div class="card share-card" style="margin-bottom:16px;">
    <h3>${icon("mail")} ${sa.clave ? "Contraseña temporal lista: comparta el acceso" : "Compartir acceso"} — ${esc(sa.nombre)}</h3>
    ${!url ? `<div class="banner banner-amber">${icon("alert")} <span>Aún no hay enlace de la aplicación. Cuando esté publicada, quedará aquí sola; mientras tanto puede escribirlo en «Enlace de acceso a la aplicación».</span></div>` : ""}
    <div class="kv" style="margin:0 0 10px;">
      <div class="full"><div class="k">Enlace de acceso</div><div class="v">${url ? `<a href="${esc(url)}" target="_blank" rel="noopener">${esc(url)}</a>` : "—"}</div></div>
      <div><div class="k">Usuario</div><div class="v">${esc(sa.correo)}</div></div>
      <div><div class="k">${sa.clave ? "Contraseña temporal" : "Contraseña"}</div><div class="v">${sa.clave ? `<code id="claveTemporal">${esc(sa.clave)}</code>` : "La que ya tiene (o «¿Olvidó su contraseña?»)"}</div></div>
      <div><div class="k">Rol</div><div class="v">${esc(sa.rol)}</div></div>
      <div><div class="k">Área</div><div class="v">${esc(sa.area || "—")}</div></div></div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;">
      <a class="btn btn-primary btn-sm" href="${esc(correoAcceso(ctx, sa))}" id="btnCorreoAcceso">${icon("mail")} Enviar correo de bienvenida</a>
      <button type="button" class="btn btn-outline btn-sm" id="btnCopiarAcceso">${icon("clip")} Copiar datos de acceso</button>
      <a class="btn btn-outline btn-sm" href="https://wa.me/?text=${encodeURIComponent(textoAcceso(ctx, sa))}" target="_blank" rel="noopener">Compartir por WhatsApp</a>
      <button type="button" class="btn btn-outline btn-sm" id="btnCerrarCompartir">Cerrar</button></div>
    ${sa.clave ? `<p class="hint" style="margin:10px 0 0;">La contraseña temporal solo se muestra ahora: envíela antes de cerrar este recuadro. La persona deberá cambiarla en su primer ingreso.</p>` : ""}</div>`;
}
const textoAcceso = (ctx, sa) => mensajeAcceso(sa, enlaceAcceso(ctx), ctx.yo.nombre);
const correoAcceso = (ctx, sa) => `mailto:${encodeURIComponent(sa.correo)}?subject=${encodeURIComponent("Acceso al aplicativo de Gestión de Desviaciones y Derogaciones — MATEC")}&body=${encodeURIComponent(textoAcceso(ctx, sa))}`;

const estadoAcceso = (p) => p.activo
  ? (p.debeCambiarClave ? `<span class="acc-badge" style="background:#fef3c7;color:#92400e;">Pendiente de primer ingreso</span>` : `<span class="acc-badge" style="background:#dcfce7;color:#15803d;">Activo</span>`)
  : `<span class="acc-badge" style="background:#fee2e2;color:#b91c1c;">Desactivado</span>`;

export function html(ctx){
  const { perfiles, areas } = ctx.base;
  const entrada = "width:100%;border:1px solid var(--border);border-radius:7px;padding:6px 8px;";
  const url = enlaceAcceso(ctx);
  return `
    ${tarjetaCompartir(ctx)}
    <div class="card" style="margin-bottom:16px;"><h3>${icon("link")} Enlace de acceso a la aplicación</h3>
      <p class="hint" style="margin:-4px 0 8px;">Es el enlace que se envía a los usuarios junto con su usuario y contraseña. Se llena solo con la dirección publicada de la aplicación. ${direccionPublicada(location.href) ? "" : "<b>Esta copia no está publicada</b>, así que el enlace queda vacío hasta que se abra desde su dirección real (o escríbalo aquí)."}</p>
      <form id="formEnlace" class="type-add"><input type="url" id="entradaEnlace" value="${esc(url)}" placeholder="https://…"><button class="btn btn-outline btn-sm" type="submit">${icon("check")} Guardar enlace</button></form></div>

    <div class="card" style="margin-bottom:16px;"><h3>Crear usuario</h3>
      <p class="hint" style="margin:-4px 0 10px;">Al crear el usuario se genera una <b>contraseña temporal</b> y se muestra la tarjeta para compartirle el enlace, el usuario (correo) y la contraseña. La persona la cambia en su primer ingreso.</p>
      <form id="formUsuario">
        <div class="row2"><div class="field"><label>Nombre completo</label><input type="text" name="nombre" required minlength="3"></div>
          <div class="field"><label>Correo electrónico</label><input type="email" name="correo" required></div></div>
        <div class="row2"><div class="field"><label>Rol</label><select name="rol">${ROLES.map(r => `<option ${r === "Responsable del proceso" ? "selected" : ""}>${esc(r)}</option>`).join("")}</select></div>
          <div class="field"><label>Área</label><select name="area">${opcionesArea(ctx, "")}</select><div class="hint">Recomendada para el Responsable del proceso: además de sus propias solicitudes, podrá consultar las dirigidas a su área.</div></div></div>
        <button type="submit" class="btn btn-primary" id="btnCrearUsuario">${icon("plus")} Crear usuario y generar acceso</button></form></div>

    <div class="card"><h3>Usuarios registrados (${perfiles.length})</h3>
      <p class="hint" style="margin:-4px 0 10px;">«Editar» cambia nombre, rol o área (el correo no se cambia). «Restablecer contraseña» genera una nueva contraseña temporal. En vez de eliminar, se <b>desactiva</b> a la persona: pierde el acceso pero queda su historia. Siempre debe existir al menos un Administrador activo.</p>
      <div style="overflow-x:auto;"><table class="simple">
        <thead><tr><th>Nombre</th><th>Correo (usuario)</th><th>Rol</th><th>Área</th><th>Acceso</th><th style="text-align:right;">Acciones</th></tr></thead>
        <tbody>${perfiles.map(p => ctx.editandoUsuario === p.id ? `<tr style="background:#f8fbff;">
          <td><input type="text" id="euNombre" value="${esc(p.nombre)}" style="${entrada}"></td><td>${esc(p.correo)}</td>
          <td><select id="euRol" style="border:1px solid var(--border);border-radius:7px;padding:6px 8px;">${ROLES.map(r => `<option ${p.rol === r ? "selected" : ""}>${esc(r)}</option>`).join("")}</select></td>
          <td><select id="euArea" style="border:1px solid var(--border);border-radius:7px;padding:6px 8px;">${opcionesArea(ctx, p.area)}</select></td>
          <td>${estadoAcceso(p)}</td>
          <td style="text-align:right;white-space:nowrap;"><button class="btn btn-primary btn-sm" data-guardar-usuario="${esc(p.id)}">${icon("check")} Guardar</button> <button class="btn btn-outline btn-sm" data-cancelar-usuario>Cancelar</button></td></tr>`
          : `<tr><td>${esc(p.nombre)}${p.id === ctx.yo.id ? ` <span class="hint">(sesión actual)</span>` : ""}</td><td>${esc(p.correo)}</td>
          <td><span class="role-pill">${esc(p.rol)}</span></td><td>${esc(p.area || "—")}</td><td>${estadoAcceso(p)}</td>
          <td style="text-align:right;white-space:nowrap;">
            <button class="btn btn-outline btn-sm" data-compartir="${esc(p.id)}">${icon("mail")} Compartir</button>
            <button class="btn btn-outline btn-sm" data-restablecer="${esc(p.id)}">Restablecer contraseña</button>
            <button class="btn btn-outline btn-sm" data-editar-usuario="${esc(p.id)}">${icon("edit")} Editar</button>
            ${p.id === ctx.yo.id ? "" : p.activo ? `<button class="btn btn-danger-outline btn-sm" data-desactivar="${esc(p.id)}">Desactivar</button>` : `<button class="btn btn-outline btn-sm" data-activar="${esc(p.id)}">Activar</button>`}</td></tr>`).join("")}
        </tbody></table></div></div>

    <div class="card" style="margin-top:16px;" id="tarjetaAreas"><h3>Responsables del proceso por área</h3>
      <p class="hint" style="margin:-4px 0 10px;">Estas áreas alimentan las listas «Área» del formulario, de los usuarios y de los filtros. Puede cambiar su nombre (se actualiza en registros, personas y tipos), agregar áreas nuevas o eliminar las que no tengan registros ni usuarios.</p>
      <div style="overflow-x:auto;"><table class="simple">
        <thead><tr><th>Área</th><th>Responsable(s) del proceso</th><th>Registros</th><th style="text-align:right;">Acciones</th></tr></thead>
        <tbody>${areas.map(a => {
          const resp = perfiles.filter(x => x.rol === "Responsable del proceso" && x.area === a.nombre);
          const n = ctx.registros.filter(x => x.area === a.nombre).length;
          const enUso = n > 0 || perfiles.some(x => x.area === a.nombre);
          if(ctx.editandoArea === a.nombre) return `<tr style="background:#f8fbff;"><td colspan="3"><input type="text" id="entradaArea" value="${esc(a.nombre)}" style="${entrada}"></td>
            <td style="text-align:right;white-space:nowrap;"><button class="btn btn-primary btn-sm" data-guardar-area="${esc(a.nombre)}">${icon("check")} Guardar</button> <button class="btn btn-outline btn-sm" data-cancelar-area>Cancelar</button></td></tr>`;
          return `<tr><td>${areaBadge(a.nombre, areas)}</td>
            <td>${resp.length ? resp.map(x => esc(x.nombre) + " &lt;" + esc(x.correo) + "&gt;").join("<br>") : `<span class="hint">Sin responsable asignado</span>`}</td><td>${n}</td>
            <td style="text-align:right;white-space:nowrap;"><button class="btn btn-outline btn-sm" data-editar-area="${esc(a.nombre)}">${icon("edit")} Editar</button>
              ${enUso ? "" : `<button class="btn btn-danger-outline btn-sm" data-eliminar-area="${esc(a.nombre)}" title="Eliminar área">${icon("trash")}</button>`}</td></tr>`;
        }).join("")}</tbody></table></div>
      <form id="formArea" class="type-add" style="margin-top:10px;"><input type="text" id="areaNueva" placeholder="Nombre de la nueva área (ej. Mantenimiento)" required>
        <button class="btn btn-outline btn-sm" type="submit">${icon("plus")} Agregar área</button></form></div>`;
}

export function montar(ctx, el){
  const refrescar = async (mensaje) => { await ctx.recargar(); if(mensaje) ctx.ok(mensaje); ctx.render(); };
  const intentar = async (fn, mensaje) => { try { await fn(); await refrescar(mensaje); } catch(e){ ctx.error(e); } };
  const por = (atributo, fn) => el.querySelectorAll(`[${atributo}]`).forEach(b => b.addEventListener("click", () => fn(b.getAttribute(atributo))));
  const persona = (id) => ctx.base.perfiles.find(p => p.id === id);

  el.querySelector("#formEnlace").addEventListener("submit", async e => {
    e.preventDefault();
    const url = enlaceValido(el.querySelector("#entradaEnlace").value);
    if(url === null) return ctx.error(new Error("El enlace debe empezar con https:// (por ejemplo, https://mi-app.pages.dev)."));
    intentar(() => ctx.repo.guardarConfig("enlace_acceso", {url}), "Enlace guardado.");
  });

  el.querySelector("#formUsuario").addEventListener("submit", async e => {
    e.preventDefault();
    const f = e.target, btn = el.querySelector("#btnCrearUsuario"); btn.disabled = true;
    try {
      const r = await ctx.repo.crearUsuario({nombre: f.elements.nombre.value.trim(), correo: f.elements.correo.value.trim(), rol: f.elements.rol.value, area: f.elements.area.value});
      ctx.compartir = {nombre: f.elements.nombre.value.trim(), correo: r.correo, clave: r.clave, rol: f.elements.rol.value, area: f.elements.area.value};
      await refrescar("Usuario creado.");
    } catch(err){ ctx.error(err); btn.disabled = false; }
  });

  por("data-compartir", id => { const p = persona(id); ctx.compartir = {nombre: p.nombre, correo: p.correo, clave: "", rol: p.rol, area: p.area}; ctx.render(); window.scrollTo?.(0, 0); });
  por("data-restablecer", async id => {
    const p = persona(id);
    if(!await confirmar("Restablecer contraseña", `Se genera una contraseña temporal nueva para ${p.nombre}. La actual deja de servir y la persona deberá cambiarla al ingresar.`, {aceptar: "Restablecer"})) return;
    try { const r = await ctx.repo.restablecerClave(id); ctx.compartir = {nombre: p.nombre, correo: p.correo, clave: r.clave, rol: p.rol, area: p.area}; await refrescar("Contraseña restablecida."); window.scrollTo?.(0, 0); }
    catch(err){ ctx.error(err); }
  });
  por("data-desactivar", async id => {
    if(await confirmar("Desactivar persona", `${persona(id).nombre} perderá el acceso de inmediato. Sus registros se conservan. Puede volver a activarla cuando quiera.`, {aceptar: "Desactivar", peligro: true}))
      intentar(() => ctx.repo.cambiarActivo(id, false), "Persona desactivada.");
  });
  por("data-activar", id => intentar(() => ctx.repo.cambiarActivo(id, true), "Persona activada."));
  por("data-editar-usuario", id => { ctx.editandoUsuario = id; ctx.render(); });
  por("data-cancelar-usuario", () => { ctx.editandoUsuario = null; ctx.render(); });
  por("data-guardar-usuario", id => {
    const nombre = el.querySelector("#euNombre").value.trim();
    if(nombre.length < 3) return ctx.error(new Error("Escriba el nombre completo."));
    intentar(async () => { await ctx.repo.actualizarPerfil(id, {nombre, rol: el.querySelector("#euRol").value, area: el.querySelector("#euArea").value}); ctx.editandoUsuario = null; }, "Cambios guardados.");
  });

  const cerrarCompartir = el.querySelector("#btnCerrarCompartir");
  if(cerrarCompartir) cerrarCompartir.addEventListener("click", () => { ctx.compartir = null; ctx.render(); });
  const copiar = el.querySelector("#btnCopiarAcceso");
  if(copiar) copiar.addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(textoAcceso(ctx, ctx.compartir)); ctx.ok("Datos de acceso copiados."); }
    catch { await informar("Copie el mensaje", textoAcceso(ctx, ctx.compartir)); }
  });

  // Áreas
  el.querySelector("#formArea").addEventListener("submit", e => { e.preventDefault(); const n = el.querySelector("#areaNueva").value.trim(); if(n) intentar(() => ctx.repo.guardarArea(n), "Área agregada."); });
  por("data-editar-area", n => { ctx.editandoArea = n; ctx.render(); });
  por("data-cancelar-area", () => { ctx.editandoArea = null; ctx.render(); });
  por("data-guardar-area", viejo => {
    const nuevo = el.querySelector("#entradaArea").value.trim();
    intentar(async () => { if(nuevo !== viejo) await ctx.repo.renombrarArea(viejo, nuevo); ctx.editandoArea = null; }, "Área actualizada.");
  });
  por("data-eliminar-area", async n => {
    if(await confirmar("Eliminar área", `Se eliminará «${n}» y sus tipos de desviación. Solo se puede si no tiene registros ni personas.`, {aceptar: "Eliminar", peligro: true}))
      intentar(() => ctx.repo.eliminarArea(n), "Área eliminada.");
  });
}
