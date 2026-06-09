// Interfaz del proveedor de datos de partidos (intercambiable).
import type { Match } from "@/lib/types";

export interface TopScorer {
  teamCode: string | null; // codigo interno del equipo del goleador
  goals: number;
  name: string;
}

export interface MatchProvider {
  /** Partidos de fase de grupos mapeados a nuestro modelo. */
  getGroupStageMatches(): Promise<Match[]>;
  /** Goleadores de la fase de grupos (orden desc por goles). */
  getTopScorers(): Promise<TopScorer[]>;
}
