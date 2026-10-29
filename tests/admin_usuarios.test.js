import { describe, it, expect } from "vitest";
import { generarClaveTemporal, permitido, validarSolicitud } from "../supabase/functions/admin-usuarios/logica.js";
import { validarClave } from "../src/auth/clave.js";

const ID = "10000000-0000-0000-0000-000000000001";

describe("solicitudes a la función de usuarios", () => {
  it("rechaza lo que no es una solicitud o una acción desconocida", () => {
    for(const malo of [null, undefined, "texto", 5, {}, { accion: "borrar-todo" }]) expect(validarSolicitud(malo).ok).toBe(false);
  });
  it("crear exige nombre, correo, rol válido y limpia los datos", () => {
    const ok = validarSolicitud({ accion: "crear", nombre: "  Ana Pérez ", correo: " ANA@Matec.com.co ", rol: "Aprobador autorizado", area: " Producción " });
    expect(ok).toEqual({ ok: true, datos: { accion: "crear", nombre: "Ana Pérez", correo: "ana@matec.com.co", rol: "Aprobador autorizado", area: "Producción" } });
    expect(validarSolicitud({ accion: "crear", nombre: "An", correo: "a@b.co", rol: "Administrador" }).error).toMatch(/nombre/);
    expect(validarSolicitud({ accion: "crear", nombre: "Ana Pérez", correo: "sin-arroba", rol: "Administrador" }).error).toMatch(/correo/);
    expect(validarSolicitud({ accion: "crear", nombre: "Ana Pérez", correo: "a@b.co", rol: "Superusuario" }).error).toMatch(/rol/);
  });
  it("las demás acciones exigen el identificador de la persona", () => {
    for(const accion of ["restablecer", "desactivar", "activar"]){
      expect(validarSolicitud({ accion, id: ID })).toEqual({ ok: true, datos: { accion, id: ID } });
      expect(validarSolicitud({ accion, id: "no-es-un-id" }).ok).toBe(false);
      expect(validarSolicitud({ accion }).ok).toBe(false);
    }
  });
  it("recorta textos demasiado largos", () => {
    const r = validarSolicitud({ accion: "crear", nombre: "N".repeat(500), correo: "a@b.co", rol: "Administrador", area: "A".repeat(500) });
    expect(r.datos.nombre).toHaveLength(120);
    expect(r.datos.area).toHaveLength(120);
  });
});

describe("contraseña temporal", () => {
  const azarReal = (n) => Math.floor(Math.random() * n);
  it("siempre cumple las reglas de contraseña de la aplicación", () => {
    for(let i = 0; i < 300; i++){
      const clave = generarClaveTemporal(azarReal);
      expect(clave).toHaveLength(10);
      expect(validarClave(clave, clave)).toBe("");
      expect(clave).toMatch(/[A-Z]/);
      expect(clave).toMatch(/[a-z]/);
      expect(clave).toMatch(/[2-9]/);
      expect(clave).toMatch(/[#$%*+?]/);
      expect(clave).not.toMatch(/[IlO01]/);
    }
  });
  it("no repite la misma contraseña", () => {
    expect(new Set(Array.from({ length: 200 }, () => generarClaveTemporal(azarReal))).size).toBe(200);
  });
});

describe("quién puede usar la función", () => {
  const admin = { id: ID, rol: "Administrador", activo: true };
  it("solo un Administrador activo", () => {
    expect(permitido(admin, { accion: "crear" }).ok).toBe(true);
    expect(permitido({ ...admin, rol: "Aprobador autorizado" }, { accion: "crear" }).ok).toBe(false);
    expect(permitido({ ...admin, activo: false }, { accion: "crear" }).ok).toBe(false);
    expect(permitido(null, { accion: "crear" }).ok).toBe(false);
  });
  it("nadie desactiva su propia cuenta, pero sí la de otra persona", () => {
    expect(permitido(admin, { accion: "desactivar", id: ID }).error).toMatch(/propia/);
    expect(permitido(admin, { accion: "desactivar", id: "20000000-0000-0000-0000-000000000002" }).ok).toBe(true);
    expect(permitido(admin, { accion: "restablecer", id: ID }).ok).toBe(true);
  });
});
