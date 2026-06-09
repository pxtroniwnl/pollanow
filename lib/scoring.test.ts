import { describe, it, expect } from "vitest";
import {
  computeStandings,
  isGroupComplete,
  scoreGroup,
  computeLeaderboard,
} from "./scoring";
import type { GroupState, Match, Team, PlayerPredictions } from "./types";

function team(code: string, elo = 1700): Team {
  return { code, name: code, group: "A", flag: "", elo };
}

function m(
  id: string,
  home: string,
  away: string,
  hs: number | null,
  as: number | null,
  matchday = 1,
): Match {
  return {
    id,
    group: "A",
    matchday,
    home,
    away,
    kickoff: "2026-06-11T18:00:00Z",
    status: hs === null ? "SCHEDULED" : "FINISHED",
    homeScore: hs,
    awayScore: as,
  };
}

// Grupo A round-robin completo donde A>B>C>D de forma limpia.
function finishedGroupA(): GroupState {
  const teams = [team("A"), team("B"), team("C"), team("D")];
  const matches: Match[] = [
    m("1", "A", "B", 2, 0),
    m("2", "C", "D", 1, 0),
    m("3", "A", "C", 3, 0),
    m("4", "B", "D", 2, 1),
    m("5", "A", "D", 4, 0),
    m("6", "B", "C", 1, 0),
  ];
  return { id: "A", teams, matches };
}

describe("isGroupComplete", () => {
  it("true cuando los 6 partidos estan FINISHED", () => {
    expect(isGroupComplete(finishedGroupA())).toBe(true);
  });
  it("false si falta algun partido", () => {
    const g = finishedGroupA();
    g.matches[0].status = "SCHEDULED";
    g.matches[0].homeScore = null;
    g.matches[0].awayScore = null;
    expect(isGroupComplete(g)).toBe(false);
  });
});

describe("computeStandings", () => {
  it("ordena por puntos (A>B>C>D)", () => {
    const order = computeStandings(finishedGroupA()).map((r) => r.team);
    expect(order).toEqual(["A", "B", "C", "D"]);
  });
  it("desempata por diferencia de gol", () => {
    const teams = [team("X"), team("Y"), team("Z"), team("W")];
    // X e Y ganan a Z y W; entre si empatan; X con mejor DG.
    const matches: Match[] = [
      m("1", "X", "Z", 5, 0),
      m("2", "Y", "Z", 1, 0),
      m("3", "X", "W", 5, 0),
      m("4", "Y", "W", 1, 0),
      m("5", "X", "Y", 0, 0),
      m("6", "Z", "W", 0, 0),
    ];
    const order = computeStandings({ id: "A", teams, matches }).map((r) => r.team);
    expect(order.slice(0, 2)).toEqual(["X", "Y"]);
  });
});

function pp(
  player: string,
  order: string[],
  tiebreak: ("A")[] = ["A"] as any,
): PlayerPredictions {
  return {
    player,
    predictions: { A: order } as any,
    tiebreakGroups: tiebreak as any,
  };
}

describe("scoreGroup", () => {
  it("+10 si los 4 puestos coinciden exactamente", () => {
    const st = computeStandings(finishedGroupA());
    const res = scoreGroup(["A", "B", "C", "D"], st, true);
    expect(res).toEqual({ hit: true, points: 10 });
  });
  it("0 si hay aciertos parciales (todo o nada)", () => {
    const st = computeStandings(finishedGroupA());
    const res = scoreGroup(["A", "B", "D", "C"], st, true);
    expect(res).toEqual({ hit: false, points: 0 });
  });
  it("0 si el grupo no esta completo", () => {
    const st = computeStandings(finishedGroupA());
    const res = scoreGroup(["A", "B", "C", "D"], st, false);
    expect(res.points).toBe(0);
  });
});

describe("computeLeaderboard", () => {
  it("ordena por puntos y resuelve desempate por grupo del goleador", () => {
    const groups = { A: finishedGroupA() } as Record<string, GroupState>;
    const players = [
      pp("Ganadora", ["A", "B", "C", "D"], ["A"] as any), // acierta + goleador en A
      pp("Empatado", ["A", "B", "C", "D"], ["B"] as any), // acierta, goleador en B
      pp("Cero", ["D", "C", "B", "A"], ["A"] as any),
    ];
    const board = computeLeaderboard(players, groups as any, "A");
    const byName = Object.fromEntries(board.map((b) => [b.player, b]));
    expect(byName["Ganadora"].points).toBe(10);
    expect(byName["Empatado"].points).toBe(10);
    expect(byName["Cero"].points).toBe(0);
    // Ambos con 10, pero solo "Ganadora" acerto el grupo del goleador (A).
    expect(byName["Ganadora"].rank).toBe(1);
    expect(byName["Ganadora"].tiebreakWon).toBe(true);
    expect(byName["Empatado"].rank).toBe(2);
    expect(byName["Cero"].rank).toBe(3);
  });
});
