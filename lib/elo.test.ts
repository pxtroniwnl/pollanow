import { describe, it, expect } from "vitest";
import { expectedScore, outcomeProbabilities, goalLambdas } from "./elo";

describe("expectedScore", () => {
  it("es 0.5 cuando los Elo son iguales", () => {
    expect(expectedScore(0)).toBeCloseTo(0.5, 5);
  });
  it("crece con la diferencia de Elo", () => {
    expect(expectedScore(200)).toBeGreaterThan(0.5);
    expect(expectedScore(-200)).toBeLessThan(0.5);
  });
});

describe("outcomeProbabilities", () => {
  it("suma 1", () => {
    const p = outcomeProbabilities(1900, 1750);
    expect(p.win + p.draw + p.loss).toBeCloseTo(1, 6);
  });
  it("equipos iguales (sin localia) => win == loss y draw > 0", () => {
    const p = outcomeProbabilities(1800, 1800, 0);
    expect(p.win).toBeCloseTo(p.loss, 6);
    expect(p.draw).toBeGreaterThan(0);
  });
  it("mas Elo => mas probabilidad de ganar", () => {
    const strong = outcomeProbabilities(2050, 1500, 0);
    const even = outcomeProbabilities(1800, 1800, 0);
    expect(strong.win).toBeGreaterThan(even.win);
  });
});

describe("goalLambdas", () => {
  it("el favorito tiene mayor lambda esperada", () => {
    const { lambdaHome, lambdaAway } = goalLambdas(2000, 1600, 0);
    expect(lambdaHome).toBeGreaterThan(lambdaAway);
  });
  it("lambdas siempre positivas", () => {
    const { lambdaHome, lambdaAway } = goalLambdas(1500, 2100, 0);
    expect(lambdaHome).toBeGreaterThan(0);
    expect(lambdaAway).toBeGreaterThan(0);
  });
});
