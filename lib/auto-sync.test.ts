import { describe, expect, it } from "vitest";
import { isSyncStale } from "./auto-sync";

const AHORA = Date.parse("2026-06-12T19:30:00Z");

describe("isSyncStale", () => {
  it("no está viejo si el sync fue hace menos de 3 minutos", () => {
    expect(isSyncStale("2026-06-12T19:28:30Z", AHORA)).toBe(false);
  });

  it("está viejo si el sync fue hace más de 3 minutos", () => {
    expect(isSyncStale("2026-06-12T19:20:00Z", AHORA)).toBe(true);
  });

  it("está viejo si nunca ha habido sync", () => {
    expect(isSyncStale(null, AHORA)).toBe(true);
  });

  it("está viejo si la fecha no se puede parsear", () => {
    expect(isSyncStale("no-es-fecha", AHORA)).toBe(true);
  });
});
