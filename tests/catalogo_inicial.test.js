// El catálogo inicial (scripts/cargar-catalogo.mjs) debe poder cargarse en la base y repetirse sin error.
import { describe, it, expect, beforeAll } from "vitest";
import { iniciarBD } from "./ayuda_bd.js";
import { TIPOS_POR_DEFECTO } from "../src/dominio/catalogo.js";

let db;
beforeAll(async () => { ({ db } = await iniciarBD()); });

// Lo mismo que hace el script, con las mismas instrucciones.
async function cargar(){
  const areas = [...new Set(TIPOS_POR_DEFECTO.map(t => t.area))];
  for(const [orden, nombre] of areas.entries())
    await db.query("insert into areas (nombre, orden) values ($1, $2) on conflict do nothing", [nombre, orden]);
  for(const { id, area, nombre, ...resto } of TIPOS_POR_DEFECTO)
    await db.query("insert into tipos (id, area, nombre, data) values ($1, $2, $3, $4) on conflict do nothing", [id, area, nombre, JSON.stringify(resto)]);
}

describe("catálogo inicial", () => {
  it("carga las áreas y todos los tipos", async () => {
    await cargar();
    const areas = (await db.query("select count(*)::int as n from areas")).rows[0].n;
    const tipos = (await db.query("select count(*)::int as n from tipos")).rows[0].n;
    expect(areas).toBe(new Set(TIPOS_POR_DEFECTO.map(t => t.area)).size);
    expect(tipos).toBe(TIPOS_POR_DEFECTO.length);
  });
  it("se puede repetir sin duplicar ni fallar", async () => {
    await cargar();
    expect((await db.query("select count(*)::int as n from tipos")).rows[0].n).toBe(TIPOS_POR_DEFECTO.length);
  });
  it("cada tipo conserva su descripción", async () => {
    const t = (await db.query("select data from tipos where id = $1", [TIPOS_POR_DEFECTO[TIPOS_POR_DEFECTO.length - 1].id])).rows[0];
    expect(t.data.desc).toBe(TIPOS_POR_DEFECTO[TIPOS_POR_DEFECTO.length - 1].desc);
  });
});
