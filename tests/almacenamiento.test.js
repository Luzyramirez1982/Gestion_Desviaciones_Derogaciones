// Pruebas de los archivos (Storage): quién puede subir, quién puede leer y qué no se puede tocar.
// El esquema "storage" de Supabase se imita en ayuda_bd.js; las políticas son las reales de 0004.
import { describe, it, expect, beforeAll } from "vitest";
import { iniciarBD, ADMIN, RESP_CALIDAD, RESP_PRODUCCION, APROBADOR, firmaDe, solicitud } from "./ayuda_bd.js";

let db, como, q, crear;
beforeAll(async () => { ({ db, como, q, crear } = await iniciarBD()); });

const uno = (texto, params) => q(texto, params).then(r => r[0]);
const rpc = (quien, fn, ...args) =>
  como(quien, () => uno(`select * from ${fn}(${args.map((_, i) => "$" + (i + 1)).join(", ")})`, args));
const subir = (quien, ruta, bucket = "archivos") =>
  como(quien, () => q("insert into storage.objects (bucket_id, name) values ($1, $2)", [bucket, ruta]));
const leerArchivo = (quien, ruta) =>
  como(quien, () => q("select name from storage.objects where name = $1", [ruta])).then(r => r.length === 1);
const adjuntar = (quien, id, ruta) => rpc(quien, "registrar_adjunto", id, "documento.pdf", "application/pdf", 1000, ruta);

describe("el bucket de archivos", () => {
  it("es privado, de 5 MB, y solo admite documentos e imágenes", async () => {
    const b = await uno("select * from storage.buckets where id = 'archivos'");
    expect(b.public).toBe(false);
    expect(Number(b.file_size_limit)).toBe(5 * 1048576);
    expect(b.allowed_mime_types).toContain("application/pdf");
    expect(b.allowed_mime_types).toContain("image/png");
    for(const peligroso of ["application/x-msdownload", "application/zip", "text/html", "image/svg+xml", "application/javascript"]){
      expect(b.allowed_mime_types).not.toContain(peligroso);
    }
  });
});

describe("subir archivos", () => {
  let reg;
  beforeAll(async () => {
    reg = await como(RESP_CALIDAD, () => crear(solicitud()));
    await db.query("insert into storage.buckets (id, name) values ('otro', 'otro')");
  });

  it("se puede subir un adjunto a un registro que la persona ve", async () => {
    await subir(RESP_CALIDAD, `registros/${reg.id}/a.pdf`);
    await subir(APROBADOR, `registros/${reg.id}/b.pdf`);
  });
  it("no se sube a un registro que la persona no ve", async () => {
    await expect(subir(RESP_PRODUCCION, `registros/${reg.id}/c.pdf`)).rejects.toThrow(/row-level security/);
  });
  it("no se sube a un registro que no existe, ni con subcarpetas, ni a otro bucket", async () => {
    await expect(subir(RESP_CALIDAD, "registros/MTC-999/x.pdf")).rejects.toThrow(/row-level security/);
    await expect(subir(RESP_CALIDAD, `registros/${reg.id}/sub/x.pdf`)).rejects.toThrow(/row-level security/);
    await expect(subir(RESP_CALIDAD, `registros/${reg.id}/x.pdf`, "otro")).rejects.toThrow(/row-level security/);
    await expect(subir(RESP_CALIDAD, "suelto.pdf")).rejects.toThrow(/row-level security/);
  });
  it("no se sube a un registro cerrado", async () => {
    const c = await como(RESP_CALIDAD, () => crear(solicitud()));
    await rpc(APROBADOR, "rechazar_registro", c.id, "No procede");
    await expect(subir(RESP_CALIDAD, `registros/${c.id}/x.pdf`)).rejects.toThrow(/row-level security/);
  });
  it("sin sesión no se sube nada", async () => {
    await expect(subir(null, `registros/${reg.id}/z.pdf`)).rejects.toThrow(/permission denied/);
  });
  it("cada persona sube su firma solo en su propia carpeta", async () => {
    await subir(RESP_CALIDAD, firmaDe(RESP_CALIDAD, "mia.png"));
    await expect(subir(RESP_CALIDAD, firmaDe(APROBADOR, "ajena.png"))).rejects.toThrow(/row-level security/);
  });
});

describe("leer archivos", () => {
  let reg;
  beforeAll(async () => {
    reg = await como(RESP_CALIDAD, () => crear(solicitud()));
    await subir(RESP_CALIDAD, `registros/${reg.id}/informe.pdf`);
  });

  it("un archivo subido pero no registrado no lo lee nadie más", async () => {
    for(const quien of [APROBADOR, ADMIN, RESP_PRODUCCION]) expect(await leerArchivo(quien, `registros/${reg.id}/informe.pdf`)).toBe(false);
  });
  it("registrado, lo leen quienes ven el registro y nadie más", async () => {
    await adjuntar(RESP_CALIDAD, reg.id, `registros/${reg.id}/informe.pdf`);
    for(const quien of [RESP_CALIDAD, APROBADOR, ADMIN]) expect(await leerArchivo(quien, `registros/${reg.id}/informe.pdf`)).toBe(true);
    expect(await leerArchivo(RESP_PRODUCCION, `registros/${reg.id}/informe.pdf`)).toBe(false);
    expect(await leerArchivo(null, `registros/${reg.id}/informe.pdf`).catch(() => false)).toBe(false);
  });
  it("la imagen de una firma la leen quienes ven el registro firmado", async () => {
    const ruta = firmaDe(APROBADOR, "evaluacion.png");
    await subir(APROBADOR, ruta);
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
    await como(RESP_CALIDAD, () => q("delete from storage.objects where name = $1", [ruta]));
    await como(RESP_CALIDAD, () => q("update storage.objects set name = 'otro.pdf' where name = $1", [ruta]));
    await como(ADMIN, () => q("delete from storage.objects where name = $1", [ruta]));
    expect(await q("select name from storage.objects where name = $1", [ruta])).toHaveLength(1);
  });
});

describe("rutas de adjuntos y firmas", () => {
  it("un adjunto debe estar en la carpeta de su propio registro", async () => {
    const a = await como(RESP_CALIDAD, () => crear(solicitud()));
    const b = await como(RESP_CALIDAD, () => crear(solicitud()));
    await expect(adjuntar(RESP_CALIDAD, a.id, `registros/${b.id}/robado.pdf`)).rejects.toThrow(/ruta del archivo no es válida/);
  });
  it("el mismo archivo no se anota dos veces", async () => {
    const a = await como(RESP_CALIDAD, () => crear(solicitud()));
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
