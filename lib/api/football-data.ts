// Adaptador para football-data.org (v4). Cubre el Mundial (competition "WC").
// Inyecta `fetchImpl` para tests. Mapea la forma del API a nuestro modelo.

import type { GroupId, Match, MatchStatus } from "@/lib/types";
import { resolveTeamCode } from "./team-map";
import type { MatchProvider, TopScorer } from "./provider";

const BASE = "https://api.football-data.org/v4";
const COMPETITION = "WC";

type FetchImpl = (url: string, init?: { headers?: Record<string, string> }) => Promise<{
  ok: boolean;
  status: number;
  json: () => Promise<any>;
}>;

interface Options {
  apiKey: string;
  fetchImpl?: FetchImpl;
  baseUrl?: string;
}

function mapStatus(s: string): MatchStatus {
  switch (s) {
    case "IN_PLAY":
    case "PAUSED":
      return "IN_PLAY";
    case "FINISHED":
      return "FINISHED";
    default:
      return "SCHEDULED";
  }
}

function mapGroup(g: string | null | undefined): GroupId | null {
  if (!g) return null;
  const m = /GROUP[_ ]?([A-L])/i.exec(g);
  return m ? (m[1].toUpperCase() as GroupId) : null;
}

export class FootballDataProvider implements MatchProvider {
  private apiKey: string;
  private fetchImpl: FetchImpl;
  private baseUrl: string;

  constructor(opts: Options) {
    this.apiKey = opts.apiKey;
    this.fetchImpl = opts.fetchImpl ?? (globalThis.fetch as unknown as FetchImpl);
    this.baseUrl = opts.baseUrl ?? BASE;
  }

  private async get(path: string): Promise<any> {
    const res = await this.fetchImpl(`${this.baseUrl}${path}`, {
      headers: { "X-Auth-Token": this.apiKey },
    });
    if (!res.ok) {
      throw new Error(`football-data ${path} -> HTTP ${res.status}`);
    }
    return res.json();
  }

  async getGroupStageMatches(): Promise<Match[]> {
    const data = await this.get(`/competitions/${COMPETITION}/matches`);
    const raw: any[] = data?.matches ?? [];
    const out: Match[] = [];
    for (const m of raw) {
      const group = mapGroup(m.group ?? m.stage);
      const home = resolveTeamCode(m.homeTeam?.name ?? m.homeTeam?.shortName ?? "");
      const away = resolveTeamCode(m.awayTeam?.name ?? m.awayTeam?.shortName ?? "");
      // Solo fase de grupos con ambos equipos reconocidos.
      if (!group || !home || !away) continue;
      const ft = m.score?.fullTime ?? {};
      const status = mapStatus(m.status);
      out.push({
        id: String(m.id),
        group,
        matchday: typeof m.matchday === "number" ? m.matchday : 1,
        home,
        away,
        kickoff: m.utcDate,
        status,
        homeScore: status === "FINISHED" ? (ft.home ?? 0) : ft.home ?? null,
        awayScore: status === "FINISHED" ? (ft.away ?? 0) : ft.away ?? null,
      });
    }
    return out;
  }

  async getTopScorers(): Promise<TopScorer[]> {
    const data = await this.get(`/competitions/${COMPETITION}/scorers?limit=30`);
    const raw: any[] = data?.scorers ?? [];
    return raw.map((s) => ({
      teamCode: resolveTeamCode(s.team?.name ?? ""),
      goals: s.goals ?? 0,
      name: s.player?.name ?? "",
    }));
  }
}
