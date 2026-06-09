// Tipos de dominio de la polla del Mundial 2026.

export type GroupId =
  | "A" | "B" | "C" | "D" | "E" | "F"
  | "G" | "H" | "I" | "J" | "K" | "L";

export interface Team {
  code: string; // codigo normalizado (ej. "MEXICO")
  name: string; // nombre display (ej. "México")
  group: GroupId;
  flag: string; // emoji bandera
  elo: number;
}

export type MatchStatus = "SCHEDULED" | "IN_PLAY" | "FINISHED";

export interface Match {
  id: string;
  group: GroupId;
  matchday: number; // jornada 1..3 dentro del grupo
  home: string; // team code
  away: string; // team code
  kickoff: string; // ISO datetime
  status: MatchStatus;
  homeScore: number | null;
  awayScore: number | null;
}

/** Orden predicho 1º..4º (codigos de equipo) por una persona en un grupo. */
export type Prediction = string[]; // longitud 4

export interface PlayerPredictions {
  player: string;
  predictions: Record<GroupId, Prediction>;
  tiebreakGroups: GroupId[]; // 2 grupos del goleador
}

/** Fila de tabla de posiciones calculada. */
export interface StandingRow {
  team: string; // code
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  gd: number;
  points: number;
  position: number; // 1..4
}

/** Estado de un grupo: equipos + partidos (jugados y por jugar). */
export interface GroupState {
  id: GroupId;
  teams: Team[]; // 4 equipos
  matches: Match[]; // 6 partidos (round-robin)
}

export interface PlayerScore {
  player: string;
  points: number;
  hits: GroupId[]; // grupos acertados (4/4)
  rank: number; // posicion en el leaderboard (1 = lider)
  tiebreakWon: boolean; // gano el desempate del goleador
}
