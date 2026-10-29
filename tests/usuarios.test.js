// Pruebas del alta de personas y de lo que ve una cuenta de ingreso que no está dada de alta en la aplicación.
import { describe, it, expect, beforeAll } from "vitest";
import { iniciarBD, ADMIN, RESP_CALIDAD, APROBADOR, solicitud } from "./ayuda_bd.js";

let db, como, q, crear;
beforeAll(async () => {
  ({ db, como, q, crear } = await iniciarBD());
  await db.query("insert into areas (nombre) values ('Calidad Producto'), ('Producción') on conflict do nothing");
});

const EXTRANO = "ffffffff-ffff-ffff-ffff-ffffffffffff";   // alguien que se registró solo en el servicio de ingreso
const uno = (texto, params) => q(texto, params).then(r => r[0]);
const alta = (quien, ...args) => como(quien, () => uno("select * from crear_perfil($1, $2, $3, $4, $5)", args));

describe("una cuenta de ingreso sin perfil en la aplicación", () => {
  it("no ve personas, áreas, tipos, ajustes ni registros", async () => {
    await como(RESP_CALIDAD, () => crear(solicitud()));
    for(const tabla of ["perfiles", "areas", "tipos", "configuracion", "registros", "bitacora", "firmas", "adjuntos", "archivos"]){
      expect(await como(EXTRANO, () => q(`select * from ${tabla}`)), tabla).toHaveLength(0);
    }
  });
  it("no puede crear solicitudes ni subir archivos", async () => {
    await expect(como(EXTRANO, () => crear(solicitud()))).rejects.toThrow();
    await expect(como(EXTRANO, () => q("select subir_archivo('firmas/x/y.png', 'image/png', 'AAAA')"))).rejects.toThrow(/No tiene permiso/);
  });
  it("tampoco puede darse de alta a sí misma", async () => {
    await expect(alta(EXTRANO, EXTRANO, "Intruso", "i@x.co", "Administrador", "")).rejects.toThrow(/Solo el Administrador/);
    await expect(como(EXTRANO, () => q("insert into perfiles (id, nombre, correo, rol) values ($1, 'I', 'i@x.co', 'Administrador')", [EXTRANO])))
      .rejects.toThrow(/permission denied/);
  });
});

describe("dar de alta personas", () => {
  it("el Administrador anota a una persona nueva, que queda con cambio de contraseña pendiente", async () => {
    const p = await alta(ADMIN, "nuevo-1", "  Laura Gómez ", "Laura@X.co ", "Responsable del proceso", "Calidad Producto");
    expect(p).toMatchObject({ id: "nuevo-1", nombre: "Laura Gómez", correo: "laura@x.co", rol: "Responsable del proceso", area: "Calidad Producto", activo: true, debe_cambiar_clave: true });
  });
  it("después de anotada, la persona ya ve los datos de apoyo", async () => {
    const filas = await como("nuevo-1", () => q("select nombre from perfiles"));
    expect(filas.length).toBeGreaterThan(0);
  });
  it("nadie más que el Administrador puede anotar personas", async () => {
    for(const quien of [RESP_CALIDAD, APROBADOR]){
      await expect(alta(quien, "x-" + quien, "Otro", "o@x.co", "Aprobador autorizado", "")).rejects.toThrow(/Solo el Administrador/);
    }
    await expect(como(null, () => q("select * from crear_perfil('x','a','a@x.co','Administrador','')"))).rejects.toThrow(/permission denied/);
  });
  it("valida el correo, el rol, el área y que no se repita", async () => {
    await expect(alta(ADMIN, "n2", "Ana", "sin-arroba", "Aprobador autorizado", "")).rejects.toThrow(/correo no es válido/);
    await expect(alta(ADMIN, "n3", "Ana", "ana@x.co", "Jefe supremo", "")).rejects.toThrow(/rol no es válido/);
    await expect(alta(ADMIN, "n4", "Ana", "ana@x.co", "Responsable del proceso", "")).rejects.toThrow(/debe tener un área/);
    await expect(alta(ADMIN, "n5", "Ana", "ana@x.co", "Responsable del proceso", "Inventada")).rejects.toThrow(/área no existe/);
    await expect(alta(ADMIN, "n6", "", "ana@x.co", "Aprobador autorizado", "")).rejects.toThrow(/nombre/);
    await expect(alta(ADMIN, "nuevo-1", "Ana", "otra@x.co", "Aprobador autorizado", "")).rejects.toThrow(/duplicate key/);
    await expect(alta(ADMIN, "n7", "Ana", "laura@x.co", "Aprobador autorizado", "")).rejects.toThrow(/duplicate key/);
  });
});
