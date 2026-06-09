// Capa de datos para los Server Components.
// Estructura (grupos/equipos/predicciones) desde data/seed.json (no cambia).
// Datos en vivo (matches/standings/scoring/probabilidades) desde Supabase si
// esta configurado; si no, quedan vacios y la UI lo indica.
import seed from "@/data/seed.json";
import { createReadClient } from "@/lib/supabase/server";
import type { GroupId } from "@/lib/types";

export interface TeamView {
  code: string; name: string; group: GroupId; flag: string; elo: number;
}
export interface MatchView {
  id: string; group: GroupId; matchday: number;
  home: TeamView; away: TeamView; kickoff: string;
  status: "SCHEDULED" | "IN_PLAY" | "FINISHED";
  homeScore: number | null; awayScore: number | null;
}
export interface StandingView {
  team: TeamView; position: number; played: number; won: number; drawn: number;
  lost: number; gf: number; ga: number; gd: number; points: number;
}
export interface PlayerView {
  name: string;
  predictions: Record<string, string[]>;
  tiebreaks: GroupId[];
  points: number; rank: number; hits: GroupId[]; tiebreakWon: boolean;
  pWin: number;
  pHit: Record<string, number>;
}
export interface AppData {
  groups: { id: GroupId; name: string }[];
  teams: Record<string, TeamView>;
  groupTeams: Record<string, TeamView[]>;
  players: PlayerView[];
  matches: MatchView[];
  standings: Record<string, StandingView[]>;
  meta: { goleadorGroup: GroupId | null; goleadorName: string | null; lastSync: string | null };
  live: boolean; // hay datos en vivo desde Supabase
}

function supabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

function buildTeams(): Record<string, TeamView> {
  const teams: Record<string, TeamView> = {};
  for (const t of seed.teams) {
    teams[t.code] = {
      code: t.code, name: t.name, group: t.group as GroupId, flag: t.flag, elo: t.elo,
    };
  }
  return teams;
}

export async function getAppData(): Promise<AppData> {
  const teams = buildTeams();
  const groupTeams: Record<string, TeamView[]> = {};
  for (const t of Object.values(teams)) {
    (groupTeams[t.group] ??= []).push(t);
  }

  // Base de jugadores desde el seed.
  const players: PlayerView[] = seed.players.map((name) => ({
    name,
    predictions: (seed.predictions as Record<string, Record<string, string[]>>)[name],
    tiebreaks: ((seed.tiebreaks as Record<string, string[]>)[name] ?? []) as GroupId[],
    points: 0, rank: 0, hits: [], tiebreakWon: false, pWin: 0, pHit: {},
  }));

  let matches: MatchView[] = [];
  const standings: Record<string, StandingView[]> = {};
  let meta = { goleadorGroup: null as GroupId | null, goleadorName: null as string | null, lastSync: null as string | null };
  let live = false;

  if (supabaseConfigured()) {
    try {
      const db = createReadClient();
      const [mRes, sRes, scRes, gpRes, opRes, tmRes, plRes] = await Promise.all([
        db.from("matches").select("*").order("kickoff"),
        db.from("standings").select("*"),
        db.from("scoring").select("*"),
        db.from("group_probabilities").select("*"),
        db.from("overall_probabilities").select("*"),
        db.from("tournament_meta").select("*").single(),
        db.from("players").select("id,name"),
      ]);

      const nameById = new Map<number, string>((plRes.data ?? []).map((p: any) => [p.id, p.name]));

      matches = (mRes.data ?? []).map((m: any) => ({
        id: m.id, group: m.group_id, matchday: m.matchday,
        home: teams[m.home], away: teams[m.away], kickoff: m.kickoff,
        status: m.status, homeScore: m.home_score, awayScore: m.away_score,
      })).filter((m: MatchView) => m.home && m.away);

      for (const row of sRes.data ?? []) {
        (standings[row.group_id] ??= []).push({
          team: teams[row.team_code], position: row.position, played: row.played,
          won: row.won, drawn: row.drawn, lost: row.lost, gf: row.gf, ga: row.ga,
          gd: row.gd, points: row.points,
        });
      }
      for (const g of Object.keys(standings)) {
        standings[g].sort((a, b) => a.position - b.position);
      }

      const scoreByName = new Map<string, any>();
      for (const s of scRes.data ?? []) scoreByName.set(nameById.get(s.player_id) ?? "", s);
      const overallByName = new Map<string, number>();
      for (const o of opRes.data ?? []) overallByName.set(nameById.get(o.player_id) ?? "", Number(o.p_win));
      const pHitByName = new Map<string, Record<string, number>>();
      for (const gp of gpRes.data ?? []) {
        const nm = nameById.get(gp.player_id) ?? "";
        if (!pHitByName.has(nm)) pHitByName.set(nm, {});
        pHitByName.get(nm)![gp.group_id] = Number(gp.p_hit);
      }

      for (const p of players) {
        const s = scoreByName.get(p.name);
        if (s) {
          p.points = s.points; p.rank = s.rank; p.hits = s.hits ?? [];
          p.tiebreakWon = s.tiebreak_won;
        }
        p.pWin = overallByName.get(p.name) ?? 0;
        p.pHit = pHitByName.get(p.name) ?? {};
      }

      if (tmRes.data) {
        meta = {
          goleadorGroup: tmRes.data.goleador_group ?? null,
          goleadorName: tmRes.data.goleador_name ?? null,
          lastSync: tmRes.data.last_sync ?? null,
        };
      }
      live = matches.length > 0 || (scRes.data ?? []).length > 0;
    } catch {
      live = false;
    }
  }

  // Orden del leaderboard: por rank si hay datos, si no alfabetico.
  const ranked = [...players].sort((a, b) => {
    if (live && (a.rank || b.rank)) return (a.rank || 99) - (b.rank || 99);
    if (b.points !== a.points) return b.points - a.points;
    return a.name.localeCompare(b.name);
  });

  return {
    groups: seed.groups as { id: GroupId; name: string }[],
    teams, groupTeams, players: ranked, matches, standings, meta, live,
  };
}
