// Modelo Elo -> probabilidades de resultado y goles esperados.
// Coherente con la simulacion Monte Carlo (mismo modelo Poisson de goles).

export const HOME_ADVANTAGE = 65; // puntos Elo de ventaja de localia por defecto
const BASE_TOTAL_GOALS = 2.5;
const MIN_LAMBDA = 0.2;
const MAX_GOALS = 10; // cota para sumatorias de Poisson

/** Puntuacion esperada (0..1) dado el diferencial de Elo dr = eloA - eloB. */
export function expectedScore(dr: number): number {
  return 1 / (1 + Math.pow(10, -dr / 400));
}

/** Goles esperados (lambda) de cada lado segun el modelo Elo. */
export function goalLambdas(
  eloHome: number,
  eloAway: number,
  homeAdvantage: number = HOME_ADVANTAGE,
): { lambdaHome: number; lambdaAway: number } {
  const dr = eloHome - eloAway + homeAdvantage;
  const e = expectedScore(dr); // 0..1
  const supremacy = (e - 0.5) * 4; // diferencia de gol esperada aprox.
  const lambdaHome = Math.max(MIN_LAMBDA, BASE_TOTAL_GOALS / 2 + supremacy / 2);
  const lambdaAway = Math.max(MIN_LAMBDA, BASE_TOTAL_GOALS / 2 - supremacy / 2);
  return { lambdaHome, lambdaAway };
}

function poissonPmf(k: number, lambda: number): number {
  let logp = -lambda + k * Math.log(lambda);
  for (let i = 2; i <= k; i++) logp -= Math.log(i);
  return Math.exp(logp);
}

/**
 * Probabilidades de victoria local / empate / victoria visitante, integrando
 * el mismo modelo Poisson de goles que usa la simulacion.
 */
export function outcomeProbabilities(
  eloHome: number,
  eloAway: number,
  homeAdvantage: number = HOME_ADVANTAGE,
): { win: number; draw: number; loss: number } {
  const { lambdaHome, lambdaAway } = goalLambdas(eloHome, eloAway, homeAdvantage);
  const ph = Array.from({ length: MAX_GOALS + 1 }, (_, k) => poissonPmf(k, lambdaHome));
  const pa = Array.from({ length: MAX_GOALS + 1 }, (_, k) => poissonPmf(k, lambdaAway));
  let win = 0, draw = 0, loss = 0;
  for (let i = 0; i <= MAX_GOALS; i++) {
    for (let j = 0; j <= MAX_GOALS; j++) {
      const p = ph[i] * pa[j];
      if (i > j) win += p;
      else if (i === j) draw += p;
      else loss += p;
    }
  }
  const total = win + draw + loss;
  return { win: win / total, draw: draw / total, loss: loss / total };
}
