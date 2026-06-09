// Orquestacion del sync: API -> matches -> standings -> scoring -> Monte Carlo.
// Escribe a Supabase; Realtime empuja a los clientes.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { GroupId, Match, Team } from "./types";
import type { MatchProvider } from "./api/provider";
import {
  buildGroupStates,
  buildPlayerPredictions,
  topScorerGroup,
} from "./build-state";
import { computeStandings, computeLeaderboard } from "./scoring";
import { mulberry32, runMonteCarlo } from "./montecarlo";

export interface SyncResult {
  matches: number;
  goleadorGroup: GroupId | null;
  iterations: number;
}

export async function runSync(
  provider: MatchProvider,
  db: SupabaseClient,
  iterations = 20000,
): Promise<SyncResult> {
  // 1) Partidos desde el proveedor -> upsert.
  const fetched = await provider.getGroupStageMatches();
  if (fetched.length > 0) {
    await db
      .from("matches")
      .upsert(
        fetched.map((m) => ({
          id: m.id, group_id: m.group, matchday: m.matchday,
          home: m.home, away: m.away, kickoff: m.kickoff,
          status: m.status, home_score: m.homeScore, away_score: m.awayScore,
        })),
      )
      .throwOnError();
  }

  // 2) Cargar estado desde la BD.
  const { data: teamRows } = await db.from("teams")
    .select("code,name,group_id,flag,elo").throwOnError();
  const { data: matchRows } = await db.from("matches")
    .select("id,group_id,matchday,home,away,kickoff,status,home_score,away_score")
    .throwOnError();
  const { data: playerRows } = await db.from("players").select("id,name").throwOnError();
  const { data: predRows } = await db.from("predictions")
    .select("player_id,group_id,position,team_code").throwOnError();
  const { data: tbRows } = await db.from("tiebreak_picks")
    .select("player_id,group_id").throwOnError();

  const teams: Team[] = (teamRows ?? []).map((t: any) => ({
    code: t.code, name: t.name, group: t.group_id as GroupId, flag: t.flag, elo: t.elo,
  }));
  const matches: Match[] = (matchRows ?? []).map((m: any) => ({
    id: m.id, group: m.group_id as GroupId, matchday: m.matchday,
    home: m.home, away: m.away, kickoff: m.kickoff, status: m.status,
    homeScore: m.home_score, awayScore: m.away_score,
  }));

  const groupStates = buildGroupStates(teams, matches);
  const groupsRecord = Object.fromEntries(groupStates.map((g) => [g.id, g]));
  const players = buildPlayerPredictions(
    playerRows ?? [], predRows ?? [], tbRows ?? [],
  );
  const idByName = new Map((playerRows ?? []).map((p: any) => [p.name, p.id]));
  const teamToGroup = new Map<string, GroupId>(teams.map((t) => [t.code, t.group]));

  // 3) Goleador (desempate).
  let goleadorGroup: GroupId | null = null;
  let goleadorName: string | null = null;
  try {
    const scorers = await provider.getTopScorers();
    const top = topScorerGroup(scorers, teamToGroup);
    goleadorGroup = top.group;
    goleadorName = top.name;
  } catch {
    // El tier gratis puede no exponer goleadores; el desempate queda pendiente.
  }

  // 4) Standings reales -> upsert.
  const standingRows: any[] = [];
  for (const g of groupStates) {
    for (const r of computeStandings(g)) {
      standingRows.push({
        group_id: g.id, team_code: r.team, position: r.position,
        played: r.played, won: r.won, drawn: r.drawn, lost: r.lost,
        gf: r.gf, ga: r.ga, gd: r.gd, points: r.points, updated_at: new Date().toISOString(),
      });
    }
  }
  if (standingRows.length) await db.from("standings").upsert(standingRows).throwOnError();

  // 5) Leaderboard (puntos + desempate) -> upsert.
  const board = computeLeaderboard(players, groupsRecord as any, goleadorGroup);
  const scoringRows = board.map((b) => ({
    player_id: idByName.get(b.player), points: b.points, hits: b.hits,
    rank: b.rank, tiebreak_won: b.tiebreakWon, updated_at: new Date().toISOString(),
  }));
  await db.from("scoring").upsert(scoringRows).throwOnError();

  // 6) Monte Carlo -> probabilidades por grupo y global.
  const rng = mulberry32((Date.now() & 0xffffffff) >>> 0);
  const sim = runMonteCarlo(groupStates, players, iterations, rng, goleadorGroup);
  const groupProbRows: any[] = [];
  const overallRows: any[] = [];
  for (const p of players) {
    const pid = idByName.get(p.player);
    for (const g of groupStates) {
      groupProbRows.push({
        player_id: pid, group_id: g.id,
        p_hit: sim.perGroupHit[p.player][g.id],
        updated_at: new Date().toISOString(),
      });
    }
    overallRows.push({
      player_id: pid, p_win: sim.overallWin[p.player],
      updated_at: new Date().toISOString(),
    });
  }
  await db.from("group_probabilities").upsert(groupProbRows).throwOnError();
  await db.from("overall_probabilities").upsert(overallRows).throwOnError();

  // 7) Meta.
  await db.from("tournament_meta").upsert({
    id: 1, goleador_group: goleadorGroup, goleador_name: goleadorName,
    last_sync: new Date().toISOString(),
  }).throwOnError();

  return { matches: matches.length, goleadorGroup, iterations };
}
