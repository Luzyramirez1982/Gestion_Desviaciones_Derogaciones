// La migración 0006 agrega "registros" a la publicación de tiempo real solo si existe, y se puede repetir.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { iniciarBD } from "./ayuda_bd.js";

const sql = readFileSync(new URL("../supabase/migrations/0006_tiempo_real.sql", import.meta.url), "utf8");
const publicadas = (q) => q("select tablename from pg_publication_tables where pubname = 'supabase_realtime'").then(r => r.map(x => x.tablename));

describe("migración 0006: tiempo real", () => {
  it("sin la publicación no hace nada ni da error, y se puede repetir", async () => {
    const { db, q } = await iniciarBD();
    await db.exec(sql);
    await db.exec(sql);
    expect(await q("select 1 from pg_publication where pubname = 'supabase_realtime'")).toHaveLength(0);
  });
  it("con la publicación agrega registros una sola vez", async () => {
    const { db, q } = await iniciarBD({ antes: "create publication supabase_realtime;" });
    expect(await publicadas(q)).toEqual(["registros"]);   // ya la agregó la propia migración al correr 0006
    await db.exec(sql);
    await db.exec(sql);
    expect(await publicadas(q)).toEqual(["registros"]);
  });
  it("no toca otras tablas ni los datos", async () => {
    const { db, q } = await iniciarBD({ antes: "create publication supabase_realtime;" });
    await db.exec(sql);
    expect(await publicadas(q)).not.toContain("bitacora");
    expect(await q("select count(*)::int as n from perfiles")).toEqual([{ n: 4 }]);
  });
});
