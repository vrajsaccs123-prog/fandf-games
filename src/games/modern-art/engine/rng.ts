/**
 * Modern Art — Deterministic RNG (copied from core random, self-contained).
 */

/** Simple seedable LCG PRNG that returns values in [0, 1) */
export type Rng = () => number;

export function createRng(seed: string): Rng {
  // Hash the seed string to a 32-bit integer
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  }
  // LCG parameters (Numerical Recipes)
  let state = h >>> 0;
  return function (): number {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

export function shuffleArray<T>(arr: T[], rng: Rng): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
