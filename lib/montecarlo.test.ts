import { describe, it, expect } from "vitest";
import { mulberry32, runMonteCarlo } from "./montecarlo";
import type { GroupState, Match, Team, PlayerPredictions } from "./types";

function team(code: string, elo: number): Team {
  return { code, name: code, group: "A", flag: "", elo };
}
function fin(id: string, home: string, away: string, hs: number, as: number): Match {
  return {
    id, group: "A", matchday: 1, home, away,
    kickoff: "2026-06-11T18:00:00Z",
    status: "FINISHED", homeScore: hs, awayScore: as,
  };
}
function sched(id: string, home: string, away: string): Match {
  return {
    id, group: "A", matchday: 1, home, away,
    kickoff: "2026-06-11T18:00:00Z",
    status: "SCHEDULED", homeScore: null, awayScore: null,
  };
}

const finishedGroup: GroupState = {
  id: "A",
  teams: [team("A", 2000), team("B", 1800), team("C", 1700), team("D", 1500)],
  matches: [
    fin("1", "A", "B", 2, 0), fin("2", "C", "D", 1, 0),
    fin("3", "A", "C", 3, 0), fin("4", "B", "D", 2, 1),
    fin("5", "A", "D", 4, 0), fin("6", "B", "C", 1, 0),
  ],
};

function preds(player: string, order: string[]): PlayerPredictions {
  return { player, predictions: { A: order } as any, tiebreakGroups: ["A"] as any };
}

describe("runMonteCarlo", () => {
  it("grupo terminado => p_hit es 0 o 1 (determinista)", () => {
    const rng = mulberry32(42);
    const players = [
      preds("Acierta", ["A", "B", "C", "D"]),
      preds("Falla", ["D", "C", "B", "A"]),
    ];
    const res = runMonteCarlo([finishedGroup], players, 200, rng);
    expect(res.perGroupHit["Acierta"]["A"]).toBeCloseTo(1, 6);
    expect(res.perGroupHit["Falla"]["A"]).toBeCloseTo(0, 6);
  });

  it("con partidos por jugar, p_hit queda entre 0 y 1", () => {
    const openGroup: GroupState = {
      id: "A",
      teams: finishedGroup.teams,
      matches: [
        fin("1", "A", "B", 2, 0),
        sched("2", "C", "D"),
        sched("3", "A", "C"),
        sched("4", "B", "D"),
        sched("5", "A", "D"),
        sched("6", "B", "C"),
      ],
    };
    const rng = mulberry32(7);
    const players = [preds("P", ["A", "B", "C", "D"])];
    const res = runMonteCarlo([openGroup], players, 500, rng);
    const p = res.perGroupHit["P"]["A"];
    expect(p).toBeGreaterThan(0);
    expect(p).toBeLessThan(1);
  });

  it("calcula probabilidad de ganar la polla (suma ~1 entre jugadores)", () => {
    const rng = mulberry32(99);
    const players = [
      preds("Fav", ["A", "B", "C", "D"]),
      preds("Otro", ["B", "A", "C", "D"]),
    ];
    const res = runMonteCarlo([finishedGroup], players, 300, rng);
    const total = players.reduce((s, p) => s + res.overallWin[p.player], 0);
    // Cada sim tiene exactamente un ganador (o empate compartido); suma <= 1 si
    // se reparte, pero con este grupo terminado "Fav" gana siempre.
    expect(res.overallWin["Fav"]).toBeCloseTo(1, 6);
    expect(total).toBeCloseTo(1, 6);
  });
});
