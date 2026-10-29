// Recorridos completos de la aplicación con el adaptador de demostración: ingreso, menú por rol,
// crear solicitud, evaluar, devolver, rechazar, cerrar y permisos.
import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { simularCanvas, montarApp, ingresar, salir, menu, hasta, clic, escribir } from "./ayuda_ui.js";

beforeAll(simularCanvas);
let app;
beforeEach(async () => { app = await montarApp(); });

describe("ingreso y menú por rol", () => {
  it("muestra el aviso de demostración y rechaza una clave mala", async () => {
    expect(app.raiz.textContent).toContain("Modo demostración");
    const f = app.raiz.querySelector("#formIngreso");
    f.elements.correo.value = "admin@ejemplo.test"; f.elements.clave.value = "mala";
    f.dispatchEvent(new Event("submit", {cancelable: true, bubbles: true}));
    await hasta(() => app.raiz.textContent.includes("Correo o contraseña incorrectos."), "mensaje de error");
    expect(app.raiz.querySelector("#btnSalir")).toBeNull();
  });
  it("cada rol ve su menú", async () => {
    await ingresar(app, "admin");
    expect(menu(app)).toEqual(["Panel de control", "Nuevo registro", "Registros", "Usuarios", "Tipos de desviación o derogación", "Registros eliminados", "Uso del almacenamiento", "Instructivo"]);
    await salir(app);
    await ingresar(app, "calidad");
    expect(menu(app)).toEqual(["Panel de control", "Nuevo registro", "Registros", "Instructivo"]);
    await salir(app);
    await ingresar(app, "aprobador");
    expect(menu(app)).toEqual(["Panel de control", "Registros", "Instructivo"]);
  });
  it("entrar a una ruta de administración sin serlo no muestra esa sección", async () => {
    await ingresar(app, "aprobador");
    location.hash = "#/usuarios";
    await app.ctx.rutear();
    expect(app.raiz.textContent).not.toContain("Crear usuario");
  });
  it("cerrar sesión limpia la pantalla", async () => {
    await ingresar(app, "admin");
    await salir(app);
    expect(app.raiz.textContent).toContain("Sesión cerrada.");
    expect(app.raiz.textContent).not.toContain("Registros eliminados");
  });
});

describe("primer ingreso y contraseñas", () => {
  it("la cuenta nueva debe cambiar la contraseña temporal antes de entrar", async () => {
    await ingresar(app, "admin");
    const nuevo = await app.repo.crearUsuario({ nombre: "Nueva Persona", correo: "nueva@ejemplo.test", rol: "Aprobador autorizado", area: "" });
    await salir(app);
    const f = app.raiz.querySelector("#formIngreso");
    f.elements.correo.value = "nueva@ejemplo.test"; f.elements.clave.value = nuevo.clave;
    f.dispatchEvent(new Event("submit", {cancelable: true, bubbles: true}));
    await hasta(() => app.raiz.querySelector("#formCambiar"), "formulario de cambio obligatorio");
    expect(app.raiz.querySelector("#btnSalir")).toBeNull();
    const c = app.raiz.querySelector("#formCambiar");
    c.elements.p1.value = "corta"; c.elements.p2.value = "corta";
    c.dispatchEvent(new Event("submit", {cancelable: true, bubbles: true}));
    await hasta(() => app.raiz.textContent.includes("al menos 8 caracteres"), "regla de contraseña");
    const c2 = app.raiz.querySelector("#formCambiar");
    c2.elements.p1.value = "Segura2026"; c2.elements.p2.value = "Segura2026";
    c2.dispatchEvent(new Event("submit", {cancelable: true, bubbles: true}));
    await hasta(() => app.raiz.querySelector("#btnSalir"), "entrar tras cambiar la clave");
  });
  it("olvidé mi contraseña responde igual exista o no la cuenta", async () => {
    clic(app.raiz.querySelector("[data-olvido]"));
    const f = await hasta(() => app.raiz.querySelector("#formOlvido"), "formulario de olvido");
    f.elements.correo.value = "cualquiera@x.co";
    f.dispatchEvent(new Event("submit", {cancelable: true, bubbles: true}));
    await hasta(() => app.raiz.textContent.includes("recibirá un correo"), "mensaje neutro");
  });
});

describe("panel y lista", () => {
  it("el panel cuenta los registros visibles", async () => {
    await ingresar(app, "aprobador");
    expect(app.raiz.querySelector(".kpis").textContent).toContain("3");
  });
  it("un responsable solo ve su área en la lista", async () => {
    await ingresar(app, "produccion");
    clic([...app.raiz.querySelectorAll(".nav button")].find(b => b.textContent.includes("Registros")));
    await hasta(() => app.raiz.querySelector(".list"), "la lista");
    expect(app.raiz.querySelector(".list").textContent).toContain("MTC-002");
    expect(app.raiz.querySelector(".list").textContent).not.toContain("MTC-001");
  });
  it("el filtro por etapa y la búsqueda funcionan", async () => {
    await ingresar(app, "aprobador");
    clic([...app.raiz.querySelectorAll(".nav button")].find(b => b.textContent.includes("Registros")));
    await hasta(() => app.raiz.querySelector("#fEtapa"), "filtros");
    escribir(app.raiz.querySelector("#fEtapa"), "Cierre");
    expect(app.raiz.querySelector(".list").textContent).toContain("MTC-002");
    expect(app.raiz.querySelector(".list").textContent).not.toContain("MTC-001");
    escribir(app.raiz.querySelector("#fEtapa"), "Todas");
    escribir(app.raiz.querySelector("#busqueda"), "MTC-003");
    expect(app.raiz.querySelectorAll(".list .row")).toHaveLength(1);
  });
});
