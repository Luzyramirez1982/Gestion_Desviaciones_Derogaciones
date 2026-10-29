// Ingreso, olvido de contraseña y cambio de contraseña (también el obligatorio del primer ingreso).
// No hay "activar primer Administrador" aquí: ese se crea con scripts/crear-primer-admin.mjs.
import { esc } from "../util/html.js";
import { validarClave } from "../auth/clave.js";
import { PERSONAS_DEMO, CLAVE_DEMO } from "../datos/ejemplo.js";

export function html(ctx){
  const a = ctx.auth;
  const msg = (a.err ? `<div class="auth-msg err">${esc(a.err)}</div>` : "") + (a.msg ? `<div class="auth-msg ok">${esc(a.msg)}</div>` : "");
  const titulo = `<h2>Gestión de Desviaciones y Derogaciones</h2><div class="sub">C.I. Matec Logística S.A.S.</div>`;
  let cuerpo;
  if(a.cargando){
    cuerpo = `<div class="auth-msg info">Verificando la sesión…</div>`;
  } else if(a.modo === "cambiar" || a.modo === "recuperar"){
    const forzado = a.modo === "recuperar" || a.forzado;
    cuerpo = `<form id="formCambiar">
      <p class="hint" style="margin:0 0 12px;">${forzado && a.modo === "cambiar" ? "Por seguridad, reemplace la contraseña temporal por una personal antes de continuar." : "Escriba su nueva contraseña."}</p>
      <div class="field"><label>Nueva contraseña</label><input type="password" name="p1" autocomplete="new-password" required minlength="8"></div>
      <div class="field"><label>Repita la nueva contraseña</label><input type="password" name="p2" autocomplete="new-password" required minlength="8"></div>
      <div class="hint" style="margin:-4px 0 12px;">Mínimo 8 caracteres, con letras y números.</div>
      <button class="btn btn-primary" type="submit" style="width:100%;justify-content:center;">Guardar contraseña</button>
      <div class="links">${forzado ? `<a href="#" data-salir>Cerrar sesión</a>` : `<a href="#" data-cancelar>Cancelar</a>`}</div>
    </form>`;
  } else if(a.modo === "olvido"){
    cuerpo = `<form id="formOlvido">
      <p class="hint" style="margin:0 0 12px;">Le enviaremos un correo con un enlace para crear una nueva contraseña.</p>
      <div class="field"><label>Correo electrónico (usuario)</label><input type="email" name="correo" autocomplete="username" required></div>
      <button class="btn btn-primary" type="submit" style="width:100%;justify-content:center;">Enviar enlace</button>
      <div class="links"><a href="#" data-volver>Volver al ingreso</a></div>
    </form>`;
  } else {
    cuerpo = `<form id="formIngreso">
      <div class="field"><label>Usuario (correo electrónico)</label><input type="email" name="correo" autocomplete="username" required></div>
      <div class="field"><label>Contraseña</label><input type="password" name="clave" autocomplete="current-password" required></div>
      <button class="btn btn-primary" type="submit" style="width:100%;justify-content:center;">Ingresar</button>
      <div class="links"><a href="#" data-olvido>¿Olvidó su contraseña?</a></div>
    </form>
    ${ctx.demo ? `<div class="auth-msg info" style="margin-top:14px;"><b>Modo demostración.</b> Datos de ejemplo inventados. Cuentas (contraseña <code>${esc(CLAVE_DEMO)}</code>):
      <ul style="margin:6px 0 0;padding-left:18px;">${PERSONAS_DEMO.map(p => `<li><a href="#" data-demo="${esc(p.correo)}">${esc(p.correo)}</a> — ${esc(p.rol)}</li>`).join("")}</ul></div>` : ""}`;
  }
  return `<div class="auth-wrap"><div class="auth-card">${titulo}${msg}${cuerpo}</div></div>`;
}

export function montar(ctx, raiz){
  const a = ctx.auth;
  const ocupado = (form, texto) => { const b = form.querySelector("button[type=submit]"); if(b){ b.disabled = true; b.textContent = texto; } };
  const falla = (e) => { a.err = e.message; a.msg = ""; ctx.render(); };
  const enlace = (sel, fn) => raiz.querySelectorAll(sel).forEach(el => el.addEventListener("click", e => { e.preventDefault(); fn(el); }));

  enlace("[data-olvido]", () => { a.modo = "olvido"; a.err = ""; a.msg = ""; ctx.render(); });
  enlace("[data-volver]", () => { a.modo = null; a.err = ""; ctx.render(); });
  enlace("[data-cancelar]", () => { a.modo = null; a.err = ""; ctx.render(); });
  enlace("[data-salir]", () => ctx.cerrarSesion());
  enlace("[data-demo]", (el) => {
    const f = raiz.querySelector("#formIngreso");
    f.elements.correo.value = el.dataset.demo; f.elements.clave.value = CLAVE_DEMO;
  });

  const ingreso = raiz.querySelector("#formIngreso");
  if(ingreso) ingreso.addEventListener("submit", async e => {
    e.preventDefault();
    ocupado(ingreso, "Ingresando…");
    try {
      const perfil = await ctx.repo.iniciarSesion(ingreso.elements.correo.value, ingreso.elements.clave.value);
      await ctx.entrar(perfil);
    } catch(err){ falla(err); }
  });

  const olvido = raiz.querySelector("#formOlvido");
  if(olvido) olvido.addEventListener("submit", async e => {
    e.preventDefault();
    const correo = olvido.elements.correo.value.trim();
    ocupado(olvido, "Enviando…");
    try {
      await ctx.repo.recuperarClave(correo);
      // El mensaje es el mismo exista o no la cuenta, para no revelar quién tiene acceso.
      a.modo = null; a.err = ""; a.msg = `Si ${correo} tiene una cuenta, recibirá un correo con el enlace para crear una nueva contraseña.`;
      ctx.render();
    } catch(err){ falla(err); }
  });

  const cambiar = raiz.querySelector("#formCambiar");
  if(cambiar) cambiar.addEventListener("submit", async e => {
    e.preventDefault();
    const error = validarClave(cambiar.elements.p1.value, cambiar.elements.p2.value);
    if(error){ a.err = error; ctx.render(); return; }
    ocupado(cambiar, "Guardando…");
    try {
      await ctx.repo.cambiarClave(cambiar.elements.p1.value);
      const perfil = await ctx.repo.sesionActual();
      if(!perfil) throw new Error("Su contraseña se cambió, pero no se pudo abrir la sesión. Ingrese de nuevo.");
      await ctx.entrar(perfil);
      ctx.ok("Su contraseña se cambió correctamente.");
    } catch(err){ falla(err); }
  });
}
