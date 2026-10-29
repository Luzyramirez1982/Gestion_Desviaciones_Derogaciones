// Pruebas de los archivos (tabla "archivos"): quién puede subir, quién puede leer y qué no se puede tocar.
// Las reglas son las reales de db/migraciones/0004_archivos.sql, corridas en un PostgreSQL de prueba.
import { describe, it, expect, beforeAll } from "vitest";
import { iniciarBD, ADMIN, RESP_CALIDAD, RESP_PRODUCCION, APROBADOR, firmaDe, solicitud } from "./ayuda_bd.js";

let db, como, q, crear;
beforeAll(async () => { ({ db, como, q, crear } = await iniciarBD()); });

const uno = (texto, params) => q(texto, params).then(r => r[0]);
const rpc = (quien, fn, ...args) =>
  como(quien, () => uno(`select * from ${fn}(${args.map((_, i) => "$" + (i + 1)).join(", ")})`, args));

// Una imagen PNG de 1 píxel y un PDF mínimo, en base64.
const PNG = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
const PDF = Buffer.from("%PDF-1.4\n%prueba\n").toString("base64");
const TAM_PDF = Buffer.from(PDF, "base64").length;

const subir = (quien, ruta, tipo = "application/pdf", base64 = PDF) =>
  rpc(quien, "subir_archivo", ruta, tipo, base64);
const leerArchivo = (quien, ruta) =>
  como(quien, () => q("select ruta from archivos where ruta = $1", [ruta])).then(r => r.length === 1);
const adjuntar = (quien, id, ruta, tamano = TAM_PDF) =>
  rpc(quien, "registrar_adjunto", id, "documento.pdf", "application/pdf", tamano, ruta);

describe("subir archivos", () => {
  let reg;
  beforeAll(async () => { reg = await como(RESP_CALIDAD, () => crear(solicitud())); });

  it("se puede subir un adjunto a un registro que la persona ve", async () => {
    await subir(RESP_CALIDAD, `registros/${reg.id}/a.pdf`);
    await subir(APROBADOR, `registros/${reg.id}/b.pdf`);
  });
  it("no se sube a un registro que la persona no ve", async () => {
    await expect(subir(RESP_PRODUCCION, `registros/${reg.id}/c.pdf`)).rejects.toThrow(/No puede adjuntar/);
  });
  it("no se sube a un registro que no existe, ni con subcarpetas, ni suelto", async () => {
    await expect(subir(RESP_CALIDAD, "registros/MTC-999/x.pdf")).rejects.toThrow(/No puede adjuntar/);
    await expect(subir(RESP_CALIDAD, `registros/${reg.id}/sub/x.pdf`)).rejects.toThrow(/ruta del archivo no es válida/);
    await expect(subir(RESP_CALIDAD, "suelto.pdf")).rejects.toThrow(/ruta del archivo no es válida/);
    await expect(subir(RESP_CALIDAD, `registros/${reg.id}/../x.pdf`)).rejects.toThrow(/ruta del archivo no es válida/);
  });
  it("no se sube a un registro rechazado", async () => {
    const c = await como(RESP_CALIDAD, () => crear(solicitud()));
    await rpc(APROBADOR, "rechazar_registro", c.id, "No procede");
    await expect(subir(RESP_CALIDAD, `registros/${c.id}/x.pdf`)).rejects.toThrow(/No puede adjuntar/);
  });
  it("sin sesión no se sube nada", async () => {
    await expect(subir(null, `registros/${reg.id}/z.pdf`)).rejects.toThrow(/permission denied/);
  });
  it("cada persona sube su firma solo en su propia carpeta", async () => {
    await subir(RESP_CALIDAD, firmaDe(RESP_CALIDAD, "mia.png"), "image/png", PNG);
    await expect(subir(RESP_CALIDAD, firmaDe(APROBADOR, "ajena.png"), "image/png", PNG)).rejects.toThrow(/propia carpeta/);
  });
  it("la firma debe ser una imagen PNG", async () => {
    await expect(subir(RESP_CALIDAD, firmaDe(RESP_CALIDAD, "falsa.png"), "application/pdf")).rejects.toThrow(/PNG/);
  });
  it("no admite programas, páginas ni archivos comprimidos", async () => {
    for(const tipo of ["application/x-msdownload", "application/zip", "text/html", "image/svg+xml", "application/javascript"]){
      await expect(subir(RESP_CALIDAD, `registros/${reg.id}/x.bin`, tipo)).rejects.toThrow(/no está permitido/);
    }
  });
  it("rechaza archivos vacíos, mayores de 5 MB o mal codificados", async () => {
    await expect(subir(RESP_CALIDAD, `registros/${reg.id}/vacio.pdf`, "application/pdf", "")).rejects.toThrow(/hasta 5 MB/);
    const grande = Buffer.alloc(5 * 1048576 + 1, 1).toString("base64");
    await expect(subir(RESP_CALIDAD, `registros/${reg.id}/grande.pdf`, "application/pdf", grande)).rejects.toThrow(/hasta 5 MB/);
  });
  it("una ruta ya usada no se reemplaza", async () => {
    await subir(RESP_CALIDAD, `registros/${reg.id}/unica.pdf`);
    await expect(subir(RESP_CALIDAD, `registros/${reg.id}/unica.pdf`)).rejects.toThrow(/duplicate key/);
  });
  it("no se puede escribir directo en la tabla, saltándose las reglas", async () => {
    await expect(como(RESP_CALIDAD, () => q(
      "insert into archivos (ruta, tipo, tamano, contenido) values ($1, 'application/pdf', 5, 'AAAA')", [`registros/${reg.id}/directo.pdf`]
    ))).rejects.toThrow(/permission denied/);
  });
});

describe("leer archivos", () => {
  let reg;
  beforeAll(async () => {
    reg = await como(RESP_CALIDAD, () => crear(solicitud()));
    await subir(RESP_CALIDAD, `registros/${reg.id}/informe.pdf`);
  });

  it("un archivo subido pero no anotado no lo lee nadie más", async () => {
    for(const quien of [APROBADOR, ADMIN, RESP_PRODUCCION]) expect(await leerArchivo(quien, `registros/${reg.id}/informe.pdf`)).toBe(false);
  });
  it("anotado, lo leen quienes ven el registro y nadie más", async () => {
    await adjuntar(RESP_CALIDAD, reg.id, `registros/${reg.id}/informe.pdf`);
    for(const quien of [RESP_CALIDAD, APROBADOR, ADMIN]) expect(await leerArchivo(quien, `registros/${reg.id}/informe.pdf`)).toBe(true);
    expect(await leerArchivo(RESP_PRODUCCION, `registros/${reg.id}/informe.pdf`)).toBe(false);
    expect(await leerArchivo(null, `registros/${reg.id}/informe.pdf`).catch(() => false)).toBe(false);
  });
  it("el contenido leído es el mismo que se subió", async () => {
    const f = await como(APROBADOR, () => uno("select contenido, tipo, tamano from archivos where ruta = $1", [`registros/${reg.id}/informe.pdf`]));
    expect(f.contenido).toBe(PDF);
    expect(f.tipo).toBe("application/pdf");
    expect(Number(f.tamano)).toBe(TAM_PDF);
  });
  it("la imagen de una firma la leen quienes ven el registro firmado", async () => {
    const ruta = firmaDe(APROBADOR, "evaluacion.png");
    await subir(APROBADOR, ruta, "image/png", PNG);
    const { version } = await uno("select version from registros where id = $1", [reg.id]);
    await rpc(APROBADOR, "guardar_registro", reg.id, version,
      JSON.stringify({ ...reg.data, conceptoEvaluacion: "ok", controlesCompensatorios: "ok" }));
    await rpc(APROBADOR, "firmar_etapa", reg.id, "aprob", ruta, "");
    for(const quien of [RESP_CALIDAD, APROBADOR, ADMIN]) expect(await leerArchivo(quien, ruta)).toBe(true);
    expect(await leerArchivo(RESP_PRODUCCION, ruta)).toBe(false);
  });
});

describe("lo subido no se cambia ni se borra", () => {
  it("no se puede borrar ni reemplazar un archivo desde la aplicación", async () => {
    const reg = await como(RESP_CALIDAD, () => crear(solicitud()));
    const ruta = `registros/${reg.id}/definitivo.pdf`;
    await subir(RESP_CALIDAD, ruta);
    await expect(como(RESP_CALIDAD, () => q("delete from archivos where ruta = $1", [ruta]))).rejects.toThrow(/permission denied/);
    await expect(como(ADMIN, () => q("update archivos set contenido = 'AAAA' where ruta = $1", [ruta]))).rejects.toThrow(/permission denied/);
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
  it("no se anota un archivo que no se subió", async () => {
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
  it("cuenta los archivos guardados", async () => {
    const [{ uso_almacenamiento: u }] = await como(ADMIN, () => q("select uso_almacenamiento()"));
    expect(u.archivos_bytes).toBeGreaterThan(0);
  });
});
