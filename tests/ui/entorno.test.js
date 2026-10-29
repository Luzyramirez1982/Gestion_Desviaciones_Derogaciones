import { describe, it, expect } from "vitest";

describe("entorno de pruebas de interfaz", () => {
  it("tiene un documento disponible (jsdom)", () => {
    document.body.innerHTML = '<div id="app"></div>';
    expect(document.getElementById("app")).not.toBeNull();
  });
});
