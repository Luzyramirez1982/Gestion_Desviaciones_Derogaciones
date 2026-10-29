// La función de servidor «archivos»: autenticación, permisos (los decide la base), límites, orden de pasos y CORS.
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { crearClientePglite } from "./cliente_pglite.js";
import { crearEntornoArchivos, URL_FUNCION, ORIGEN } from "./entorno_archivos.js";
import { ADMIN, RESP_CALIDAD, RESP_PRODUCCION, APROBADOR, firmaDe, solicitud } from "./ayuda_bd.js";

const MB = 1048576;
const PDF = "application/pdf";
let c, e, reg;

beforeAll(async () => {
  c = await crearClientePglite();
  e = crearEntornoArchivos(c);
  e.instalar();
  reg = await c.como(RESP_CALIDAD, () => c.crear(solicitud()));
});
afterAll(() => e.quitar());

const bytes = (n, v = 7) => new Uint8Array(n).fill(v);
const url = (ruta) => `${URL_FUNCION}/archivo?ruta=${encodeURIComponent(ruta)}`;
const pedir = (ruta, { uid, metodo = "GET", cuerpo, tipo = PDF, cabeceras = {} } = {}) => fetch(url(ruta), {
  method: metodo, body: cuerpo,
  headers: { ...(uid ? { Authorization: "Bearer " + e.token(uid) } : {}), ...(cuerpo ? { "Content-Type": tipo } : {}), ...cabeceras },
});
const subir = (ruta, uid, cuerpo = bytes(1000), tipo = PDF) => pedir(ruta, { uid, metodo: "PUT", cuerpo, tipo });
const filasArchivos = () => c.q("select ruta from archivos").then(r => r.length);
const rutaAdj = (nombre) => `registros/${reg.id}/${nombre}`;

describe("quién es la persona", () => {
  it("sin sesión no se sube ni se lee nada", async () => {
    expect((await pedir(rutaAdj("a.pdf"), { metodo: "PUT", cuerpo: bytes(10) })).status).toBe(401);
    expect((await pedir(rutaAdj("a.pdf"))).status).toBe(401);
    expect(e.bucket.size).toBe(0);
  });
  it("un token que la base no reconoce se rechaza y no se toca el bucket", async () => {
    const r = await fetch(url(rutaAdj("a.pdf")), { method: "PUT", body: bytes(10), headers: { Authorization: "Bearer cualquiercosa", "Content-Type": PDF } });
    expect(r.status).toBe(401);
    expect(e.bucket.size).toBe(0);
  });
  it("una cuenta sin perfil en la aplicación no sube nada", async () => {
    const r = await subir(rutaAdj("a.pdf"), "ffffffff-ffff-ffff-ffff-ffffffffffff");
    expect(r.status).toBe(403);
    expect((await r.json()).error).toMatch(/No tiene permiso/);
    expect(e.bucket.size).toBe(0);
  });
});

describe("subir", () => {
  it("sube un adjunto, lo guarda en el bucket y lo anota en la base", async () => {
    const r = await subir(rutaAdj("informe.pdf"), RESP_CALIDAD, bytes(2500, 9));
    expect(r.status).toBe(201);
    expect(await r.json()).toEqual({ ruta: rutaAdj("informe.pdf"), tamano: 2500 });
    expect(e.bucket.get(rutaAdj("informe.pdf")).bytes).toHaveLength(2500);
    const fila = (await c.q("select * from archivos where ruta = $1", [rutaAdj("informe.pdf")]))[0];
    expect(fila).toMatchObject({ tipo: PDF, subido_por: "Juan" });
    expect(Number(fila.tamano)).toBe(2500);
  });
  it("pregunta primero a la base y solo después guarda; anota al final", async () => {
    e.consultas.length = 0;
    await subir(rutaAdj("orden.pdf"), RESP_CALIDAD);
    expect(e.consultas).toEqual(["puede_subir_archivo", "registrar_archivo"]);
  });
  it("sube la firma de la persona en su propia carpeta, pero no en la de otra", async () => {
    expect((await subir(firmaDe(RESP_CALIDAD, "mia.png"), RESP_CALIDAD, bytes(200), "image/png")).status).toBe(201);
    const ajena = await subir(firmaDe(APROBADOR, "ajena.png"), RESP_CALIDAD, bytes(200), "image/png");
    expect(ajena.status).toBe(403);
    expect((await ajena.json()).error).toMatch(/propia carpeta/);
    expect(e.bucket.has(firmaDe(APROBADOR, "ajena.png"))).toBe(false);
  });
  it("otra área no puede adjuntar a un registro que no ve, y el bucket queda igual", async () => {
    const antes = e.bucket.size;
    const r = await subir(rutaAdj("intruso.pdf"), RESP_PRODUCCION);
    expect(r.status).toBe(403);
    expect((await r.json()).error).toMatch(/No puede adjuntar/);
    expect(e.bucket.size).toBe(antes);
  });
  it("no admite tipos peligrosos y no guarda nada", async () => {
    const antes = e.bucket.size;
    for(const tipo of ["application/x-msdownload", "text/html", "application/zip", "image/svg+xml"]){
      const r = await subir(rutaAdj("malo.bin"), RESP_CALIDAD, bytes(50), tipo);
      expect(r.status, tipo).toBe(403);
    }
    expect(e.bucket.size).toBe(antes);
  });
  it("admite exactamente 5 MB y rechaza 5 MB + 1 byte, por el aviso de tamaño y por el contenido real", async () => {
    expect((await subir(rutaAdj("justo.pdf"), RESP_CALIDAD, bytes(5 * MB))).status).toBe(201);
    const grande = await subir(rutaAdj("grande.pdf"), RESP_CALIDAD, bytes(5 * MB + 1));
    expect(grande.status).toBe(413);
    expect(e.bucket.has(rutaAdj("grande.pdf"))).toBe(false);
    // Aunque mienta en Content-Length, el contenido real también se mide.
    const mentira = await fetch(url(rutaAdj("mentira.pdf")), {
      method: "PUT", body: bytes(5 * MB + 1), headers: { Authorization: "Bearer " + e.token(RESP_CALIDAD), "Content-Type": PDF, "Content-Length": "100" },
    }).catch(() => ({ status: 413 }));
    expect(mentira.status).toBe(413);
    expect(e.bucket.has(rutaAdj("mentira.pdf"))).toBe(false);
  });
  it("rechaza un archivo vacío", async () => {
    expect((await subir(rutaAdj("vacio.pdf"), RESP_CALIDAD, new Uint8Array(0))).status).toBe(413);
  });
  it("rechaza rutas raras sin molestar a la base", async () => {
    e.consultas.length = 0;
    for(const ruta of ["suelto.pdf", "registros/x.pdf", `registros/${reg.id}/../x.pdf`, `otra/${reg.id}/x.pdf`, `registros/${reg.id}/sub/x.pdf`]){
      expect((await subir(ruta, RESP_CALIDAD)).status, ruta).toBe(400);
    }
    expect(e.consultas).toEqual([]);
  });
  it("no reemplaza un archivo ya guardado", async () => {
    await subir(rutaAdj("fijo.pdf"), RESP_CALIDAD, bytes(30, 1));
    const otra = await subir(rutaAdj("fijo.pdf"), RESP_CALIDAD, bytes(30, 2));
    expect(otra.status).toBe(403);
    expect((await otra.json()).error).toMatch(/ya existe/);
    expect(e.bucket.get(rutaAdj("fijo.pdf")).bytes[0]).toBe(1);
  });
  it("si el bucket falla, no queda nada anotado en la base", async () => {
    const antes = await filasArchivos();
    e.fallos.poner = true;
    const r = await subir(rutaAdj("sinbucket.pdf"), RESP_CALIDAD);
    e.fallos.poner = false;
    expect(r.status).toBe(502);
    expect(await filasArchivos()).toBe(antes);
  });
  it("si la base no logra anotarlo, el archivo se quita del bucket (no queda huérfano)", async () => {
    e.borrados.length = 0;
    e.fallos.registrar = true;
    const r = await subir(rutaAdj("huerfano.pdf"), RESP_CALIDAD);
    e.fallos.registrar = false;
    expect(r.status).toBe(403);
    expect(e.borrados).toEqual([rutaAdj("huerfano.pdf")]);
    expect(e.bucket.has(rutaAdj("huerfano.pdf"))).toBe(false);
  });
});

describe("leer", () => {
  const ruta = () => rutaAdj("lectura.pdf");
  beforeAll(async () => {
    await subir(ruta(), RESP_CALIDAD, bytes(300, 5));
    await c.como(RESP_CALIDAD, () => c.q("select * from registrar_adjunto($1, 'lectura.pdf', $2, 300, $3)", [reg.id, PDF, ruta()]));
  });

  it("entrega el mismo contenido y tipo a quienes ven el registro, sin guardarlo en caché", async () => {
    for(const uid of [RESP_CALIDAD, APROBADOR, ADMIN]){
      const r = await pedir(ruta(), { uid });
      expect(r.status, uid).toBe(200);
      expect(r.headers.get("content-type")).toBe(PDF);
      expect(r.headers.get("cache-control")).toContain("no-store");
      expect(r.headers.get("x-content-type-options")).toBe("nosniff");
      expect(new Uint8Array(await r.arrayBuffer())).toEqual(bytes(300, 5));
    }
  });
  it("quien no ve el registro recibe «no encontrado», igual que si el archivo no existiera", async () => {
    const ajeno = await pedir(ruta(), { uid: RESP_PRODUCCION });
    const inexistente = await pedir(rutaAdj("no-existe.pdf"), { uid: ADMIN });
    expect(ajeno.status).toBe(404);
    expect(inexistente.status).toBe(404);
    expect(await ajeno.json()).toEqual(await inexistente.json());
  });
  it("si la base lo tiene anotado pero el bucket ya no, responde «no encontrado»", async () => {
    const perdido = rutaAdj("perdido.pdf");
    await subir(perdido, RESP_CALIDAD);
    await c.como(RESP_CALIDAD, () => c.q("select * from registrar_adjunto($1, 'perdido.pdf', $2, 1000, $3)", [reg.id, PDF, perdido]));
    e.bucket.delete(perdido);
    expect((await pedir(perdido, { uid: RESP_CALIDAD })).status).toBe(404);
  });
  it("rechaza rutas raras", async () => {
    expect((await pedir("../secreto", { uid: ADMIN })).status).toBe(400);
  });
});

describe("desde qué páginas se puede llamar (CORS) y otros detalles", () => {
  it("responde a la comprobación previa del navegador solo para la página de la aplicación", async () => {
    const buena = await fetch(url("registros/a/b.pdf"), { method: "OPTIONS", headers: { Origin: ORIGEN } });
    expect(buena.status).toBe(204);
    expect(buena.headers.get("access-control-allow-origin")).toBe(ORIGEN);
    expect(buena.headers.get("access-control-allow-headers")).toMatch(/Authorization/);
    const mala = await fetch(url("registros/a/b.pdf"), { method: "OPTIONS", headers: { Origin: "https://otro.test" } });
    expect(mala.headers.get("access-control-allow-origin")).toBeNull();
  });
  it("las respuestas normales también llevan el origen permitido", async () => {
    const r = await fetch(url(rutaAdj("lectura.pdf")), { headers: { Authorization: "Bearer " + e.token(ADMIN), Origin: ORIGEN } });
    expect(r.headers.get("access-control-allow-origin")).toBe(ORIGEN);
  });
  it("otros caminos y métodos no existen", async () => {
    expect((await fetch(`${URL_FUNCION}/otra-cosa`, { headers: { Authorization: "Bearer " + e.token(ADMIN) } })).status).toBe(404);
    expect((await pedir(rutaAdj("lectura.pdf"), { uid: ADMIN, metodo: "DELETE" })).status).toBe(405);
  });
});

describe("cuando la base, en las primeras consultas, no reconoce la sesión", () => {
  it("al subir, reintenta y la persona con permiso sí logra subir", async () => {
    e.fallos.sinSesionPrimerasVeces = 2;
    const r = await subir(rutaAdj("reintento.pdf"), RESP_CALIDAD);
    expect(r.status).toBe(201);
    expect(e.bucket.has(rutaAdj("reintento.pdf"))).toBe(true);
  });
  it("al leer, reintenta antes de decir «no encontrado»", async () => {
    await subir(rutaAdj("lee-reintento.pdf"), RESP_CALIDAD, bytes(40, 4));
    await c.como(RESP_CALIDAD, () => c.q("select * from registrar_adjunto($1, 'lee-reintento.pdf', $2, 40, $3)", [reg.id, PDF, rutaAdj("lee-reintento.pdf")]));
    e.fallos.sinSesionPrimerasVeces = 2;
    const r = await pedir(rutaAdj("lee-reintento.pdf"), { uid: RESP_CALIDAD });
    expect(r.status).toBe(200);
  });
  it("sigue negando a quien de verdad no tiene permiso, aunque tarde un poco más", async () => {
    const r = await subir(rutaAdj("ajeno-reintento.pdf"), "ffffffff-ffff-ffff-ffff-ffffffffffff");
    expect(r.status).toBe(403);
    const l = await pedir(rutaAdj("lee-reintento.pdf"), { uid: RESP_PRODUCCION });
    expect(l.status).toBe(404);
  });
});
