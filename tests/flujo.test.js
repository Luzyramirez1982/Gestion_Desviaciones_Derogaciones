// Pruebas del flujo del procedimiento dentro de la base de datos: firmar, avanzar de etapa,
// devolver, rechazar, retroceder, restaurar, adjuntos y áreas.
import { describe, it, expect, beforeAll } from "vitest";
import { iniciarBD, ADMIN, RESP_CALIDAD, RESP_PRODUCCION, APROBADOR, FIRMA, solicitud, derogacion } from "./ayuda_bd.js";
import { d8Faltantes, emptyD8 } from "../src/dominio/d8.js";
import { validarVigencia } from "../src/dominio/registro.js";

let db, como, q, crear;
beforeAll(async () => { ({ db, como, q, crear } = await iniciarBD()); });

const uno = (texto, params) => q(texto, params).then(r => r[0]);
const rpc = (quien, fn, ...args) =>
  como(quien, () => uno(`select * from ${fn}(${args.map((_, i) => "$" + (i + 1)).join(", ")})`, args));
const firmar = (quien, id, espacio, comentario = "") => rpc(quien, "firmar_etapa", id, espacio, FIRMA, comentario);
const guardar = (quien, reg, cambios) =>
  como(quien, () => uno("select * from guardar_registro($1, $2, $3::jsonb)", [reg.id, reg.version, JSON.stringify({ ...reg.data, ...cambios })]));
const leer = (id) => uno("select * from registros where id = $1", [id]);
const firmasDe = (id) => q("select espacio from firmas where registro_id = $1 order by espacio", [id]).then(r => r.map(f => f.espacio));
const bitacoraDe = (id) => q("select comentario, etapa from bitacora where registro_id = $1 order by id", [id]);

function d8Completo(){
  const d = emptyD8();
  ["d1", "d4", "d6", "d7", "d8"].forEach(k => d[k] = "x");
  Object.keys(d.w2h).forEach(k => d.w2h[k] = "x");
  d.whys = ["a", "b", "c", "", ""];
  d.contencion = [{ accion: "a", puntoControl: "b", fecha: "2026-10-01", responsable: "c" }];
  d.correctivas = [{ causa: "a", accion: "b", fecha: "2026-10-01", responsable: "c" }];
  return d;
}

// Lleva una desviación hasta Cierre lista para firmar.
async function hastaCierre(extra = {}){
  let r = await como(RESP_CALIDAD, () => crear(solicitud(extra)));
  r = await guardar(APROBADOR, r, { conceptoEvaluacion: "Se aprueba", controlesCompensatorios: "Inspección al 100 %" });
  await firmar(APROBADOR, r.id, "aprob");
  return leer(r.id);
}

describe("flujo completo de una desviación", () => {
  let reg;
  it("el Aprobador no puede firmar sin concepto ni medidas de control", async () => {
    reg = await como(RESP_CALIDAD, () => crear(solicitud()));
    await expect(firmar(APROBADOR, reg.id, "aprob")).rejects.toThrow(/Antes de firmar complete: concepto de evaluación; medidas de control/);
  });
  it("el Responsable no puede llenar la evaluación: lo que escriba se ignora", async () => {
    reg = await guardar(RESP_CALIDAD, reg, { conceptoEvaluacion: "Me lo apruebo yo", controlesCompensatorios: "ninguno" });
    expect(reg.data.conceptoEvaluacion).toBeUndefined();
    expect(reg.data.controlesCompensatorios).toBeUndefined();
  });
  it("el Aprobador llena la evaluación y firma: pasa a Cierre", async () => {
    reg = await guardar(APROBADOR, reg, { conceptoEvaluacion: "Se aprueba", controlesCompensatorios: "Inspección al 100 %" });
    expect(reg.data.conceptoEvaluacion).toBe("Se aprueba");
    reg = await firmar(APROBADOR, reg.id, "aprob", "Todo en orden");
    expect(reg.etapa).toBe(2);
    expect(reg.data.stage).toBe(2);
    const bit = await bitacoraDe(reg.id);
    expect(bit.at(-1)).toEqual({ comentario: "Evaluó la solicitud, la aprobó y firmó. Todo en orden", etapa: "Evaluación y Aprobación" });
    expect(await firmasDe(reg.id)).toEqual(["aprob", "sol"]);
  });
  it("el Aprobador ya no puede firmar de nuevo ni firmar el cierre", async () => {
    await expect(firmar(APROBADOR, reg.id, "aprob")).rejects.toThrow(/solo en la etapa/);
    await expect(firmar(APROBADOR, reg.id, "cierre")).rejects.toThrow(/El cierre lo firma quien hizo la solicitud/);
  });
  it("las observaciones de cierre las llena solo quien hizo la solicitud", async () => {
    const intento = await guardar(APROBADOR, await leer(reg.id), { observacionesCierre: "yo cierro" });
    expect(intento.data.observacionesCierre).toBeUndefined();
    await expect(firmar(RESP_CALIDAD, reg.id, "cierre")).rejects.toThrow(/observaciones de cierre; cumplimiento de controles/);
    reg = await guardar(RESP_CALIDAD, await leer(reg.id), { observacionesCierre: "Cerrado sin novedad", cumplimientoControl: "Cumplió" });
    expect(reg.data.observacionesCierre).toBe("Cerrado sin novedad");
  });
  it("otro Responsable ni siquiera ve la solicitud; el Administrador no puede cerrarla por él", async () => {
    await expect(firmar(RESP_PRODUCCION, reg.id, "cierre")).rejects.toThrow(/No se encontró/);
    await expect(firmar(ADMIN, reg.id, "cierre")).rejects.toThrow(/El cierre lo firma quien hizo la solicitud/);
  });
  it("quien hizo la solicitud la cierra con su firma", async () => {
    reg = await firmar(RESP_CALIDAD, reg.id, "cierre");
    expect(reg.cerrado).toBe(true);
    expect(reg.fecha_cierre).toBeTruthy();
    expect(await firmasDe(reg.id)).toEqual(["aprob", "cierre", "sol"]);
  });
  it("cerrada, ya no se edita ni se firma, pero el Administrador puede dar su visto bueno", async () => {
    await expect(guardar(RESP_CALIDAD, await leer(reg.id), { descripcion: "tarde" })).rejects.toThrow(/cerrado/);
    await expect(firmar(RESP_CALIDAD, reg.id, "cierre")).rejects.toThrow(/ya no admite firmas/);
    await firmar(ADMIN, reg.id, "admin", "Visto bueno");
    expect(await firmasDe(reg.id)).toContain("admin");
    await como(ADMIN, () => q("select quitar_firma_admin($1)", [reg.id]));
    expect(await firmasDe(reg.id)).not.toContain("admin");
  });
  it("no se puede firmar sin dibujar la firma ni en un espacio que no existe", async () => {
    const r = await como(RESP_CALIDAD, () => crear(solicitud()));
    await expect(rpc(APROBADOR, "firmar_etapa", r.id, "aprob", "", "")).rejects.toThrow(/Dibuje su firma/);
    await expect(firmar(APROBADOR, r.id, "sol")).rejects.toThrow(/no se firma aquí/);
  });
  it("el Responsable no puede firmar la evaluación", async () => {
    const r = await como(RESP_CALIDAD, () => crear(solicitud()));
    await expect(firmar(RESP_CALIDAD, r.id, "aprob")).rejects.toThrow(/Solo el Aprobador/);
    await expect(firmar(ADMIN, r.id, "aprob")).rejects.toThrow(/Solo el Aprobador/);
  });
});

describe("derogación: exige el 8D completo", () => {
  it("no se aprueba con el 8D incompleto y sí cuando está completo", async () => {
    let r = await como(RESP_CALIDAD, () => crear(derogacion({ d8: emptyD8() })));
    r = await guardar(APROBADOR, r, { conceptoEvaluacion: "ok", controlesCompensatorios: "ok" });
    await expect(firmar(APROBADOR, r.id, "aprob")).rejects.toThrow(/reporte 8D completo/);
    r = await guardar(APROBADOR, r, { d8: d8Completo() });
    r = await firmar(APROBADOR, r.id, "aprob");
    expect(r.etapa).toBe(2);
  });
});

describe("las reglas de la base de datos dicen lo mismo que las de la pantalla", () => {
  const sqlD8 = (d) => uno("select d8_faltantes($1::jsonb) as f", [JSON.stringify(d)]).then(r => r.f);

  it("d8_faltantes coincide con d8Faltantes en distintos casos", async () => {
    const vacio = emptyD8();
    const completo = d8Completo();
    const medias = d8Completo();
    medias.contencion.push({ accion: "solo acción", puntoControl: "", fecha: "", responsable: "" });
    medias.correctivas.push({ causa: "", accion: "x", fecha: "", responsable: "r" });
    const sinPorques = d8Completo(); sinPorques.whys = ["a", "", "c", "", ""];
    const sinW2h = d8Completo(); sinW2h.w2h.where = "  "; sinW2h.w2h.howMuch = "";
    const sinCampos = d8Completo(); sinCampos.d1 = ""; sinCampos.d7 = "\n ";
    const unaVacia = d8Completo(); unaVacia.contencion = [{ accion: "", puntoControl: "", fecha: "", responsable: "" }, ...unaVacia.contencion];
    for(const caso of [vacio, completo, medias, sinPorques, sinW2h, sinCampos, unaVacia]){
      expect(await sqlD8(caso)).toEqual(d8Faltantes(caso));
    }
  });

  it("validar_vigencia coincide con validarVigencia en distintos casos", async () => {
    const casos = [
      { tipoGestion: "Desviación" },
      { tipoGestion: "Desviación", vigenciaInicio: "2026-10-10", vigenciaFin: "2026-10-01" },
      { tipoGestion: "Desviación", vigenciaInicio: "2026-10-01", vigenciaFin: "2026-10-10" },
      { tipoGestion: "Derogación", alcanceDerogacion: "Temporal" },
      { tipoGestion: "Derogación", alcanceDerogacion: "Temporal", vigenciaInicio: "2026-10-10", vigenciaFin: "2026-10-01" },
      { tipoGestion: "Derogación", alcanceDerogacion: "Temporal", vigenciaInicio: "2026-10-01", vigenciaFin: "2026-10-10" },
      { tipoGestion: "Derogación", alcanceDerogacion: "Definitiva" },
      { tipoGestion: "Derogación", alcanceDerogacion: "Definitiva", fechaEfectiva: "2026-11-01" },
      { tipoGestion: "Desviación", temaOtro: true, tema: "" },
      { tipoGestion: "Desviación", temaOtro: true, tema: "Otro tema" },
      { tipoGestion: "Desviación", tipoEspecificoOtro: true, tipoEspecifico: "" },
    ];
    for(const caso of casos){
      const sql = await uno("select validar_vigencia($1::jsonb) as v", [JSON.stringify(caso)]).then(r => r.v);
      expect(sql).toBe(validarVigencia(caso));
    }
  });
});

describe("enviar un borrador y reenviar tras una devolución", () => {
  it("un borrador recibe su consecutivo al enviarse y queda firmado", async () => {
    const b = await como(RESP_CALIDAD, () => crear(solicitud(), true));
    expect(b.id).toMatch(/^BOR-/);
    const r = await rpc(RESP_CALIDAD, "enviar_registro", b.id, b.version, JSON.stringify({ ...b.data, descripcion: "Final" }), FIRMA);
    expect(r.id).toMatch(/^MTC-\d{3}$/);
    expect(r.etapa).toBe(1);
    expect(r.borrador).toBe(false);
    expect(r.data.descripcion).toBe("Final");
    expect(await leer(b.id)).toBeUndefined();
    expect(await firmasDe(r.id)).toEqual(["sol"]);
    expect((await bitacoraDe(r.id)).map(x => x.comentario)).toEqual(["Solicitud creada y firmada."]);
  });
  it("solo quien lo escribió lo puede enviar, y con la versión al día", async () => {
    const b = await como(RESP_CALIDAD, () => crear(solicitud(), true));
    await expect(rpc(RESP_PRODUCCION, "enviar_registro", b.id, b.version, JSON.stringify(b.data), FIRMA)).rejects.toThrow(/No se encontró/);
    await expect(rpc(RESP_CALIDAD, "enviar_registro", b.id, b.version + 5, JSON.stringify(b.data), FIRMA)).rejects.toThrow(/conflicto_version/);
    await expect(rpc(RESP_CALIDAD, "enviar_registro", b.id, b.version, JSON.stringify(b.data), "")).rejects.toThrow(/Dibuje su firma/);
  });
  it("no se envía con fechas inválidas", async () => {
    const b = await como(RESP_CALIDAD, () => crear(derogacion({ vigenciaFin: "" }), true));
    await expect(rpc(RESP_CALIDAD, "enviar_registro", b.id, b.version, JSON.stringify(b.data), FIRMA)).rejects.toThrow(/rango de fechas/);
  });
  it("devolver exige motivo y rol; anula firmas; se reenvía con la misma numeración", async () => {
    const r0 = await hastaCierre();     // llevada a Cierre; necesitamos una en Evaluación
    const r = await como(RESP_CALIDAD, () => crear(solicitud()));
    await expect(rpc(APROBADOR, "devolver_registro", r.id, "  ")).rejects.toThrow(/motivo/);
    await expect(rpc(RESP_CALIDAD, "devolver_registro", r.id, "No me gusta")).rejects.toThrow(/Solo el Aprobador/);
    await expect(rpc(APROBADOR, "devolver_registro", r0.id, "Ya está en cierre")).rejects.toThrow(/no está en la etapa/);

    const dev = await rpc(APROBADOR, "devolver_registro", r.id, "Falta detallar el riesgo");
    expect(dev.etapa).toBe(0);
    expect(dev.devuelta).toBe(true);
    expect(dev.borrador).toBe(true);
    expect(dev.data.motivoDevolucion).toBe("Falta detallar el riesgo");
    expect(await firmasDe(r.id)).toEqual([]);

    // el dueño, el Aprobador y el Administrador ven la devuelta; otra área no
    for(const quien of [RESP_CALIDAD, APROBADOR, ADMIN]) expect(await como(quien, () => q("select id from registros where id = $1", [r.id]))).toHaveLength(1);
    expect(await como(RESP_PRODUCCION, () => q("select id from registros where id = $1", [r.id]))).toHaveLength(0);

    const re = await rpc(RESP_CALIDAD, "enviar_registro", dev.id, dev.version, JSON.stringify({ ...dev.data, descripcion: "Con riesgo" }), FIRMA);
    expect(re.id).toBe(r.id);
    expect(re.etapa).toBe(1);
    expect(re.devuelta).toBe(false);
    expect(await firmasDe(r.id)).toEqual(["sol"]);
    const textos = (await bitacoraDe(r.id)).map(b => b.comentario);
    expect(textos).toContain("Devuelta al Responsable del proceso para ajustes: Falta detallar el riesgo");
    expect(textos.at(-1)).toBe("Solicitud ajustada y reenviada con firma.");
  });
});

describe("rechazar y retroceder", () => {
  it("el Aprobador rechaza con motivo y la solicitud queda cerrada como Rechazada", async () => {
    const r = await como(RESP_CALIDAD, () => crear(solicitud()));
    await expect(rpc(APROBADOR, "rechazar_registro", r.id, "")).rejects.toThrow(/motivo/);
    await expect(rpc(RESP_CALIDAD, "rechazar_registro", r.id, "Yo mismo")).rejects.toThrow(/Solo el Aprobador/);
    const rech = await rpc(APROBADOR, "rechazar_registro", r.id, "No cumple el procedimiento");
    expect(rech.resultado).toBe("Rechazada");
    expect(rech.cerrado).toBe(true);
    expect(rech.data.resultado).toBe("Rechazada");
    await expect(firmar(APROBADOR, r.id, "aprob")).rejects.toThrow(/ya no admite firmas/);
    await expect(rpc(APROBADOR, "rechazar_registro", r.id, "otra vez")).rejects.toThrow(/no está en la etapa/);
  });
  it("solo el Administrador retrocede de Cierre a Evaluación, y se anulan las firmas", async () => {
    const r = await hastaCierre();
    await expect(rpc(RESP_CALIDAD, "retroceder_etapa", r.id, "x")).rejects.toThrow(/Solo el Administrador/);
    await expect(rpc(APROBADOR, "retroceder_etapa", r.id, "x")).rejects.toThrow(/Solo el Administrador/);
    const atras = await rpc(ADMIN, "retroceder_etapa", r.id, "Se debe corregir el concepto.");
    expect(atras.etapa).toBe(1);
    expect(await firmasDe(r.id)).toEqual(["sol"]);
    expect((await bitacoraDe(r.id)).at(-1).comentario).toMatch(/Se debe corregir el concepto\. Se anulan las firmas/);
    await expect(rpc(ADMIN, "retroceder_etapa", r.id, "x")).rejects.toThrow(/Solo se puede retroceder/);
  });
});

describe("convertir y ajustar derogaciones", () => {
  it("solo Aprobador o Administrador convierten una desviación en derogación, y entonces exige 8D", async () => {
    let r = await como(RESP_CALIDAD, () => crear(solicitud({ recurrente: true })));
    await expect(rpc(RESP_CALIDAD, "convertir_a_derogacion", r.id)).rejects.toThrow(/Solo el Aprobador/);
    r = await rpc(APROBADOR, "convertir_a_derogacion", r.id);
    expect(r.tipo_gestion).toBe("Derogación");
    expect(r.data.tipoGestion).toBe("Derogación");
    r = await guardar(APROBADOR, r, { conceptoEvaluacion: "ok", controlesCompensatorios: "ok" });
    await expect(firmar(APROBADOR, r.id, "aprob")).rejects.toThrow(/reporte 8D completo/);
    await expect(rpc(APROBADOR, "convertir_a_derogacion", r.id)).rejects.toThrow(/Solo se puede convertir una desviación/);
  });
  it("el alcance se ajusta con las mismas validaciones y queda en la bitácora", async () => {
    const r = await como(RESP_CALIDAD, () => crear(derogacion()));
    await expect(rpc(RESP_PRODUCCION, "ajustar_alcance_derogacion", r.id, "Definitiva", "2026-12-01", "")).rejects.toThrow(/No se encontró/);
    await expect(rpc(RESP_CALIDAD, "ajustar_alcance_derogacion", r.id, "Definitiva", "", "")).rejects.toThrow(/fecha a partir de la cual/);
    await expect(rpc(RESP_CALIDAD, "ajustar_alcance_derogacion", r.id, "Temporal", "2026-12-10", "2026-12-01")).rejects.toThrow(/no puede ser anterior/);
    const a = await rpc(RESP_CALIDAD, "ajustar_alcance_derogacion", r.id, "Definitiva", "2026-12-01", "");
    expect(a.data.alcanceDerogacion).toBe("Definitiva");
    expect(a.data.fechaEfectiva).toBe("2026-12-01");
    expect(a.vigencia_fin).toBeNull();
    expect((await bitacoraDe(r.id)).at(-1).comentario).toBe(
      "Alcance de la derogación ajustado: Temporal — del 2026-11-01 a 2026-11-30 → Definitiva — efectiva de forma permanente desde 2026-12-01.");
    const d = await como(RESP_CALIDAD, () => crear(solicitud()));
    await expect(rpc(RESP_CALIDAD, "ajustar_alcance_derogacion", d.id, "Temporal", "2026-12-01", "2026-12-02")).rejects.toThrow(/solo se ajusta en una derogación/);
  });
});

describe("restaurar un registro eliminado", () => {
  it("vuelve con su bitácora, firmas y adjuntos, y deja constancia", async () => {
    const r = await hastaCierre({ descripcion: "Para restaurar" });
    await rpc(RESP_CALIDAD, "registrar_adjunto", r.id, "evidencia.pdf", "application/pdf", 1234, "registros/" + r.id + "/evidencia.pdf");
    const antes = await bitacoraDe(r.id);
    await como(ADMIN, () => q("select eliminar_registro($1, $2)", [r.id, "Se creó por error"]));
    expect(await leer(r.id)).toBeUndefined();
    const huella = await como(ADMIN, () => uno("select id from auditoria_eliminados where registro_id = $1", [r.id]));

    await expect(rpc(RESP_CALIDAD, "restaurar_registro", huella.id)).rejects.toThrow(/Solo el Administrador/);
    const vuelta = await rpc(ADMIN, "restaurar_registro", huella.id);
    expect(vuelta.id).toBe(r.id);
    expect(vuelta.data.descripcion).toBe("Para restaurar");
    expect(vuelta.etapa).toBe(2);
    expect(await firmasDe(r.id)).toEqual(["aprob", "sol"]);
    expect(await q("select nombre from adjuntos where registro_id = $1", [r.id])).toEqual([{ nombre: "evidencia.pdf" }]);
    const despues = await bitacoraDe(r.id);
    expect(despues.slice(0, antes.length).map(b => b.comentario)).toEqual(antes.map(b => b.comentario));
    expect(despues.at(-1).comentario).toMatch(/^Registro restaurado por Natalia\. Había sido eliminado por Natalia el .+\(motivo: Se creó por error\)\.$/);

    const marca = await como(ADMIN, () => uno("select restaurado, restaurado_por from auditoria_eliminados where id = $1", [huella.id]));
    expect(marca).toEqual({ restaurado: true, restaurado_por: "Natalia" });
    await expect(rpc(ADMIN, "restaurar_registro", huella.id)).rejects.toThrow(/ya fue restaurado/);
  });
});

describe("archivos adjuntos", () => {
  let r;
  beforeAll(async () => { r = await como(RESP_CALIDAD, () => crear(solicitud())); });
  const adjuntar = (quien, id, nombre, tam, ruta) => rpc(quien, "registrar_adjunto", id, nombre, "application/pdf", tam, ruta);

  it("registra el archivo y lo deja en la bitácora", async () => {
    const a = await adjuntar(RESP_CALIDAD, r.id, "foto.png", 2048, "registros/" + r.id + "/foto.png");
    expect(a.subido_por).toBe("Juan");
    expect((await bitacoraDe(r.id)).at(-1).comentario).toBe("Adjuntó el archivo foto.png.");
  });
  it("rechaza archivos de más de 5 MB o sin tamaño", async () => {
    await expect(adjuntar(RESP_CALIDAD, r.id, "grande.pdf", 5 * 1048576 + 1, "registros/" + r.id + "/grande.pdf")).rejects.toThrow(/5 MB/);
    await expect(adjuntar(RESP_CALIDAD, r.id, "vacio.pdf", 0, "registros/" + r.id + "/vacio.pdf")).rejects.toThrow(/5 MB/);
  });
  it("rechaza rutas que se salgan de la carpeta de registros", async () => {
    for(const ruta of ["../secreto.pdf", "registros/../firmas/x.png", "otra/carpeta/x.pdf", "registros/" + r.id + "/../x.pdf", "https://malo.com/x.pdf"]){
      await expect(adjuntar(RESP_CALIDAD, r.id, "x.pdf", 10, ruta)).rejects.toThrow(/ruta del archivo no es válida/);
    }
  });
  it("no se adjunta a un registro que la persona no ve, ni a uno cerrado", async () => {
    await expect(adjuntar(RESP_PRODUCCION, r.id, "x.pdf", 10, "registros/" + r.id + "/x.pdf")).rejects.toThrow(/No se encontró/);
    const c = await hastaCierre();
    await db.query("update registros set cerrado = true where id = $1", [c.id]);
    await expect(adjuntar(RESP_CALIDAD, c.id, "x.pdf", 10, "registros/" + c.id + "/x.pdf")).rejects.toThrow(/cerrado/);
  });
  it("tiene un máximo de 50 archivos por registro", async () => {
    const m = await como(RESP_CALIDAD, () => crear(solicitud()));
    for(let i = 0; i < 50; i++) await adjuntar(RESP_CALIDAD, m.id, `a${i}.pdf`, 10, `registros/${m.id}/a${i}.pdf`);
    await expect(adjuntar(RESP_CALIDAD, m.id, "a50.pdf", 10, `registros/${m.id}/a50.pdf`)).rejects.toThrow(/máximo de 50/);
  });
});

describe("áreas", () => {
  it("renombrar cambia el área en registros, personas y tipos", async () => {
    await como(ADMIN, () => q("insert into areas (nombre) values ('Calidad Producto'), ('Producción')"));
    await como(ADMIN, () => q("insert into tipos (id, area, nombre) values ('t1', 'Calidad Producto', 'Un tipo')"));
    const r = await como(RESP_CALIDAD, () => crear(solicitud({ tema: "Calidad Producto" })));
    await expect(rpc(RESP_CALIDAD, "renombrar_area", "Calidad Producto", "X")).rejects.toThrow(/Solo el Administrador/);
    await expect(rpc(ADMIN, "renombrar_area", "Calidad Producto", "producción")).rejects.toThrow(/Ya existe un área/);
    await expect(rpc(ADMIN, "renombrar_area", "Calidad Producto", "   ")).rejects.toThrow(/vacío/);
    await expect(rpc(ADMIN, "renombrar_area", "No existe", "Nueva")).rejects.toThrow(/No existe esa área/);
    await como(ADMIN, () => q("select renombrar_area($1, $2)", ["Calidad Producto", "Calidad de Producto"]));

    const reg = await leer(r.id);
    expect(reg.area).toBe("Calidad de Producto");
    expect(reg.data.area).toBe("Calidad de Producto");
    expect(reg.data.tema).toBe("Calidad de Producto");
    expect((await uno("select area from perfiles where id = $1", [RESP_CALIDAD])).area).toBe("Calidad de Producto");
    expect((await uno("select area from tipos where id = 't1'")).area).toBe("Calidad de Producto");
    // la persona sigue viendo los registros de su área con el nombre nuevo
    expect(await como(RESP_CALIDAD, () => q("select id from registros where id = $1", [r.id]))).toHaveLength(1);
  });
  it("no se elimina un área que tiene registros o personas", async () => {
    await expect(como(ADMIN, () => q("delete from areas where nombre = 'Calidad de Producto'"))).rejects.toThrow(/No se puede eliminar un área/);
    await como(ADMIN, () => q("insert into areas (nombre) values ('Vacía')"));
    await como(ADMIN, () => q("delete from areas where nombre = 'Vacía'"));
  });
});

describe("protecciones", () => {
  it("las funciones internas no se pueden llamar desde la aplicación", async () => {
    for(const llamada of ["select siguiente_consecutivo()", "select anotar('MTC-001', 'texto falso')", "select d8_faltantes('{}'::jsonb)",
                          "select texto_lleno('x')", "select validar_vigencia('{}'::jsonb)"]){
      await expect(como(RESP_CALIDAD, () => q(llamada))).rejects.toThrow(/permission denied/);
    }
  });
  it("no se puede dejar la aplicación sin Administrador", async () => {
    await expect(como(ADMIN, () => q("update perfiles set activo = false where id = $1", [ADMIN]))).rejects.toThrow(/al menos un Administrador/);
    await expect(como(ADMIN, () => q("update perfiles set rol = 'Aprobador autorizado' where id = $1", [ADMIN]))).rejects.toThrow(/al menos un Administrador/);
    await expect(q("delete from perfiles where id = $1", [ADMIN])).rejects.toThrow(/al menos un Administrador/);
  });
  it("con otro Administrador activo, sí se puede cambiar el rol", async () => {
    const OTRO = "00000000-0000-0000-0000-0000000000aa";
    await db.query("insert into auth.users (id, email) values ($1, 'otro@x.co')", [OTRO]);
    await db.query("insert into perfiles (id, nombre, correo, rol) values ($1, 'Otro', 'otro@x.co', 'Administrador')", [OTRO]);
    await como(ADMIN, () => q("update perfiles set rol = 'Aprobador autorizado' where id = $1", [OTRO]));
    expect((await uno("select rol from perfiles where id = $1", [OTRO])).rol).toBe("Aprobador autorizado");
  });
  it("el Administrador cambia nombre, rol, área y estado, pero no el correo", async () => {
    await como(ADMIN, () => q("update perfiles set nombre = 'Juan J.', area = 'Calidad de Producto' where id = $1", [RESP_CALIDAD]));
    await expect(como(ADMIN, () => q("update perfiles set correo = 'robado@x.co' where id = $1", [RESP_CALIDAD]))).rejects.toThrow(/permission denied/);
    await expect(como(ADMIN, () => q("update perfiles set id = $1 where id = $2", [RESP_PRODUCCION, RESP_CALIDAD]))).rejects.toThrow(/permission denied/);
  });
  it("rechaza contenido enorme que llenaría la base de datos", async () => {
    const enorme = { ...solicitud(), relleno: "x".repeat(300000) };
    await expect(como(RESP_CALIDAD, () => crear(enorme))).rejects.toThrow(/demasiado grande/);
    const r = await como(RESP_CALIDAD, () => crear(solicitud()));
    await expect(guardar(RESP_CALIDAD, r, { relleno: "x".repeat(300000) })).rejects.toThrow(/demasiado grande/);
  });
  it("ya enviada, la solicitud no cambia de figura ni de área desde el guardado normal", async () => {
    let r = await como(RESP_CALIDAD, () => crear(solicitud()));
    r = await guardar(RESP_CALIDAD, r, { tipoGestion: "Derogación", area: "Producción" });
    expect(r.tipo_gestion).toBe("Desviación");
    expect(r.area).toBe("Calidad Producto");
    expect(r.data.tipoGestion).toBe("Desviación");
  });
  it("un borrador sí puede cambiar de figura y de área mientras se escribe", async () => {
    let b = await como(RESP_CALIDAD, () => crear(solicitud(), true));
    b = await guardar(RESP_CALIDAD, b, { tipoGestion: "Derogación", area: "Producción" });
    expect(b.tipo_gestion).toBe("Derogación");
    expect(b.area).toBe("Producción");
  });
});
