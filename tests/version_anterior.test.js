// Prueba de la puesta en marcha sobre un Supabase que ya tenía la versión anterior de la app:
// las tablas viejas se apartan sin perder datos y las nuevas se crean sin chocar con ellas.
import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "node:fs";
import { iniciarBD, ADMIN, RESP_CALIDAD, solicitud } from "./ayuda_bd.js";

// Lo mismo que ya está en el Supabase de la clienta: el esquema anterior y algunos datos.
const esquemaV1 = readFileSync(new URL("../supabase_schema.sql", import.meta.url), "utf8");
const datosV1 = `
  insert into registros (id, data) values ('MTC-001', '{"id":"MTC-001","area":"Producción"}'), ('MTC-002', '{"id":"MTC-002"}');
  insert into usuarios (id, data) values ('u1', '{"nombre":"Natalia","correo":"natalia@matec.com.co"}');
  insert into tipos_desviacion (id, area, data) values ('t1', 'Producción', '{"nombre":"Un tipo"}');
  insert into configuracion (id, data) values ('app', '{"url":"https://x.pages.dev"}'), ('areas', '{"areas":["Producción"]}');
  insert into registros_eliminados (id, data) values ('del-1', '{"registroId":"MTC-009"}');
`;

let db, como, q, crear;
beforeAll(async () => { ({ db, como, q, crear } = await iniciarBD({ antes: esquemaV1 + datosV1 })); });

describe("sobre una base que ya tenía la versión anterior", () => {
  it("las tablas viejas se conservan con todos sus datos, con otro nombre", async () => {
    expect(await q("select count(*)::int as n from registros_v1")).toEqual([{ n: 2 }]);
    expect(await q("select count(*)::int as n from usuarios_v1")).toEqual([{ n: 1 }]);
    expect(await q("select count(*)::int as n from tipos_desviacion_v1")).toEqual([{ n: 1 }]);
    expect(await q("select count(*)::int as n from configuracion_v1")).toEqual([{ n: 2 }]);
    expect(await q("select count(*)::int as n from registros_eliminados_v1")).toEqual([{ n: 1 }]);
    const [{ data }] = await q("select data from registros_v1 where id = 'MTC-001'");
    expect(data.area).toBe("Producción");
  });
  it("las tablas nuevas existen con la estructura nueva y vacías", async () => {
    const cols = await q("select column_name from information_schema.columns where table_name = 'registros' and table_schema = 'public'");
    expect(cols.map(c => c.column_name)).toContain("tipo_gestion");
    expect(await q("select count(*)::int as n from registros")).toEqual([{ n: 0 }]);
    const cfg = await q("select column_name from information_schema.columns where table_name = 'configuracion' and table_schema = 'public'");
    expect(cfg.map(c => c.column_name).sort()).toEqual(["clave", "valor"]);
  });
  it("las tablas viejas quedan cerradas: nadie con sesión las lee ni las cambia", async () => {
    for(const t of ["registros_v1", "usuarios_v1", "tipos_desviacion_v1", "configuracion_v1", "registros_eliminados_v1"]){
      await expect(como(ADMIN, () => q(`select * from ${t}`))).rejects.toThrow(/permission denied/);
      await expect(como(RESP_CALIDAD, () => q(`delete from ${t}`))).rejects.toThrow(/permission denied/);
      await expect(como(null, () => q(`select * from ${t}`))).rejects.toThrow(/permission denied/);
    }
    const politicas = await q("select count(*)::int as n from pg_policies where tablename like '%\\_v1'");
    expect(politicas).toEqual([{ n: 0 }]);
  });
  it("la aplicación nueva funciona normalmente sobre esa base", async () => {
    const r = await como(RESP_CALIDAD, () => crear(solicitud()));
    expect(r.id).toBe("MTC-001");
  });
  it("ejecutar el paso 0 otra vez no cambia nada", async () => {
    await db.exec(readFileSync(new URL("../supabase/migrations/0000_apartar_version_anterior.sql", import.meta.url), "utf8"));
    expect(await q("select count(*)::int as n from registros_v1")).toEqual([{ n: 2 }]);
    expect(await q("select count(*)::int as n from registros")).toEqual([{ n: 1 }]);
  });
});
