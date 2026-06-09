import { describe, it, expect } from "vitest";
import {
  buildGroupStates,
  buildPlayerPredictions,
  topScorerGroup,
} from "./build-state";
import type { GroupId, Match, Team } from "./types";

function team(code: string, group: GroupId): Team {
  return { code, name: code, group, flag: "", elo: 1700 };
}

describe("buildGroupStates", () => {
  it("agrupa equipos y partidos por grupo", () => {
    const teams = [team("A", "A"), team("B", "A"), team("C", "B")];
    const matches: Match[] = [
      { id: "1", group: "A", matchday: 1, home: "A", away: "B",
        kickoff: "", status: "SCHEDULED", homeScore: null, awayScore: null },
    ];
    const gs = buildGroupStates(teams, matches);
    expect(gs.map((g) => g.id)).toEqual(["A", "B"]);
    expect(gs[0].teams).toHaveLength(2);
    expect(gs[0].matches).toHaveLength(1);
    expect(gs[1].matches).toHaveLength(0);
  });
});

describe("buildPlayerPredictions", () => {
  it("reconstruye orden 1-4 y tiebreaks", () => {
    const pp = buildPlayerPredictions(
      [{ id: 1, name: "David" }],
      [
        { player_id: 1, group_id: "A", position: 2, team_code: "COREA" },
        { player_id: 1, group_id: "A", position: 1, team_code: "MEXICO" },
        { player_id: 1, group_id: "A", position: 3, team_code: "CHEQUIA" },
        { player_id: 1, group_id: "A", position: 4, team_code: "SUDAFRICA" },
      ],
      [{ player_id: 1, group_id: "J" }, { player_id: 1, group_id: "I" }],
    );
    expect(pp[0].predictions["A"]).toEqual(["MEXICO", "COREA", "CHEQUIA", "SUDAFRICA"]);
    expect(pp[0].tiebreakGroups).toEqual(["J", "I"]);
  });
});

describe("topScorerGroup", () => {
  it("devuelve el grupo del goleador con mas goles", () => {
    const map = new Map<string, GroupId>([["ARGENTINA", "J"], ["FRANCIA", "I"]]);
    const res = topScorerGroup(
      [
        { teamCode: "ARGENTINA", goals: 6, name: "Messi" },
        { teamCode: "FRANCIA", goals: 5, name: "Mbappe" },
      ],
      map,
    );
    expect(res).toEqual({ group: "J", name: "Messi" });
  });
  it("null si no hay goleador conocido", () => {
    expect(topScorerGroup([], new Map()).group).toBeNull();
  });
});
