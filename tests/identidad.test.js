// mi_id() (db/migraciones/0008): cuando Neon despierta de dormir, auth.user_id() a veces no responde
// todavía aunque el token sí llegó con la petición. Estas pruebas simulan justo ese caso.
import { describe, it, expect, beforeEach } from "vitest";
import { iniciarBD, ADMIN } from "./ayuda_bd.js";

describe("mi_id(): reconocer la sesión aunque auth.user_id() falle", () => {
  let db, q;
  beforeEach(async () => { ({ db, q } = await iniciarBD()); });

  it("si el token llegó (request.jwt.claims) pero auth.user_id() está vacío, igual se reconoce a la persona", async () => {
    await db.exec("set role authenticated");
    // No se pone request.jwt.claim.sub (lo que lee auth.user_id()), solo el token completo,
    // que es lo que Neon manda siempre con la petición aunque auth.user_id() no lo haya leído todavía.
    await db.query("select set_config('request.jwt.claims', $1, false)", [JSON.stringify({ sub: ADMIN })]);

    const [{ id }] = await q("select mi_id() as id");
    expect(id).toBe(ADMIN);
    const [{ rol }] = await q("select mi_rol() as rol");
    expect(rol).toBe("Administrador");
    // Antes de este cambio, esta lista llegaba vacía en este mismo caso.
    const perfiles = await q("select * from perfiles");
    expect(perfiles.length).toBeGreaterThan(0);
    await db.exec("reset role");
  });

  it("si no llega ni la sesión ni el token, sigue sin ver nada (no se abre un hueco de seguridad)", async () => {
    await db.exec("set role authenticated");
    const [{ id }] = await q("select mi_id() as id");
    expect(id).toBeNull();
    const perfiles = await q("select * from perfiles");
    expect(perfiles).toEqual([]);
    await db.exec("reset role");
  });
});
