/**
 * Centralized RNG — all randomness in the game platform flows through here.
 *
 * Features:
 *  - Optional deterministic seed (for testing and game replay)
 *  - No scattered Math.random() calls in game modules
 *  - Serializable state so a game can be reproduced from its seed
 *
 * Algorithm: mulberry32 — fast, good distribution, easy to seed.
 */

// ─── Seeded PRNG ──────────────────────────────────────────────────────────────

function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function stringToSeed(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

// ─── RNG Interface ────────────────────────────────────────────────────────────

export interface Rng {
  /** Raw float in [0, 1) */
  next(): number;
  /** Integer in [min, max] inclusive */
  int(min: number, max: number): number;
  /** Pick a random element from a non-empty array */
  pick<T>(array: readonly T[]): T;
  /** Return a new shuffled copy of the array (Fisher-Yates) */
  shuffle<T>(array: readonly T[]): T[];
  /** The seed used to initialize this RNG (undefined if truly random) */
  readonly seed: string | undefined;
}

// ─── Factory ──────────────────────────────────────────────────────────────────

/**
 * Create a seeded or random RNG.
 *
 * @param seed - Optional string seed. If omitted, uses a random seed derived
 *               from crypto.getRandomValues() for better entropy than Math.random().
 *
 * @example
 * const rng = createRng("game-room-abc");
 * const shuffled = rng.shuffle(deck);
 * const roll = rng.int(1, 6);
 */
export function createRng(seed?: string): Rng {
  const resolvedSeed = seed ?? generateRandomSeed();
  const raw = mulberry32(stringToSeed(resolvedSeed));

  return {
    seed: resolvedSeed,

    next() {
      return raw();
    },

    int(min: number, max: number) {
      return Math.floor(this.next() * (max - min + 1)) + min;
    },

    pick<T>(array: readonly T[]): T {
      if (array.length === 0) {
        throw new Error("Cannot pick from an empty array");
      }
      return array[this.int(0, array.length - 1)];
    },

    shuffle<T>(array: readonly T[]): T[] {
      const result = [...array];
      for (let i = result.length - 1; i > 0; i--) {
        const j = this.int(0, i);
        [result[i], result[j]] = [result[j], result[i]];
      }
      return result;
    },
  };
}

function generateRandomSeed(): string {
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    return array[0].toString(36);
  }
  return Math.random().toString(36).slice(2);
}
