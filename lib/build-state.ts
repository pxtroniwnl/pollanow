// Helpers puros: ensamblar objetos de dominio desde filas de la BD y
// derivar el grupo del goleador. Testeable sin BD.

import type {
  GroupId,
  GroupState,
  Match,
  PlayerPredictions,
  Team,
} from "./types";
import type { TopScorer } from "./api/provider";

export interface PlayerRow { id: number; name: string }
export interface PredictionRow {
  player_id: number; group_id: string; position: number; team_code: string;
}
export interface TiebreakRow { player_id: number; group_id: string }

/** Agrupa equipos + partidos en GroupState[] por grupo. */
export function buildGroupStates(teams: Team[], matches: Match[]): GroupState[] {
  const byGroup = new Map<GroupId, GroupState>();
  for (const t of teams) {
    if (!byGroup.has(t.group)) byGroup.set(t.group, { id: t.group, teams: [], matches: [] });
    byGroup.get(t.group)!.teams.push(t);
  }
  for (const m of matches) {
    byGroup.get(m.group)?.matches.push(m);
  }
  return [...byGroup.values()].sort((a, b) => a.id.localeCompare(b.id));
}

/** Reconstruye las predicciones de cada persona desde filas de la BD. */
export function buildPlayerPredictions(
  players: PlayerRow[],
  predictions: PredictionRow[],
  tiebreaks: TiebreakRow[],
): PlayerPredictions[] {
  const nameById = new Map(players.map((p) => [p.id, p.name]));
  const acc = new Map<string, PlayerPredictions>();
  for (const p of players) {
    acc.set(p.name, { player: p.name, predictions: {} as any, tiebreakGroups: [] });
  }
  for (const r of predictions) {
    const name = nameById.get(r.player_id);
    if (!name) continue;
    const pp = acc.get(name)!;
    const gid = r.group_id as GroupId;
    if (!pp.predictions[gid]) pp.predictions[gid] = [];
    pp.predictions[gid][r.position - 1] = r.team_code;
  }
  for (const r of tiebreaks) {
    const name = nameById.get(r.player_id);
    if (!name) continue;
    acc.get(name)!.tiebreakGroups.push(r.group_id as GroupId);
  }
  return [...acc.values()];
}

/** Grupo del que sale el goleador (mayor numero de goles), o null. */
export function topScorerGroup(
  scorers: TopScorer[],
  teamToGroup: Map<string, GroupId>,
): { group: GroupId | null; name: string | null } {
  const top = scorers.find((s) => s.teamCode && teamToGroup.has(s.teamCode));
  if (!top || !top.teamCode) return { group: null, name: null };
  return { group: teamToGroup.get(top.teamCode) ?? null, name: top.name };
}
