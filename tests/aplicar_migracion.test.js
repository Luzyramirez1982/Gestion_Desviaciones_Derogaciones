// Prueba de la migración aplicada de verdad sobre la base de datos de pruebas:
// que quede todo, que se pueda repetir sin duplicar y que no pise trabajo ya hecho.
import { describe, it, expect, beforeAll } from "vitest";
import { iniciarBD } from "./ayuda_bd.js";
import { exportacion, U_ADMIN, U_JUAN } from "./fixture_v1.js";
import { planificar } from "../src/migracion/v1a2.js";
import { aplicarPlan, decodificarDataUrl, proyectoCoincide } from "../src/migracion/aplicar.js";

let db, como, q, crear;
const subidos = [];

// Cliente que escribe en las tablas igual que lo hace el script real con la clave del servidor.
function clientePrueba(falla = null){
  const columnas = (filas) => [...new Set(filas.flatMap(f => Object.keys(f)))];
  const insertar = (tabla, filas, alConflicto = "") => {
    const cols = columnas(filas).join(", ");
    return q(`insert into ${tabla} (${cols}) select ${cols} from jsonb_populate_recordset(null::${tabla}, $1::jsonb) ${alConflicto}`, [JSON.stringify(filas)]);
  };
  return {
    async upsert(tabla, filas, unica){
      if(falla === tabla) throw new Error("fallo de prueba");
      if(!filas.length) return;
      const sets = columnas(filas).filter(c => c !== unica).map(c => `${c} = excluded.${c}`).join(", ");
      await insertar(tabla, filas, `on conflict (${unica}) do update set ${sets}`);
    },
    async reemplazar(tabla, columna, valor, filas){
      await q(`delete from ${tabla} where ${columna} = $1`, [valor]);
      if(filas.length) await insertar(tabla, filas);
    },
    async subir(ruta, bytes, tipo){ subidos.push({ ruta, bytes, tipo }); },
    async contar(tabla){ return q(`select count(*)::int as n from ${tabla}`).then(r => r[0].n); },
    async establecerConsecutivo(n){ await q("select establecer_consecutivo($1)", [n]); },
  };
}

const contar = (tabla) => q(`select count(*)::int as n from ${tabla}`).then(r => r[0].n);
const plan = planificar(exportacion, { ahora: "2026-10-29T12:00:00.000Z" });

beforeAll(async () => {
  ({ db, como, q, crear } = await iniciarBD());
  // Las cuentas de acceso de la versión anterior ya existen en "auth"; las personas de ejemplo de las pruebas se quitan.
  await db.exec(`alter table perfiles disable trigger perfiles_proteger_admin_trg;
    delete from perfiles; delete from auth.users;
    alter table perfiles enable trigger perfiles_proteger_admin_trg;`);
  for(const p of plan.perfiles) await q("insert into auth.users (id, email) values ($1, $2)", [p.id, p.correo]);
});

describe("aplicar la migración", () => {
  it("guarda todo y devuelve el resumen", async () => {
    const pasos = [];
    const hecho = await aplicarPlan(plan, clientePrueba(), { alAvanzar: p => pasos.push(p) });
    expect(hecho).toEqual({ areas: 3, tipos: 1, perfiles: 3, registros: 2, bitacora: 2, firmas: 4, adjuntos: 1, archivos: 4, eliminados: 1 });
    expect(pasos).toEqual(["áreas", "personas", "tipos", "ajustes", "registros", "archivos", "historial, firmas y adjuntos", "registros eliminados", "consecutivo"]);
    expect(await contar("registros")).toBe(2);
    expect(await contar("auditoria_eliminados")).toBe(1);
    expect(await q("select valor from configuracion where clave = 'app'")).toEqual([{ valor: { url: "https://matec.pages.dev" } }]);
  });
  it("sube los archivos con su ruta y su tipo, decodificados", () => {
    expect(subidos.map(s => s.ruta).sort()).toEqual([
      "firmas/migracion/MTC-001-aprob.png", "firmas/migracion/MTC-001-sol.png",
      "firmas/migracion/MTC-009-sol.png", "registros/MTC-001/1-Informe_tecnico_nandu.pdf",
    ]);
    const pdf = subidos.find(s => s.ruta.endsWith(".pdf"));
    expect(pdf.tipo).toBe("application/pdf");
    expect(pdf.bytes.toString("latin1")).toBe("%PDF-1.4");
  });
  it("lo que queda en la base apunta a los archivos subidos", async () => {
    const rutas = [...(await q("select ruta from adjuntos")).map(r => r.ruta), ...(await q("select ruta_imagen as ruta from firmas where ruta_imagen <> ''")).map(r => r.ruta)];
    for(const ruta of rutas) expect(subidos.map(s => s.ruta)).toContain(ruta);
  });
  it("el siguiente consecutivo continúa después del último, y nunca retrocede", async () => {
    await q("select establecer_consecutivo(3)");
    const r = await como(U_JUAN, () => crear({ tipoGestion: "Desviación", area: "Calidad Producto" }));
    expect(r.id).toBe("MTC-010");
  });
  it("las personas ven lo suyo y quedan los datos intactos", async () => {
    expect(await como(U_ADMIN, () => q("select id from registros where id in ('MTC-001', 'MTC-002') order by id"))).toHaveLength(2);
    const [{ data }] = await q("select data from registros where id = 'MTC-001'");
    expect(data.reportadoPorId).toBe(U_JUAN);
  });
});

describe("repetir la migración", () => {
  it("por defecto se niega si la base ya tiene registros, para no pisar trabajo real", async () => {
    await expect(aplicarPlan(plan, clientePrueba())).rejects.toThrow(/ya tiene registros/);
  });
  it("si se permite repetir, no duplica nada", async () => {
    const antes = { bitacora: await contar("bitacora"), firmas: await contar("firmas"), adjuntos: await contar("adjuntos"), huellas: await contar("auditoria_eliminados"), perfiles: await contar("perfiles") };
    await aplicarPlan(plan, clientePrueba(), { permitirRepetir: true });
    expect({ bitacora: await contar("bitacora"), firmas: await contar("firmas"), adjuntos: await contar("adjuntos"), huellas: await contar("auditoria_eliminados"), perfiles: await contar("perfiles") }).toEqual(antes);
  });
  it("si un paso falla, dice cuál", async () => {
    await expect(aplicarPlan(plan, clientePrueba("registros"), { permitirRepetir: true })).rejects.toThrow(/Falló el paso "registros": fallo de prueba/);
  });
});

describe("registros eliminados varias veces", () => {
  it("se guardan todas las huellas del mismo registro", async () => {
    const dos = structuredClone(exportacion);
    dos.registros_eliminados.push({ ...structuredClone(dos.registros_eliminados[0]), id: "del-2" });
    dos.registros_eliminados[1].data.id = "del-2";
    dos.registros_eliminados[1].data.motivo = "Segunda eliminación";
    const hecho = await aplicarPlan(planificar(dos, { ahora: "2026-10-29T12:00:00.000Z" }), clientePrueba(), { permitirRepetir: true });
    expect(hecho.eliminados).toBe(2);
    expect(await q("select motivo from auditoria_eliminados where registro_id = 'MTC-009' order by motivo")).toEqual([{ motivo: "Duplicado" }, { motivo: "Segunda eliminación" }]);
  });
});

describe("seguridad de la función del consecutivo", () => {
  it("ninguna persona con sesión la puede llamar", async () => {
    await expect(como(U_ADMIN, () => q("select establecer_consecutivo(999)"))).rejects.toThrow(/permission denied/);
    await expect(como(null, () => q("select establecer_consecutivo(999)"))).rejects.toThrow(/permission denied/);
  });
});

describe("archivos en formato de datos", () => {
  it("decodifica base64 y texto", () => {
    expect(decodificarDataUrl("data:text/plain;base64,aG9sYQ==").bytes.toString()).toBe("hola");
    expect(decodificarDataUrl("data:text/plain,hola%20mundo").bytes.toString()).toBe("hola mundo");
  });
  it("rechaza lo que no es un archivo en ese formato", () => {
    expect(() => decodificarDataUrl("no es un archivo")).toThrow(/formato de datos válido/);
    expect(() => decodificarDataUrl("")).toThrow(/formato de datos válido/);
  });
});

describe("protección contra el proyecto equivocado", () => {
  it("el identificador debe ser el de la dirección de Supabase", () => {
    expect(proyectoCoincide("https://abcdefghij.supabase.co", "abcdefghij")).toBe(true);
    expect(proyectoCoincide("https://abcdefghij.supabase.co", "ABCDEFGHIJ")).toBe(true);
    expect(proyectoCoincide("https://abcdefghij.supabase.co", "otroproyecto")).toBe(false);
    expect(proyectoCoincide("https://abcdefghij.supabase.co", "abc")).toBe(false);
    expect(proyectoCoincide("https://abcdefghij.supabase.co", "")).toBe(false);
    expect(proyectoCoincide("https://abcdefghij.supabase.co", undefined)).toBe(false);
    expect(proyectoCoincide("no-es-una-url", "abcdefghij")).toBe(false);
    expect(proyectoCoincide("https://malo.com/abcdefghij.supabase.co", "abcdefghij")).toBe(false);
  });
});
