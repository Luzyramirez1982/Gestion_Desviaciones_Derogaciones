import { describe, it, expect } from "vitest";
import { nombreSeguro } from "../src/util/nombreArchivo.js";

describe("nombre de archivo seguro", () => {
  it("quita tildes, espacios y símbolos, y conserva la extensión", () => {
    expect(nombreSeguro("Informe técnico ñandú.pdf")).toBe("Informe_tecnico_nandu.pdf");
    expect(nombreSeguro("../../etc/pass wd")).toBe("etc_pass_wd");
  });
  it("si no hay nombre usa uno por defecto y recorta los muy largos", () => {
    expect(nombreSeguro("")).toBe("archivo");
    expect(nombreSeguro("a".repeat(300) + ".png").length).toBeLessThanOrEqual(92);
  });
});
