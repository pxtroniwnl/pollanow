import { describe, it, expect } from "vitest";
import { FootballDataProvider } from "./football-data";
import { resolveTeamCode } from "./team-map";

function mockFetch(routes: Record<string, any>) {
  return async (url: string) => {
    const key = Object.keys(routes).find((k) => url.includes(k));
    if (!key) return { ok: false, status: 404, json: async () => ({}) };
    return { ok: true, status: 200, json: async () => routes[key] };
  };
}

describe("resolveTeamCode", () => {
  it("mapea nombres en ingles a codigos internos", () => {
    expect(resolveTeamCode("Mexico")).toBe("MEXICO");
    expect(resolveTeamCode("South Korea")).toBe("COREA");
    expect(resolveTeamCode("Türkiye")).toBe("TURQUIA");
    expect(resolveTeamCode("Côte d'Ivoire")).toBe("CDMARFIL");
    expect(resolveTeamCode("Netherlands")).toBe("HOLANDA");
  });
  it("devuelve null para desconocidos", () => {
    expect(resolveTeamCode("Atlantis")).toBeNull();
  });
});

describe("FootballDataProvider.getGroupStageMatches", () => {
  it("mapea partidos del API a nuestro modelo", async () => {
    const fetchImpl = mockFetch({
      "/matches": {
        matches: [
          {
            id: 101, utcDate: "2026-06-11T18:00:00Z", status: "FINISHED",
            matchday: 1, stage: "GROUP_STAGE", group: "GROUP_A",
            homeTeam: { name: "Mexico" }, awayTeam: { name: "South Korea" },
            score: { fullTime: { home: 2, away: 0 } },
          },
          {
            id: 102, utcDate: "2026-06-12T18:00:00Z", status: "TIMED",
            matchday: 1, stage: "GROUP_STAGE", group: "GROUP_B",
            homeTeam: { name: "Switzerland" }, awayTeam: { name: "Canada" },
            score: { fullTime: { home: null, away: null } },
          },
          {
            id: 999, utcDate: "2026-07-01T18:00:00Z", status: "SCHEDULED",
            stage: "LAST_16", group: null,
            homeTeam: { name: "Spain" }, awayTeam: { name: "Brazil" },
            score: { fullTime: { home: null, away: null } },
          },
        ],
      },
    });
    const provider = new FootballDataProvider({ apiKey: "x", fetchImpl, baseUrl: "" });
    const matches = await provider.getGroupStageMatches();
    expect(matches).toHaveLength(2); // descarta el de octavos
    const first = matches[0];
    expect(first).toMatchObject({
      id: "101", group: "A", home: "MEXICO", away: "COREA",
      status: "FINISHED", homeScore: 2, awayScore: 0,
    });
    expect(matches[1]).toMatchObject({ group: "B", status: "SCHEDULED", homeScore: null });
  });

  it("lanza error en respuesta no-ok", async () => {
    const fetchImpl = async () => ({ ok: false, status: 429, json: async () => ({}) });
    const provider = new FootballDataProvider({ apiKey: "x", fetchImpl, baseUrl: "" });
    await expect(provider.getGroupStageMatches()).rejects.toThrow(/429/);
  });
});

describe("FootballDataProvider.getTopScorers", () => {
  it("mapea goleadores con su equipo", async () => {
    const fetchImpl = mockFetch({
      "/scorers": {
        scorers: [
          { player: { name: "X" }, team: { name: "Argentina" }, goals: 5 },
          { player: { name: "Y" }, team: { name: "France" }, goals: 4 },
        ],
      },
    });
    const provider = new FootballDataProvider({ apiKey: "x", fetchImpl, baseUrl: "" });
    const s = await provider.getTopScorers();
    expect(s[0]).toMatchObject({ teamCode: "ARGENTINA", goals: 5 });
  });
});
