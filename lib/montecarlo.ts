// Simulacion Monte Carlo de los grupos usando el modelo Elo.
// Devuelve, por persona, la probabilidad de acertar cada grupo (p_hit) y la
// probabilidad de ganar la polla en general (overallWin).

import { goalLambdas } from "./elo";
import { computeStandings } from "./scoring";
import type {
  GroupId,
  GroupState,
  Match,
  PlayerPredictions,
} from "./types";

/** PRNG determinista (mulberry32) para tests reproducibles. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Muestra una Poisson(lambda) por el metodo de Knuth. */
export function samplePoisson(lambda: number, rng: () => number): number {
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= rng();
  } while (p > L);
  return k - 1;
}

interface SimResult {
  perGroupHit: Record<string, Record<string, number>>;
  overallWin: Record<string, number>;
}

/** Construye el orden final (codigos 1-4) de un grupo en una simulacion. */
function simulateGroupOrder(
  group: GroupState,
  elo: Map<string, number>,
  rng: () => number,
): string[] {
  const matches: Match[] = group.matches.map((m) => {
    if (m.status === "FINISHED" && m.homeScore !== null && m.awayScore !== null) {
      return m;
    }
    const { lambdaHome, lambdaAway } = goalLambdas(
      elo.get(m.home) ?? 1700,
      elo.get(m.away) ?? 1700,
    );
    return {
      ...m,
      status: "FINISHED" as const,
      homeScore: samplePoisson(lambdaHome, rng),
      awayScore: samplePoisson(lambdaAway, rng),
    };
  });
  return computeStandings({ ...group, matches }).map((r) => r.team);
}

/**
 * Corre N simulaciones de los grupos dados.
 * goleadorGroup (opcional): si se conoce el grupo del goleador, se usa para
 * romper empates de la polla a favor de quien lo predijo; si no, los empates
 * se reparten por igual.
 */
export function runMonteCarlo(
  groups: GroupState[],
  players: PlayerPredictions[],
  iterations: number,
  rng: () => number,
  goleadorGroup: GroupId | null = null,
): SimResult {
  const elo = new Map<string, number>();
  for (const g of groups) for (const t of g.teams) elo.set(t.code, t.elo);

  const hitCount: Record<string, Record<string, number>> = {};
  const winCount: Record<string, number> = {};
  for (const p of players) {
    hitCount[p.player] = {};
    winCount[p.player] = 0;
    for (const g of groups) hitCount[p.player][g.id] = 0;
  }

  for (let n = 0; n < iterations; n++) {
    const order: Record<string, string[]> = {};
    for (const g of groups) order[g.id] = simulateGroupOrder(g, elo, rng);

    const points: Record<string, number> = {};
    for (const p of players) {
      let pts = 0;
      for (const g of groups) {
        const pred = p.predictions[g.id];
        const actual = order[g.id];
        if (pred && actual && pred.length === actual.length &&
            pred.every((c, i) => c === actual[i])) {
          pts += 10;
          hitCount[p.player][g.id]++;
        }
      }
      points[p.player] = pts;
    }

    const max = Math.max(...players.map((p) => points[p.player]));
    let winners = players.filter((p) => points[p.player] === max);
    if (winners.length > 1 && goleadorGroup !== null) {
      const withTb = winners.filter((p) => p.tiebreakGroups.includes(goleadorGroup));
      if (withTb.length > 0) winners = withTb;
    }
    const credit = 1 / winners.length;
    for (const w of winners) winCount[w.player] += credit;
  }

  const perGroupHit: Record<string, Record<string, number>> = {};
  const overallWin: Record<string, number> = {};
  for (const p of players) {
    perGroupHit[p.player] = {};
    for (const g of groups) {
      perGroupHit[p.player][g.id] = hitCount[p.player][g.id] / iterations;
    }
    overallWin[p.player] = winCount[p.player] / iterations;
  }
  return { perGroupHit, overallWin };
}
