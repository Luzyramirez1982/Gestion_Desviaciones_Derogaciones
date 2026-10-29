// Pruebas de la conversión de datos de la versión anterior al modelo nuevo.
// Además de revisar los resultados, se guardan en la base de pruebas para confirmar que
// cumplen todas las reglas (llaves, restricciones) y que se pueden ver y restaurar.
import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "node:fs";
import { iniciarBD } from "./ayuda_bd.js";
import { MIME_PERMITIDOS, nombreSeguro, parsearFechaEs, planificar } from "../src/migracion/v1a2.js";

import { exportacion, U_ADMIN, U_CARLOS, U_JUAN } from "./fixture_v1.js";

describe("fechas de la versión anterior", () => {
  it("lee el formato en español con sus espacios especiales", () => {
    expect(parsearFechaEs("28 oct 2026, 7:30 p. m.")).toBe("2026-10-29T00:30:00.000Z");
    expect(parsearFechaEs("28 oct 2026, 7:30 p. m.")).toBe("2026-10-29T00:30:00.000Z");
    expect(parsearFechaEs("1 ene 2026, 12:05 a. m.")).toBe("2026-01-01T05:05:00.000Z");
    expect(parsearFechaEs("15 sept 2026, 12:00 p. m.")).toBe("2026-09-15T17:00:00.000Z");
  });
  it("lo que no se entiende queda vacío en vez de inventar una fecha", () => {
    for(const malo of ["", null, "ayer", "32 xyz 2026, 1:00 a. m."]) expect(parsearFechaEs(malo)).toBeNull();
  });
});

describe("nombres de archivo", () => {
  it("quita tildes, espacios y símbolos, y conserva la extensión", () => {
    expect(nombreSeguro("Informe técnico ñandú.pdf")).toBe("Informe_tecnico_nandu.pdf");
    expect(nombreSeguro("../../etc/pass wd")).toBe("etc_pass_wd");
    expect(nombreSeguro("")).toBe("archivo");
    expect(nombreSeguro("a".repeat(300) + ".png").length).toBeLessThanOrEqual(92);
  });
  it("los tipos permitidos son los mismos que admite el bucket", () => {
    const sql = readFileSync(new URL("../supabase/migrations/0004_almacenamiento.sql", import.meta.url), "utf8");
    const bloque = sql.slice(sql.indexOf("array["), sql.indexOf("])", sql.indexOf("array[")));
    const enSql = [...bloque.matchAll(/'([^']+)'/g)].map(m => m[1]);
    expect([...MIME_PERMITIDOS].sort()).toEqual([...enSql].sort());
  });
});

describe("plan de migración", () => {
  const plan = planificar(exportacion, { ahora: "2026-10-29T12:00:00.000Z" });

  it("cuenta lo que se va a migrar", () => {
    expect(plan.resumen).toMatchObject({ registros: 2, omitidos: 1, eliminados: 1, personas: 3, sinCuenta: 1, tipos: 1, consecutivo: 9 });
  });
  it("el consecutivo continúa después del más alto, incluidos los eliminados", () => {
    expect(plan.consecutivo).toBe(9);
  });
  it("las personas sin cuenta de acceso se reportan aparte, con su rol ya actualizado", () => {
    expect(plan.sinCuenta).toEqual([{ nombre: "Sin Cuenta", correo: "sin@matec.com.co", rol: "Responsable del proceso", area: "Seguridad y Salud en el Trabajo" }]);
  });
  it("las áreas y los roles viejos se actualizan", () => {
    expect(plan.perfiles.find(p => p.nombre === "Juan").area).toBe("Calidad Producto");
    expect(plan.areas.map(a => a.nombre)).toEqual(["Calidad Producto", "Ingeniería mecánica", "Producción"]);
    expect(plan.tipos[0]).toEqual({ id: "t1", area: "Ingeniería mecánica", nombre: "Interferencia de piezas", data: { desc: "Detalle" } });
    expect(plan.config).toEqual([{ clave: "app", valor: { url: "https://matec.pages.dev" } }]);
  });
  it("el registro moderno se convierte completo", () => {
    const r = plan.registros[0];
    expect(r.fila).toMatchObject({ id: "MTC-001", tipo_gestion: "Desviación", area: "Calidad Producto", etapa: 2, cerrado: false,
      reportado_por_id: U_JUAN, vigencia_inicio: "2026-10-21", vigencia_fin: "2026-10-30", creado_en: "2026-10-21T00:30:00.000Z" });
    expect(r.fila.data.reportadoPorId).toBe(U_JUAN);
    for(const quitada of ["adjuntos", "firmas", "bitacora", "firmaSolicitante", "fechaCierre"]) expect(r.fila.data[quitada]).toBeUndefined();
    expect(r.bitacora).toHaveLength(2);
    expect(r.firmas.map(f => f.espacio)).toEqual(["sol", "aprob"]);
    expect(r.firmas[0]).toMatchObject({ usuario_id: U_JUAN, ruta_imagen: "firmas/migracion/MTC-001-sol.png", fecha: "2026-10-21T00:31:00.000Z" });
    expect(r.firmas[1].usuario_id).toBe(U_CARLOS);
  });
  it("solo se migran adjuntos con contenido y de un tipo permitido, con nombre seguro", () => {
    const adj = plan.registros[0].adjuntos;
    expect(adj).toHaveLength(1);
    expect(adj[0]).toMatchObject({ nombre: "Informe técnico ñandú.pdf", tipo: "application/pdf", ruta: "registros/MTC-001/1-Informe_tecnico_nandu.pdf", subido_por: "Juan" });
    expect(plan.avisos.join("\n")).toMatch(/programa\.exe.*tipo no permitido/);
    expect(plan.avisos.join("\n")).toMatch(/solo-nombre\.docx.*no tiene contenido/);
  });
  it("un registro de un modelo muy antiguo queda cerrado, en Cierre y con su fecha de cierre", () => {
    const r = plan.registros[1].fila;
    expect(r).toMatchObject({ id: "MTC-002", area: "Ingeniería mecánica", etapa: 2, cerrado: true, fecha_cierre: "2026-10-29T00:30:00.000Z" });
    expect(r.data.conceptoEvaluacion).toBe("Calidad: Bien\nSST: Bien");
    expect(plan.registros[1].firmas.map(f => f.espacio)).toEqual(["sol", "aprob"]);
  });
  it("un registro con una figura inválida se omite y se avisa", () => {
    expect(plan.registros.map(r => r.fila.id)).not.toContain("MTC-003");
    expect(plan.avisos.join("\n")).toMatch(/MTC-003.*no es válida.*Se omite/);
  });
  it("la huella conserva quién, cuándo y por qué, y avisa de lo que no se puede restaurar", () => {
    const h = plan.huellas[0].fila;
    expect(h).toMatchObject({ registro_id: "MTC-009", eliminado_por: "Natalia", eliminado_por_id: U_ADMIN, motivo: "Duplicado", restaurado: false, creado_en: "2026-10-25T15:00:00.000Z" });
    expect(plan.avisos.join("\n")).toMatch(/adjuntos de MTC-009 no se guardaron/);
  });
});

describe("el resultado se puede guardar y usar en la base nueva", () => {
  let como, q, db;
  const plan = planificar(exportacion, { ahora: "2026-10-29T12:00:00.000Z" });
  const poblar = (tabla, columnas, filas) =>
    q(`insert into ${tabla} (${columnas}) select ${columnas} from jsonb_populate_recordset(null::${tabla}, $1::jsonb)`, [JSON.stringify(filas)]);

  beforeAll(async () => {
    ({ db, como, q } = await iniciarBD());
    // Se quitan las personas de ejemplo (la protección del último Administrador se apaga solo mientras se prepara).
    await db.exec(`alter table perfiles disable trigger perfiles_proteger_admin_trg;
      delete from perfiles; delete from auth.users;
      alter table perfiles enable trigger perfiles_proteger_admin_trg;`);
    for(const p of plan.perfiles) await q("insert into auth.users (id, email) values ($1, $2)", [p.id, p.correo]);
    await poblar("perfiles", "id, nombre, correo, rol, area, activo, debe_cambiar_clave", plan.perfiles);
    await poblar("areas", "nombre, orden", plan.areas);
    await poblar("tipos", "id, area, nombre, data", plan.tipos);
    await q("insert into registros select * from jsonb_populate_recordset(null::registros, $1::jsonb)", [JSON.stringify(plan.registros.map(r => r.fila))]);
    await poblar("bitacora", "registro_id, etapa, rol, usuario, fecha, comentario, creado_en", plan.registros.flatMap(r => r.bitacora));
    await poblar("firmas", "registro_id, espacio, usuario_id, nombre, rol, ruta_imagen, fecha", plan.registros.flatMap(r => r.firmas));
    await poblar("adjuntos", "registro_id, nombre, tipo, tamano, ruta, subido_por, creado_en", plan.registros.flatMap(r => r.adjuntos));
    await poblar("auditoria_eliminados", "registro_id, eliminado_por_id, eliminado_por, correo, rol, motivo, copia, restaurado, creado_en", plan.huellas.map(h => h.fila));
    await q("select setval('registros_consecutivo', $1)", [plan.consecutivo]);
  });

  it("todo cumple las restricciones y cada persona ve lo suyo", async () => {
    expect(await como(U_ADMIN, () => q("select id from registros order by id"))).toEqual([{ id: "MTC-001" }, { id: "MTC-002" }]);
    expect(await como(U_JUAN, () => q("select id from registros order by id"))).toHaveLength(2);
    expect(await como(U_ADMIN, () => q("select count(*)::int as n from bitacora"))).toEqual([{ n: 2 }]);
  });
  it("el siguiente consecutivo continúa después del último, aunque ese haya sido eliminado", async () => {
    const [{ id }] = await como(U_JUAN, () => q("select * from crear_registro($1::jsonb, false, $2)",
      [JSON.stringify({ tipoGestion: "Desviación", area: "Calidad Producto" }), `firmas/${U_JUAN}/f.png`]));
    expect(id).toBe("MTC-010");
  });
  it("un registro eliminado en la versión anterior se puede restaurar", async () => {
    const [{ id: huella }] = await como(U_ADMIN, () => q("select id from auditoria_eliminados where registro_id = 'MTC-009'"));
    const [r] = await como(U_ADMIN, () => q("select * from restaurar_registro($1)", [huella]));
    expect(r).toMatchObject({ id: "MTC-009", tipo_gestion: "Derogación", etapa: 1 });
    expect(await q("select espacio from firmas where registro_id = 'MTC-009'")).toEqual([{ espacio: "sol" }]);
  });
  it("las personas ven el conteo correcto de la huella", async () => {
    expect(await como(U_ADMIN, () => q("select restaurado from auditoria_eliminados"))).toEqual([{ restaurado: true }]);
  });
});
