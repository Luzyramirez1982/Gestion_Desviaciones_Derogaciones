// Lecturas completas en una sola consulta (db/migraciones/0007): la solicitud llega con sus firmas, adjuntos y bitácora,
// y cada persona solo recibe lo que puede ver.
import { describe, it, expect, beforeAll } from "vitest";
import { iniciarBD, ADMIN, RESP_CALIDAD, RESP_PRODUCCION, APROBADOR, solicitud, firmaDe } from "./ayuda_bd.js";

let db, como, q, crear, archivoGuardado, r1, r2, borrador;
beforeAll(async () => {
  ({ db, como, q, crear, archivoGuardado } = await iniciarBD());
  r1 = await como(RESP_CALIDAD, () => crear(solicitud()));
  await archivoGuardado(`registros/${r1.id}/a.pdf`, 500);
  await como(RESP_CALIDAD, () => q("select * from registrar_adjunto($1, 'a.pdf', 'application/pdf', 500, $2)", [r1.id, `registros/${r1.id}/a.pdf`]));
  r2 = await como(RESP_PRODUCCION, () => crear(solicitud({ area: "Producción" })));
  borrador = await como(RESP_CALIDAD, () => crear(solicitud(), true));
});

const completo = (quien, id) => como(quien, () => q("select registro_completo($1) as r", [id])).then(r => r[0].r);
const pagina = (quien, desde, cantidad) => como(quien, () => q("select listar_registros($1, $2) as r", [desde, cantidad])).then(r => r[0].r);

describe("registro_completo", () => {
  it("trae la solicitud con sus firmas, adjuntos y bitácora en una sola respuesta", async () => {
    const x = await completo(RESP_CALIDAD, r1.id);
    expect(x.registro).toMatchObject({ id: r1.id, area: "Calidad Producto", etapa: 1 });
    expect(x.firmas).toHaveLength(1);
    expect(x.firmas[0]).toMatchObject({ espacio: "sol", ruta_imagen: firmaDe(RESP_CALIDAD) });
    expect(x.adjuntos).toHaveLength(1);
    expect(x.adjuntos[0]).toMatchObject({ nombre: "a.pdf", tamano: 500 });
    expect(x.bitacora.length).toBeGreaterThanOrEqual(2);   // creación + adjunto
    expect(x.bitacora[0].id).toBeLessThan(x.bitacora[1].id);
  });
  it("los ve el Administrador y el Aprobador, y no otra área", async () => {
    expect((await completo(ADMIN, r1.id)).registro.id).toBe(r1.id);
    expect((await completo(APROBADOR, r1.id)).registro.id).toBe(r1.id);
    expect(await completo(RESP_PRODUCCION, r1.id)).toBeNull();
  });
  it("una solicitud que no existe devuelve null", async () => {
    expect(await completo(ADMIN, "MTC-999")).toBeNull();
  });
  it("un borrador solo lo ve quien lo está escribiendo", async () => {
    expect((await completo(RESP_CALIDAD, borrador.id)).registro.borrador).toBe(true);
    expect(await completo(ADMIN, borrador.id)).toBeNull();
    expect(await completo(APROBADOR, borrador.id)).toBeNull();
  });
  it("sin sesión no se puede llamar", async () => {
    await expect(completo(null, r1.id)).rejects.toThrow(/permission denied/);
  });
});

describe("listar_registros", () => {
  it("devuelve cada solicitud visible con sus firmas, de la más reciente a la más antigua", async () => {
    const lista = await pagina(ADMIN, 0, 100);
    expect(lista.map(x => x.registro.id)).toEqual(expect.arrayContaining([r1.id, r2.id]));
    expect(lista.every(x => Array.isArray(x.firmas))).toBe(true);
    expect(lista.find(x => x.registro.id === r1.id).firmas).toHaveLength(1);
    const fechas = lista.map(x => x.registro.actualizado_en);
    expect([...fechas].sort().reverse()).toEqual(fechas);
  });
  it("cada persona recibe solo lo que puede ver", async () => {
    const calidad = (await pagina(RESP_CALIDAD, 0, 100)).map(x => x.registro.id);
    expect(calidad).toContain(r1.id);
    expect(calidad).toContain(borrador.id);
    expect(calidad).not.toContain(r2.id);
    const admin = (await pagina(ADMIN, 0, 100)).map(x => x.registro.id);
    expect(admin).not.toContain(borrador.id);
  });
  it("pagina sin repetir ni saltarse registros", async () => {
    const todos = (await pagina(ADMIN, 0, 100)).map(x => x.registro.id);
    const a = (await pagina(ADMIN, 0, 1)).map(x => x.registro.id);
    const b = (await pagina(ADMIN, 1, 1)).map(x => x.registro.id);
    expect([...a, ...b]).toEqual(todos.slice(0, 2));
  });
  it("una página vacía o con números raros no falla y nunca pasa de 1000", async () => {
    expect(await pagina(ADMIN, 999, 10)).toEqual([]);
    expect(await pagina(ADMIN, -5, 0)).toEqual([]);
    expect(await pagina(ADMIN, 0, 999999)).not.toHaveLength(1001);
  });
});