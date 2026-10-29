// Reglas de los archivos (db/migraciones/0004 y 0006): quién puede subir, quién puede leer y qué no se puede tocar.
// El contenido vive en el bucket; la base decide los permisos y anota qué archivo existe.
import { describe, it, expect, beforeAll } from "vitest";
import { iniciarBD, ADMIN, RESP_CALIDAD, RESP_PRODUCCION, APROBADOR, firmaDe, solicitud } from "./ayuda_bd.js";

let db, como, q, crear;
beforeAll(async () => { ({ db, como, q, crear } = await iniciarBD()); });

const uno = (texto, params) => q(texto, params).then(r => r[0]);
const rpc = (quien, fn, ...args) =>
  como(quien, () => uno(`select * from ${fn}(${args.map((_, i) => "$" + (i + 1)).join(", ")})`, args));

const PDF = "application/pdf";
const MB = 1048576;

// Lo que hace la función de servidor: revisar el permiso y, si todo va bien, anotar el archivo.
const puede = (quien, ruta, tipo = PDF, tam = 1000) => rpc(quien, "puede_subir_archivo", ruta, tipo, tam);
const subir = async (quien, ruta, tipo = PDF, tam = 1000) => { await puede(quien, ruta, tipo, tam); return rpc(quien, "registrar_archivo", ruta, tipo, tam); };
const leerArchivo = (quien, ruta) =>
  como(quien, () => uno("select puede_leer_archivo($1) as ok", [ruta])).then(r => r.ok);
const adjuntar = (quien, id, ruta, tamano = 1000) => rpc(quien, "registrar_adjunto", id, "documento.pdf", PDF, tamano, ruta);

describe("subir archivos", () => {
  let reg;
  beforeAll(async () => { reg = await como(RESP_CALIDAD, () => crear(solicitud())); });

  it("se puede subir un adjunto a un registro que la persona ve", async () => {
    await subir(RESP_CALIDAD, `registros/${reg.id}/a.pdf`);
    await subir(APROBADOR, `registros/${reg.id}/b.pdf`);
  });
  it("no se sube a un registro que la persona no ve", async () => {
    await expect(puede(RESP_PRODUCCION, `registros/${reg.id}/c.pdf`)).rejects.toThrow(/No puede adjuntar/);
  });
  it("no se sube a un registro que no existe, ni con subcarpetas, ni suelto", async () => {
    await expect(puede(RESP_CALIDAD, "registros/MTC-999/x.pdf")).rejects.toThrow(/No puede adjuntar/);
    await expect(puede(RESP_CALIDAD, `registros/${reg.id}/sub/x.pdf`)).rejects.toThrow(/ruta del archivo no es válida/);
    await expect(puede(RESP_CALIDAD, "suelto.pdf")).rejects.toThrow(/ruta del archivo no es válida/);
    await expect(puede(RESP_CALIDAD, `registros/${reg.id}/../x.pdf`)).rejects.toThrow(/ruta del archivo no es válida/);
  });
  it("no se sube a un registro rechazado", async () => {
    const c = await como(RESP_CALIDAD, () => crear(solicitud()));
    await rpc(APROBADOR, "rechazar_registro", c.id, "No procede");
    await expect(puede(RESP_CALIDAD, `registros/${c.id}/x.pdf`)).rejects.toThrow(/No puede adjuntar/);
  });
  it("sin sesión no se sube nada", async () => {
    await expect(puede(null, `registros/${reg.id}/z.pdf`)).rejects.toThrow(/permission denied/);
  });
  it("una cuenta sin perfil no sube nada", async () => {
    await expect(puede("ffffffff-ffff-ffff-ffff-ffffffffffff", `registros/${reg.id}/z.pdf`)).rejects.toThrow(/No tiene permiso/);
  });
  it("cada persona sube su firma solo en su propia carpeta", async () => {
    await subir(RESP_CALIDAD, firmaDe(RESP_CALIDAD, "mia.png"), "image/png");
    await expect(puede(RESP_CALIDAD, firmaDe(APROBADOR, "ajena.png"), "image/png")).rejects.toThrow(/propia carpeta/);
  });
  it("la firma debe ser una imagen PNG", async () => {
    await expect(puede(RESP_CALIDAD, firmaDe(RESP_CALIDAD, "falsa.png"), PDF)).rejects.toThrow(/PNG/);
  });
  it("no admite programas, páginas ni archivos comprimidos", async () => {
    for(const tipo of ["application/x-msdownload", "application/zip", "text/html", "image/svg+xml", "application/javascript"]){
      await expect(puede(RESP_CALIDAD, `registros/${reg.id}/x.bin`, tipo)).rejects.toThrow(/no está permitido/);
    }
  });
  it("rechaza archivos vacíos o mayores de 5 MB, pero admite exactamente 5 MB", async () => {
    await expect(puede(RESP_CALIDAD, `registros/${reg.id}/vacio.pdf`, PDF, 0)).rejects.toThrow(/hasta 5 MB/);
    await expect(puede(RESP_CALIDAD, `registros/${reg.id}/grande.pdf`, PDF, 5 * MB + 1)).rejects.toThrow(/hasta 5 MB/);
    await expect(puede(RESP_CALIDAD, `registros/${reg.id}/justo.pdf`, PDF, 5 * MB)).resolves.toBeTruthy();
  });
  it("una ruta ya usada no se reemplaza", async () => {
    await subir(RESP_CALIDAD, `registros/${reg.id}/unica.pdf`);
    await expect(puede(RESP_CALIDAD, `registros/${reg.id}/unica.pdf`)).rejects.toThrow(/ya existe/);
  });
  it("no se puede anotar un archivo saltándose la revisión", async () => {
    await expect(rpc(RESP_PRODUCCION, "registrar_archivo", `registros/${reg.id}/colado.pdf`, PDF, 100)).rejects.toThrow(/No puede adjuntar/);
    await expect(como(RESP_CALIDAD, () => q(
      "insert into archivos (ruta, tipo, tamano) values ($1, 'application/pdf', 5)", [`registros/${reg.id}/directo.pdf`]
    ))).rejects.toThrow(/permission denied/);
  });
  it("el archivo anotado guarda quién lo subió, su tipo y su tamaño (no el contenido)", async () => {
    const f = await q("select * from archivos where ruta = $1", [`registros/${reg.id}/a.pdf`]).then(r => r[0]);
    expect(f).toMatchObject({ tipo: PDF, subido_por: "Juan" });
    expect(Number(f.tamano)).toBe(1000);
    expect(Object.keys(f)).not.toContain("contenido");
  });
});

describe("leer archivos", () => {
  let reg;
  beforeAll(async () => {
    reg = await como(RESP_CALIDAD, () => crear(solicitud()));
    await subir(RESP_CALIDAD, `registros/${reg.id}/informe.pdf`);
  });

  it("un archivo subido pero no asociado a un registro lo ve solo quien lo puede ver por el registro", async () => {
    // La regla de lectura mira el adjunto o la firma que lo une a un registro; sin unión nadie lo lee.
    for(const quien of [RESP_CALIDAD, APROBADOR, ADMIN, RESP_PRODUCCION]) expect(await leerArchivo(quien, `registros/${reg.id}/informe.pdf`)).toBe(false);
  });
  it("anotado como adjunto, lo leen quienes ven el registro y nadie más", async () => {
    await adjuntar(RESP_CALIDAD, reg.id, `registros/${reg.id}/informe.pdf`);
    for(const quien of [RESP_CALIDAD, APROBADOR, ADMIN]) expect(await leerArchivo(quien, `registros/${reg.id}/informe.pdf`)).toBe(true);
    expect(await leerArchivo(RESP_PRODUCCION, `registros/${reg.id}/informe.pdf`)).toBe(false);
    expect(await leerArchivo(null, `registros/${reg.id}/informe.pdf`).catch(() => false)).toBe(false);
  });
  it("un archivo que no existe no se puede leer", async () => {
    expect(await leerArchivo(ADMIN, "registros/MTC-999/nada.pdf")).toBe(false);
  });
  it("la imagen de una firma la leen quienes ven el registro firmado", async () => {
    const ruta = firmaDe(APROBADOR, "evaluacion.png");
    await subir(APROBADOR, ruta, "image/png");
    const { version } = await uno("select version from registros where id = $1", [reg.id]);
    await rpc(APROBADOR, "guardar_registro", reg.id, version,
      JSON.stringify({ ...reg.data, conceptoEvaluacion: "ok", controlesCompensatorios: "ok" }));
    await rpc(APROBADOR, "firmar_etapa", reg.id, "aprob", ruta, "");
    for(const quien of [RESP_CALIDAD, APROBADOR, ADMIN]) expect(await leerArchivo(quien, ruta)).toBe(true);
    expect(await leerArchivo(RESP_PRODUCCION, ruta)).toBe(false);
  });
});

describe("lo subido no se cambia ni se borra", () => {
  it("no se puede borrar ni modificar un archivo desde la aplicación", async () => {
    const reg = await como(RESP_CALIDAD, () => crear(solicitud()));
    const ruta = `registros/${reg.id}/definitivo.pdf`;
    await subir(RESP_CALIDAD, ruta);
    await expect(como(RESP_CALIDAD, () => q("delete from archivos where ruta = $1", [ruta]))).rejects.toThrow(/permission denied/);
    await expect(como(ADMIN, () => q("update archivos set tipo = 'text/plain' where ruta = $1", [ruta]))).rejects.toThrow(/permission denied/);
    expect(await q("select ruta from archivos where ruta = $1", [ruta])).toHaveLength(1);
  });
});

describe("rutas de adjuntos y firmas", () => {
  it("un adjunto debe estar en la carpeta de su propio registro", async () => {
    const a = await como(RESP_CALIDAD, () => crear(solicitud()));
    const b = await como(RESP_CALIDAD, () => crear(solicitud()));
    await subir(RESP_CALIDAD, `registros/${b.id}/robado.pdf`);
    await expect(adjuntar(RESP_CALIDAD, a.id, `registros/${b.id}/robado.pdf`)).rejects.toThrow(/ruta del archivo no es válida/);
  });
  it("no se anota un adjunto cuyo archivo no se subió", async () => {
    const a = await como(RESP_CALIDAD, () => crear(solicitud()));
    await expect(adjuntar(RESP_CALIDAD, a.id, `registros/${a.id}/fantasma.pdf`)).rejects.toThrow(/Primero hay que subir/);
  });
  it("el mismo archivo no se anota dos veces", async () => {
    const a = await como(RESP_CALIDAD, () => crear(solicitud()));
    await subir(RESP_CALIDAD, `registros/${a.id}/unico.pdf`);
    await adjuntar(RESP_CALIDAD, a.id, `registros/${a.id}/unico.pdf`);
    await expect(adjuntar(RESP_CALIDAD, a.id, `registros/${a.id}/unico.pdf`)).rejects.toThrow(/ya está registrado/);
  });
  it("la firma debe estar en la carpeta de quien firma", async () => {
    const a = await como(RESP_CALIDAD, () => crear(solicitud()));
    await rpc(APROBADOR, "guardar_registro", a.id, a.version, JSON.stringify({ ...a.data, conceptoEvaluacion: "ok", controlesCompensatorios: "ok" }));
    await expect(rpc(APROBADOR, "firmar_etapa", a.id, "aprob", firmaDe(RESP_CALIDAD), "")).rejects.toThrow(/Dibuje su firma/);
    await expect(rpc(APROBADOR, "firmar_etapa", a.id, "aprob", `registros/${a.id}/documento.pdf`, "")).rejects.toThrow(/Dibuje su firma/);
    await expect(rpc(APROBADOR, "firmar_etapa", a.id, "aprob", `firmas/${APROBADOR}/../x.png`, "")).rejects.toThrow(/Dibuje su firma/);
    await rpc(APROBADOR, "firmar_etapa", a.id, "aprob", firmaDe(APROBADOR), "");
  });
  it("al crear o enviar tampoco se acepta la firma de otra persona", async () => {
    await expect(como(RESP_CALIDAD, () => q("select * from crear_registro($1::jsonb, false, $2)",
      [JSON.stringify(solicitud()), firmaDe(RESP_PRODUCCION)]))).rejects.toThrow(/Dibuje su firma/);
    const b = await como(RESP_CALIDAD, () => crear(solicitud(), true));
    await expect(rpc(RESP_CALIDAD, "enviar_registro", b.id, b.version, JSON.stringify(b.data), firmaDe(APROBADOR))).rejects.toThrow(/Dibuje su firma/);
  });
});

describe("uso del espacio", () => {
  it("cuenta los archivos anotados y usa el límite del bucket (5 GB) y el de la base (1 GB)", async () => {
    const [{ uso_almacenamiento: u }] = await como(ADMIN, () => q("select uso_almacenamiento()"));
    expect(u.archivos_bytes).toBeGreaterThan(0);
    expect(u.archivos_limite_bytes).toBe(5 * 1024 * MB);
    expect(u.base_datos_limite_bytes).toBe(1024 * MB);
  });
});
