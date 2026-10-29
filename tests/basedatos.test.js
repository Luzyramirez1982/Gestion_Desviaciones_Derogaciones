// Pruebas de la base de datos: acceso, creación, visibilidad, guardado, eliminación y uso del espacio.
// Usan un PostgreSQL de prueba que corre dentro de Node (ver ayuda_bd.js), sin Neon ni internet.
import { describe, it, expect, beforeAll } from "vitest";
import { iniciarBD, ADMIN, RESP_CALIDAD, RESP_PRODUCCION, APROBADOR, solicitud } from "./ayuda_bd.js";

let db, como, q, crear;
beforeAll(async () => { ({ db, como, q, crear } = await iniciarBD()); });

describe("acceso sin sesión", () => {
  it("quien no ha iniciado sesión no puede leer nada", async () => {
    for(const tabla of ["registros", "perfiles", "bitacora", "auditoria_eliminados", "configuracion"]){
      await expect(como(null, () => q(`select * from ${tabla}`))).rejects.toThrow(/permission denied/);
    }
  });
  it("quien no ha iniciado sesión no puede llamar las funciones", async () => {
    await expect(como(null, () => crear(solicitud()))).rejects.toThrow(/permission denied/);
  });
});

describe("crear solicitudes", () => {
  it("el consecutivo sube de uno en uno y no se repite", async () => {
    const ids = [];
    for(let i = 0; i < 5; i++) ids.push((await como(RESP_CALIDAD, () => crear(solicitud()))).id);
    expect(ids).toEqual(["MTC-001", "MTC-002", "MTC-003", "MTC-004", "MTC-005"]);
    expect(new Set(ids).size).toBe(5);
  });
  it("una solicitud enviada queda en Evaluación y Aprobación, con su bitácora", async () => {
    const r = await como(RESP_CALIDAD, () => crear(solicitud()));
    expect(r.etapa).toBe(1);
    expect(r.borrador).toBe(false);
    expect(r.reportado_por).toBe("Juan");
    const bit = await como(ADMIN, () => q("select comentario from bitacora where registro_id = $1", [r.id]));
    expect(bit.map(b => b.comentario)).toEqual(["Solicitud creada y firmada."]);
  });
  it("un borrador recibe un código temporal, no un consecutivo", async () => {
    const b = await como(RESP_CALIDAD, () => crear(solicitud(), true));
    expect(b.id).toMatch(/^BOR-/);
    expect(b.etapa).toBe(0);
  });
  it("el Aprobador no puede crear solicitudes", async () => {
    await expect(como(APROBADOR, () => crear(solicitud()))).rejects.toThrow(/no puede crear/);
  });
  it("exige la figura y el área", async () => {
    await expect(como(RESP_CALIDAD, () => crear(solicitud({ tipoGestion: "" })))).rejects.toThrow(/Desviación o una Derogación/);
    await expect(como(RESP_CALIDAD, () => crear(solicitud({ area: "" })))).rejects.toThrow(/área/);
  });
});

describe("quién ve qué", () => {
  let idCalidad, idBorrador;
  beforeAll(async () => {
    idCalidad = (await como(RESP_CALIDAD, () => crear(solicitud({ area: "Calidad Producto" })))).id;
    idBorrador = (await como(RESP_CALIDAD, () => crear(solicitud(), true))).id;
  });
  const ve = (id, reg) => como(id, () => q("select id from registros where id = $1", [reg])).then(r => r.length === 1);

  it("el Responsable de otra área no ve la solicitud", async () => {
    expect(await ve(RESP_PRODUCCION, idCalidad)).toBe(false);
  });
  it("el dueño, el Aprobador y el Administrador sí la ven", async () => {
    expect(await ve(RESP_CALIDAD, idCalidad)).toBe(true);
    expect(await ve(APROBADOR, idCalidad)).toBe(true);
    expect(await ve(ADMIN, idCalidad)).toBe(true);
  });
  it("un borrador solo lo ve quien lo escribe", async () => {
    expect(await ve(RESP_CALIDAD, idBorrador)).toBe(true);
    expect(await ve(ADMIN, idBorrador)).toBe(false);
    expect(await ve(APROBADOR, idBorrador)).toBe(false);
  });
  it("la bitácora sigue la misma regla de visibilidad", async () => {
    const otra = await como(RESP_PRODUCCION, () => q("select * from bitacora where registro_id = $1", [idCalidad]));
    expect(otra).toEqual([]);
  });
});

describe("no se puede escribir saltándose las funciones", () => {
  it("nadie inserta, edita ni borra registros directamente", async () => {
    const id = (await como(RESP_CALIDAD, () => crear(solicitud()))).id;
    await expect(como(RESP_CALIDAD, () => q("update registros set etapa = 2 where id = $1", [id]))).rejects.toThrow(/permission denied/);
    await expect(como(RESP_CALIDAD, () => q("delete from registros where id = $1", [id]))).rejects.toThrow(/permission denied/);
    await expect(como(ADMIN, () => q("delete from registros where id = $1", [id]))).rejects.toThrow(/permission denied/);
    await expect(como(RESP_CALIDAD, () => q("insert into registros (id, tipo_gestion, area) values ('X','Desviación','a')"))).rejects.toThrow(/permission denied/);
  });
  it("nadie toca la bitácora ni las firmas", async () => {
    await expect(como(ADMIN, () => q("delete from bitacora"))).rejects.toThrow(/permission denied/);
    await expect(como(ADMIN, () => q("update firmas set nombre = 'x'"))).rejects.toThrow(/permission denied/);
  });
  it("una persona no puede cambiarse el rol a Administrador", async () => {
    await como(RESP_CALIDAD, () => q("update perfiles set rol = 'Administrador' where id = $1", [RESP_CALIDAD]));
    const [p] = await q("select rol from perfiles where id = $1", [RESP_CALIDAD]);
    expect(p.rol).toBe("Responsable del proceso");
  });
  it("el Administrador sí puede cambiar áreas, tipos y ajustes; los demás no", async () => {
    await como(ADMIN, () => q("insert into areas (nombre) values ('Producción')"));
    await expect(como(RESP_CALIDAD, () => q("insert into areas (nombre) values ('Inventada')"))).rejects.toThrow(/row-level security/);
  });
});

describe("guardar cambios sin pisar a otra persona", () => {
  let reg;
  beforeAll(async () => { reg = await como(RESP_CALIDAD, () => crear(solicitud())); });
  const guardar = (id, version, data, quien = RESP_CALIDAD) =>
    como(quien, () => q("select * from guardar_registro($1, $2, $3::jsonb)", [id, version, JSON.stringify(data)])).then(r => r[0]);

  it("guarda y sube la versión", async () => {
    const r = await guardar(reg.id, reg.version, solicitud({ descripcion: "Texto nuevo" }));
    expect(r.version).toBe(reg.version + 1);
    expect(r.data.descripcion).toBe("Texto nuevo");
    reg = r;
  });
  it("si alguien más ya lo cambió, avisa en vez de borrar su trabajo", async () => {
    await expect(guardar(reg.id, reg.version - 1, solicitud({ descripcion: "Viejo" }))).rejects.toThrow(/conflicto_version/);
    const [r] = await q("select data from registros where id = $1", [reg.id]);
    expect(r.data.descripcion).toBe("Texto nuevo");
  });
  it("no deja cambiar la etapa ni cerrar el registro desde el navegador", async () => {
    const r = await guardar(reg.id, reg.version, solicitud({ stage: 2, cerrado: true, resultado: "Rechazada" }));
    expect(r.etapa).toBe(1);
    expect(r.cerrado).toBe(false);
    expect(r.resultado).toBe("");
    expect(r.data.stage).toBe(1);
    expect(r.data.cerrado).toBe(false);
    reg = r;
  });
  it("un Responsable de otra área no puede editarlo", async () => {
    await expect(guardar(reg.id, reg.version, solicitud(), RESP_PRODUCCION)).rejects.toThrow(/No se encontró/);
  });
  it("no se puede editar un registro cerrado", async () => {
    await db.query("update registros set cerrado = true where id = $1", [reg.id]);
    await expect(guardar(reg.id, reg.version, solicitud())).rejects.toThrow(/cerrado/);
  });
});

describe("eliminar registros", () => {
  let id;
  beforeAll(async () => { id = (await como(RESP_CALIDAD, () => crear(solicitud({ descripcion: "Para borrar" })))).id; });
  const eliminar = (quien, motivo) => como(quien, () => q("select eliminar_registro($1, $2)", [id, motivo]));

  it("solo el Administrador puede eliminar", async () => {
    await expect(eliminar(RESP_CALIDAD, "No lo quiero")).rejects.toThrow(/Solo el Administrador/);
    await expect(eliminar(APROBADOR, "No lo quiero")).rejects.toThrow(/Solo el Administrador/);
  });
  it("exige un motivo", async () => {
    await expect(eliminar(ADMIN, "  ")).rejects.toThrow(/motivo/);
  });
  it("elimina y deja la huella con quién, por qué y una copia", async () => {
    await eliminar(ADMIN, "Se creó por error");
    expect(await q("select id from registros where id = $1", [id])).toEqual([]);
    const huella = await como(ADMIN, () => q("select * from auditoria_eliminados where registro_id = $1", [id]));
    expect(huella.length).toBe(1);
    expect(huella[0].eliminado_por).toBe("Natalia");
    expect(huella[0].motivo).toBe("Se creó por error");
    expect(huella[0].copia.registro.data.descripcion).toBe("Para borrar");
    expect(huella[0].copia.bitacora.length).toBe(1);
  });
  it("la huella solo la ve el Administrador y nadie la puede borrar", async () => {
    await expect(como(RESP_CALIDAD, () => q("select * from auditoria_eliminados"))).resolves.toEqual([]);
    await expect(como(ADMIN, () => q("delete from auditoria_eliminados"))).rejects.toThrow(/permission denied/);
    await expect(como(ADMIN, () => q("update auditoria_eliminados set motivo = 'x'"))).rejects.toThrow(/permission denied/);
  });
});

describe("uso del espacio", () => {
  it("lo ve el Administrador, con los límites del plan gratuito", async () => {
    const [{ uso_almacenamiento: u }] = await como(ADMIN, () => q("select uso_almacenamiento()"));
    expect(u.base_datos_limite_bytes).toBe(1024 * 1024 * 1024);
    expect(u.archivos_limite_bytes).toBe(512 * 1024 * 1024);
    expect(u.registros).toBeGreaterThan(0);
  });
  it("los demás no", async () => {
    await expect(como(RESP_CALIDAD, () => q("select uso_almacenamiento()"))).rejects.toThrow(/Solo el Administrador/);
  });
});

describe("cambio de contraseña temporal", () => {
  it("cada persona solo marca la suya", async () => {
    await como(RESP_PRODUCCION, () => q("select marcar_clave_cambiada()"));
    const filas = await q("select id, debe_cambiar_clave from perfiles where id in ($1, $2)", [RESP_PRODUCCION, RESP_CALIDAD]);
    expect(filas.find(f => f.id === RESP_PRODUCCION).debe_cambiar_clave).toBe(false);
    expect(filas.find(f => f.id === RESP_CALIDAD).debe_cambiar_clave).toBe(true);
  });
});
