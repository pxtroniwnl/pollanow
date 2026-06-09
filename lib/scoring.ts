// Calculo de tabla de posiciones, puntaje de la polla y leaderboard.
// Puro, sin I/O. Reutilizado por la simulacion Monte Carlo.

import type {
  GroupId,
  GroupState,
  Match,
  PlayerPredictions,
  PlayerScore,
  StandingRow,
} from "./types";

export const POINTS_PER_GROUP = 10;
const GROUP_MATCH_COUNT = 6;

export function isGroupComplete(group: GroupState): boolean {
  return (
    group.matches.length === GROUP_MATCH_COUNT &&
    group.matches.every((m) => m.status === "FINISHED")
  );
}

function blankRow(team: string): StandingRow {
  return {
    team, played: 0, won: 0, drawn: 0, lost: 0,
    gf: 0, ga: 0, gd: 0, points: 0, position: 0,
  };
}

function accumulate(rows: Map<string, StandingRow>, matches: Match[]) {
  for (const m of matches) {
    if (m.status !== "FINISHED" || m.homeScore === null || m.awayScore === null) continue;
    const h = rows.get(m.home);
    const a = rows.get(m.away);
    if (!h || !a) continue;
    h.played++; a.played++;
    h.gf += m.homeScore; h.ga += m.awayScore;
    a.gf += m.awayScore; a.ga += m.homeScore;
    if (m.homeScore > m.awayScore) { h.won++; h.points += 3; a.lost++; }
    else if (m.homeScore < m.awayScore) { a.won++; a.points += 3; h.lost++; }
    else { h.drawn++; a.drawn++; h.points++; a.points++; }
  }
  for (const r of rows.values()) r.gd = r.gf - r.ga;
}

/** Mini-tabla head-to-head entre un subconjunto de equipos empatados. */
function headToHead(teams: string[], matches: Match[]): Map<string, StandingRow> {
  const set = new Set(teams);
  const rows = new Map<string, StandingRow>();
  for (const t of teams) rows.set(t, blankRow(t));
  const sub = matches.filter((m) => set.has(m.home) && set.has(m.away));
  accumulate(rows, sub);
  return rows;
}

function compareOverall(a: StandingRow, b: StandingRow): number {
  if (b.points !== a.points) return b.points - a.points;
  if (b.gd !== a.gd) return b.gd - a.gd;
  if (b.gf !== a.gf) return b.gf - a.gf;
  return 0;
}

/** Tabla de posiciones de un grupo segun reglas FIFA 2026 (intra-grupo). */
export function computeStandings(group: GroupState): StandingRow[] {
  const rows = new Map<string, StandingRow>();
  for (const t of group.teams) rows.set(t.code, blankRow(t.code));
  accumulate(rows, group.matches);

  const ordered = [...rows.values()].sort(compareOverall);

  // Desempatar bloques iguales en (puntos, dg, gf) por head-to-head, luego code.
  const result: StandingRow[] = [];
  let i = 0;
  while (i < ordered.length) {
    let j = i + 1;
    while (j < ordered.length && compareOverall(ordered[i], ordered[j]) === 0) j++;
    const block = ordered.slice(i, j);
    if (block.length > 1) {
      const h2h = headToHead(block.map((r) => r.team), group.matches);
      block.sort((x, y) => {
        const hx = h2h.get(x.team)!;
        const hy = h2h.get(y.team)!;
        const c = compareOverall(hx, hy);
        if (c !== 0) return c;
        return x.team < y.team ? -1 : x.team > y.team ? 1 : 0;
      });
    }
    result.push(...block);
    i = j;
  }
  result.forEach((r, idx) => (r.position = idx + 1));
  return result;
}

/** Puntaje de un grupo: +10 si el orden 1-4 coincide exacto, sino 0. */
export function scoreGroup(
  prediction: string[],
  standings: StandingRow[],
  complete: boolean,
): { hit: boolean; points: number } {
  if (!complete) return { hit: false, points: 0 };
  const actual = [...standings].sort((a, b) => a.position - b.position).map((r) => r.team);
  const hit =
    prediction.length === actual.length &&
    prediction.every((code, idx) => code === actual[idx]);
  return { hit, points: hit ? POINTS_PER_GROUP : 0 };
}

/**
 * Leaderboard: puntos por persona, grupos acertados y desempate por el grupo
 * del que sale el goleador real (goleadorGroup), si se conoce.
 */
export function computeLeaderboard(
  players: PlayerPredictions[],
  groups: Record<string, GroupState>,
  goleadorGroup: GroupId | null,
): PlayerScore[] {
  const scored = players.map((p) => {
    let points = 0;
    const hits: GroupId[] = [];
    for (const gid of Object.keys(p.predictions) as GroupId[]) {
      const group = groups[gid];
      if (!group) continue;
      const complete = isGroupComplete(group);
      const standings = computeStandings(group);
      const { hit, points: pts } = scoreGroup(p.predictions[gid], standings, complete);
      points += pts;
      if (hit) hits.push(gid);
    }
    const tiebreakWon =
      goleadorGroup !== null && p.tiebreakGroups.includes(goleadorGroup);
    return { player: p.player, points, hits, rank: 0, tiebreakWon };
  });

  scored.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (a.tiebreakWon !== b.tiebreakWon) return a.tiebreakWon ? -1 : 1;
    return a.player < b.player ? -1 : a.player > b.player ? 1 : 0;
  });

  // Ranking estandar de competencia: mismo rank si empatan en (puntos, desempate).
  scored.forEach((s, idx) => {
    if (idx > 0) {
      const prev = scored[idx - 1];
      const tied = prev.points === s.points && prev.tiebreakWon === s.tiebreakWon;
      s.rank = tied ? prev.rank : idx + 1;
    } else {
      s.rank = 1;
    }
  });
  return scored;
}
