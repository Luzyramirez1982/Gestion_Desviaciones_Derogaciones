// Flujos clave de punta a punta en la interfaz: crear la solicitud, evaluar y firmar, devolver y reenviar,
// rechazar, cerrar, usuarios y textos que vienen de la base (deben mostrarse escapados).
import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { simularCanvas, montarApp, ingresar, salir, hasta, clic, escribir, esperar } from "./ayuda_ui.js";
import { OTRO } from "../../src/dominio/presentacion.js";

beforeAll(simularCanvas);
let app;
beforeEach(async () => { app = await montarApp(); });

const irA = async (texto) => {
  clic([...app.raiz.querySelectorAll(".nav button")].find(b => b.textContent.includes(texto)));
  await esperar(5);
};
const dibujarFirma = (lienzo) => lienzo.dispatchEvent(new MouseEvent("mousedown", {bubbles: true}));
const detalle = async (id) => {
  clic([...app.raiz.querySelectorAll(".row")].find(r => r.textContent.includes(id)));
  return hasta(() => app.raiz.querySelector("#panelBox"), "el detalle de " + id);
};
const cerrarDetalle = async () => { clic(app.raiz.querySelector("#cerrarPanel")); await hasta(() => !app.raiz.querySelector("#panelBox"), "cerrar el detalle"); };

function llenarFormulario(form, extra = {}){
  const campos = {cargo: "Analista", areaSolicitante: "Calidad", procesoSolicitante: "Inspección", ot: "OT-1", proyecto: "Proyecto X", lineaNegocio: "Logística",
    requisitoIncumplido: "Procedimiento A", equipoInvolucrado: "Equipo B", tareaDescripcion: "Tarea", motivoDesviacion: "Motivo",
    consecuenciasPotenciales: "Ninguna", controlesCompensatorios: "Inspección", ...extra};
  Object.entries(campos).forEach(([k, v]) => escribir(form.elements[k], v));
}

describe("crear una solicitud", () => {
  it("no se envía sin firma y luego queda en Evaluación y Aprobación con su consecutivo", async () => {
    await ingresar(app, "calidad");
    await irA("Nuevo registro");
    const form = await hasta(() => app.raiz.querySelector("#formNuevo"), "el formulario");
    llenarFormulario(form);
    form.elements.confirmaVeraz.checked = true;
    form.dispatchEvent(new Event("submit", {cancelable: true, bubbles: true}));
    await hasta(() => document.querySelector(".aviso-error"), "aviso de firma faltante");
    expect(document.querySelector(".aviso-error").textContent).toContain("firma");
    dibujarFirma(form.querySelector("#firmaCanvas"));
    form.dispatchEvent(new Event("submit", {cancelable: true, bubbles: true}));
    await hasta(() => app.raiz.querySelector("#consecutivoCreado"), "la tarjeta de solicitud creada");
    expect(app.raiz.querySelector("#consecutivoCreado").textContent).toBe("MTC-004");
    expect(app.raiz.textContent).toContain("Alberto Aprobador");
    expect((await app.repo.cargarRegistro("MTC-004")).stage).toBe(1);
  });
  it("faltan campos obligatorios: avisa y no crea nada", async () => {
    await ingresar(app, "calidad");
    await irA("Nuevo registro");
    const form = await hasta(() => app.raiz.querySelector("#formNuevo"), "el formulario");
    dibujarFirma(form.querySelector("#firmaCanvas")); form.elements.confirmaVeraz.checked = true;
    form.dispatchEvent(new Event("submit", {cancelable: true, bubbles: true}));
    await hasta(() => document.querySelector(".aviso-error"), "aviso de campos");
    expect((await app.repo.listarRegistros()).length).toBe(1);
  });
  it("una derogación muestra el 8D y el tipo «Otro» pide escribirlo", async () => {
    await ingresar(app, "calidad");
    await irA("Nuevo registro");
    const form = await hasta(() => app.raiz.querySelector("#formNuevo"), "el formulario");
    expect(app.raiz.querySelector("#d8Fieldset").style.display).toBe("none");
    escribir(form.elements.tipoGestion, "Derogación");
    expect(app.raiz.querySelector("#d8Fieldset").style.display).toBe("block");
    expect([...form.elements.criticidad.options].map(o => o.value)).toContain("Crítica");
    escribir(form.elements.tipoEspecifico, OTRO);
    expect(app.raiz.querySelector("#tipoOtroInput").style.display).toBe("block");
    escribir(form.elements.alcanceDerogacion[1], "Definitiva");
    form.elements.alcanceDerogacion[1].checked = true;
    form.elements.alcanceDerogacion[1].dispatchEvent(new Event("change", {bubbles: true}));
    expect(app.raiz.querySelector("#fechaEfectivaWrap").style.display).toBe("block");
  });
  it("guardar borrador no pide firma y se puede retomar", async () => {
    await ingresar(app, "calidad");
    await irA("Nuevo registro");
    const form = await hasta(() => app.raiz.querySelector("#formNuevo"), "el formulario");
    llenarFormulario(form, {proyecto: "Proyecto borrador"});
    clic(app.raiz.querySelector("#btnBorrador"));
    await hasta(() => location.hash.startsWith("#/nuevo/BOR-"), "pasar al borrador guardado");
    await hasta(() => app.raiz.querySelector("#formNuevo")?.elements.proyecto.value === "Proyecto borrador", "el formulario con lo guardado");
    expect(app.raiz.textContent).toContain("Avance guardado");
  });
});

describe("evaluar y firmar", () => {
  it("el Aprobador no puede firmar sin el concepto; con él, la solicitud pasa a Cierre", async () => {
    await ingresar(app, "aprobador");
    await irA("Registros");
    await detalle("MTC-001");
    expect(app.raiz.querySelector("#faltantesFirma").textContent).toContain("concepto de evaluación");
    dibujarFirma(app.raiz.querySelector("#firmaCanvas"));
    clic(app.raiz.querySelector("#btnFirmar"));
    await hasta(() => document.querySelector(".aviso-error"), "aviso de requisitos");
    expect(document.querySelector(".aviso-error").textContent).toContain("Antes de firmar complete");
    escribir(app.raiz.querySelector('[data-campo="conceptoEvaluacion"]'), "Se aprueba con condiciones");
    escribir(app.raiz.querySelector('[data-campo="controlesCompensatorios"]'), "Inspección cada hora");
    expect(app.raiz.querySelector("#faltantesFirma").textContent).toBe("");
    dibujarFirma(app.raiz.querySelector("#firmaCanvas"));
    clic(app.raiz.querySelector("#btnFirmar"));
    await hasta(async () => (await app.repo.cargarRegistro("MTC-001")).stage === 2, "pasar a Cierre").catch(() => {});
    await hasta(() => app.ctx.abierto?.rec.stage === 2, "ver la etapa de Cierre");
    const rec = await app.repo.cargarRegistro("MTC-001");
    expect(rec.conceptoEvaluacion).toBe("Se aprueba con condiciones");
    expect(rec.firmas.aprob.nombre).toBe("Alberto Aprobador");
  });
  it("cerrar: solo quien hizo la solicitud firma el cierre", async () => {
    await ingresar(app, "aprobador");
    await irA("Registros"); await detalle("MTC-002");
    expect(app.raiz.querySelector("#btnFirmar")).toBeNull();
    expect(app.raiz.textContent).toContain("La cierra Paula Producción");
    await cerrarDetalle(); await salir(app);
    await ingresar(app, "produccion");
    await irA("Registros"); await detalle("MTC-002");
    escribir(app.raiz.querySelector('[data-campo="observacionesCierre"]'), "Todo en orden");
    escribir(app.raiz.querySelector('[data-campo="cumplimientoControl"]'), "Sí");
    dibujarFirma(app.raiz.querySelector("#firmaCanvas"));
    clic(app.raiz.querySelector("#btnFirmar"));
    await hasta(() => app.ctx.abierto?.rec.cerrado, "cerrar la solicitud");
    expect(app.raiz.textContent).toContain("Solicitud cerrada");
    expect(app.raiz.querySelector("#btnPdf")).not.toBeNull();
  });
  it("el 8D incompleto de una derogación bloquea la aprobación", async () => {
    await ingresar(app, "aprobador");
    await irA("Registros"); await detalle("MTC-003");
    escribir(app.raiz.querySelector('[data-campo="conceptoEvaluacion"]'), "ok");
    escribir(app.raiz.querySelector('[data-campo="controlesCompensatorios"]'), "ok");
    expect(app.raiz.querySelector("#estado8D").textContent).toContain("8D incompleto");
    expect(app.raiz.querySelector("#faltantesFirma").textContent).toContain("reporte 8D completo");
  });
});

describe("devolver, reenviar y rechazar", () => {
  it("devolver exige motivo; el dueño corrige y reenvía con firma", async () => {
    await ingresar(app, "aprobador");
    await irA("Registros"); await detalle("MTC-001");
    clic(app.raiz.querySelector("#btnDevolver"));
    const dialogo = await hasta(() => document.querySelector(".modal"), "pedir el motivo");
    clic(dialogo.querySelector("[data-si]"));
    expect(dialogo.querySelector(".auth-msg").style.display).toBe("block");
    dialogo.querySelector("textarea").value = "Falta la evidencia fotográfica";
    clic(dialogo.querySelector("[data-si]"));
    await hasta(() => app.ctx.abierto?.rec.devuelta, "devolver la solicitud");
    await cerrarDetalle(); await salir(app);

    await ingresar(app, "calidad");
    await irA("Registros"); await detalle("MTC-001");
    expect(app.raiz.textContent).toContain("Falta la evidencia fotográfica");
    clic(app.raiz.querySelector("[data-corregir]"));
    const form = await hasta(() => app.raiz.querySelector("#formNuevo")?.elements.proyecto.value === "Proyecto de ejemplo" && app.raiz.querySelector("#formNuevo"), "el formulario con la solicitud devuelta");
    dibujarFirma(form.querySelector("#firmaCanvas")); form.elements.confirmaVeraz.checked = true;
    form.dispatchEvent(new Event("submit", {cancelable: true, bubbles: true}));
    await hasta(() => app.raiz.querySelector("#consecutivoCreado") || document.querySelector(".aviso-error"), "reenvío");
    expect(document.querySelector(".aviso-error")?.textContent).toBeUndefined();
    expect(app.raiz.querySelector("#consecutivoCreado").textContent).toBe("MTC-001");
    const rec = await app.repo.cargarRegistro("MTC-001");
    expect(rec).toMatchObject({devuelta: false, stage: 1});
    expect(rec.bitacora.some(b => b.comentario.includes("reenviada"))).toBe(true);
  });
  it("rechazar pide motivo y confirmación, y cierra la solicitud", async () => {
    await ingresar(app, "aprobador");
    await irA("Registros"); await detalle("MTC-001");
    escribir(app.raiz.querySelector("#comentarioEtapa"), "No procede por seguridad");
    clic(app.raiz.querySelector("#btnRechazar"));
    const dialogo = await hasta(() => document.querySelector(".modal"), "confirmación");
    clic(dialogo.querySelector("[data-si]"));
    await hasta(() => app.ctx.abierto?.rec.resultado === "Rechazada", "rechazar");
    expect(app.raiz.textContent).toContain("Solicitud rechazada");
  });
});

describe("administración y seguridad", () => {
  it("crear usuario muestra la tarjeta con la contraseña temporal y sin enlace local", async () => {
    await ingresar(app, "admin");
    await irA("Usuarios");
    const f = await hasta(() => app.raiz.querySelector("#formUsuario"), "formulario de usuarios");
    escribir(f.elements.nombre, "Elena Nueva"); escribir(f.elements.correo, "elena@ejemplo.test"); escribir(f.elements.rol, "Aprobador autorizado");
    f.dispatchEvent(new Event("submit", {cancelable: true, bubbles: true}));
    await hasta(() => app.raiz.querySelector("#claveTemporal"), "tarjeta de acceso");
    expect(app.raiz.querySelector("#claveTemporal").textContent.length).toBeGreaterThanOrEqual(8);
    expect(app.raiz.querySelector(".share-card").textContent).toContain("elena@ejemplo.test");
    expect(app.raiz.querySelector("#entradaEnlace").value).toBe("");
  });
  it("el enlace de acceso solo acepta https", async () => {
    await ingresar(app, "admin");
    await irA("Usuarios");
    escribir(app.raiz.querySelector("#entradaEnlace"), "javascript:alert(1)");
    app.raiz.querySelector("#formEnlace").dispatchEvent(new Event("submit", {cancelable: true, bubbles: true}));
    await hasta(() => document.querySelector(".aviso-error"), "rechazo del enlace");
    escribir(app.raiz.querySelector("#entradaEnlace"), "https://matec.pages.dev/");
    app.raiz.querySelector("#formEnlace").dispatchEvent(new Event("submit", {cancelable: true, bubbles: true}));
    await hasta(() => app.ctx.base.configuracion.enlace_acceso, "guardar el enlace");
    expect(app.ctx.base.configuracion.enlace_acceso.url).toBe("https://matec.pages.dev/");
  });
  it("eliminar un registro deja huella y se puede restaurar", async () => {
    await ingresar(app, "admin");
    await irA("Registros"); await detalle("MTC-001");
    clic(app.raiz.querySelector("#btnEliminar"));
    const dialogo = await hasta(() => document.querySelector(".modal"), "pedir motivo");
    dialogo.querySelector("textarea").value = "Registro de prueba duplicado";
    clic(dialogo.querySelector("[data-si]"));
    await hasta(() => app.ctx.eliminados.length === 1, "huella");
    await irA("Registros eliminados");
    await hasta(() => app.raiz.querySelector("[data-restaurar]"), "botón restaurar");
    expect(app.raiz.textContent).toContain("Registro de prueba duplicado");
    clic(app.raiz.querySelector("[data-restaurar]"));
    const confirmacion = await hasta(() => document.querySelector(".modal"), "confirmar restauración");
    clic(confirmacion.querySelector("[data-si]"));
    await hasta(() => app.ctx.registros.some(r => r.id === "MTC-001"), "registro restaurado");
  });
  it("un texto con código no se ejecuta: se muestra escapado", async () => {
    await ingresar(app, "calidad");
    const malo = '<img src=x onerror="window.__hackeado=1">';
    const rec = await app.repo.crearRegistro({data: {tipoGestion: "Desviación", area: "Calidad Producto", criticidad: "Menor", motivoDesviacion: malo, proyecto: malo, tipoEspecifico: malo}, firma: "data:image/png;base64,AAAA"});
    await app.ctx.recargar();
    await irA("Registros");
    await detalle(rec.id);
    expect(window.__hackeado).toBeUndefined();
    expect(app.raiz.querySelector("#panelBox img[src=x]")).toBeNull();
    expect(app.raiz.querySelector("#panelBox").textContent).toContain("<img src=x");
  });
  it("el detalle de otra área no se abre aunque se escriba la dirección", async () => {
    await ingresar(app, "produccion");
    location.hash = "#/registros/MTC-001";
    await app.ctx.rutear();
    expect(app.raiz.querySelector("#panelBox")).toBeNull();
  });
});
