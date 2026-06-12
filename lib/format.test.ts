import { describe, expect, it } from "vitest";
import { kickoffLabel } from "./format";

// Las horas siempre en hora de Colombia (America/Bogota, UTC-5), sin importar
// la zona horaria del servidor que renderiza.
describe("kickoffLabel", () => {
  it("convierte el kickoff UTC a hora de Colombia", () => {
    // México-Sudáfrica: 19:00 UTC del 11 jun = 14:00 en Colombia.
    const label = kickoffLabel("2026-06-11T19:00:00+00:00");
    expect(label).toContain("14:00");
    expect(label).toMatch(/jue/i);
    expect(label).toContain("11");
  });

  it("mueve al día anterior los partidos de madrugada UTC", () => {
    // Corea-Chequia: 02:00 UTC del 12 jun = 21:00 del 11 jun en Colombia.
    const label = kickoffLabel("2026-06-12T02:00:00+00:00");
    expect(label).toContain("21:00");
    expect(label).toContain("11");
    expect(label).not.toContain("12");
  });

  it("devuelve cadena vacía si no hay kickoff", () => {
    expect(kickoffLabel("")).toBe("");
  });
});
