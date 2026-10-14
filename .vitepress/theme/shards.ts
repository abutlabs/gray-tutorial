// Lesson 3.3's widget: erasure coding in miniature. A three-letter message is the curve of
// degree 2 through its letters' numbers (arithmetic mod 257), and each of 6 validators gets
// one point on it; any 3 points pin the curve down again (Lagrange), 2 can't. JAM's own
// code is a systematic Reed-Solomon code in GF(2^16) (Gray Paper, Appendix H): the same idea,
// bigger. tools/widget-results-shards.test.ts checks it, and the lesson's numbers.

/** The field: whole numbers mod 257, a prime just above a byte, so every letter fits. */
export const P = 257;

export const mod = (a: number): number => ((a % P) + P) % P;

/** a^e mod P, by squaring. */
export function power(a: number, e: number): number {
  let result = 1, base = mod(a);
  for (let n = e; n > 0; n >>= 1) {
    if (n & 1) result = (result * base) % P;
    base = (base * base) % P;
  }
  return result;
}

/** 1/a mod P: the b with a × b = 1 (Fermat: a^(P−2), since a^(P−1) = 1 for a ≠ 0). */
export function inverse(a: number): number {
  if (mod(a) === 0) throw new RangeError("0 has no inverse");
  return power(a, P - 2);
}

/** The Gray Paper's segment size W_G, in octets: R(v) must split it into pairs evenly. */
export const W_G = 4104;

/** R(v), the Gray Paper's number of original shards (eq. ecoriginalshards): the largest d
 *  below ⌊v/3⌋ + 2 with W_G mod 2d = 0. Any R(v) of the v shards rebuild the data. (With
 *  v/3 unrounded, 1,022 validators would get 342 and a rate near 1:3, not the 1:4.5 the
 *  Gray Paper says it has.) */
export function originalShards(v: number): number {
  let best = 0;
  for (let d = 1; d < Math.floor(v / 3) + 2; d++) if (W_G % (2 * d) === 0) best = d;
  return best;
}

export const SIZES = { tiny: 6, full: 1023 } as const;

/** A shard: which validator holds it (its point x) and its value there. */
export interface Shard { x: number; y: number }

/** The weight each known point's value gets in the curve's value at x (Lagrange):
 *  w_i = Π over the other points j of (x − x_j) / (x_i − x_j), all mod P. */
export function weights(xs: number[], x: number): number[] {
  return xs.map((xi, i) => {
    let top = 1, bottom = 1;
    xs.forEach((xj, j) => {
      if (j === i) return;
      top = (top * mod(x - xj)) % P;
      bottom = (bottom * mod(xi - xj)) % P;
    });
    return (top * inverse(bottom)) % P;
  });
}

/** The value at x of the one curve of degree below points.length through the points. */
export const valueAt = (points: Shard[], x: number): number =>
  weights(points.map((p) => p.x), x).reduce((sum, w, i) => (sum + w * points[i].y) % P, 0);

/** The n shards of a message of k numbers: the curve through (0, m₀), …, (k−1, m_{k−1}),
 *  read at x = 0 to n−1. Systematic, as JAM's is: the first k shards are the message itself. */
export function encodeShards(message: number[], n: number): number[] {
  const points = message.map((y, x) => ({ x, y: mod(y) }));
  return Array.from({ length: n }, (_, x) => (x < message.length ? mod(message[x]) : valueAt(points, x)));
}

/** The message back from the shards held: with k or more, the curve through any k of them,
 *  read at 0 to k−1; with fewer, null (k unknowns need k equations). */
export function rebuild(held: Shard[], k: number): number[] | null {
  if (held.length < k) return null;
  const use = held.slice(0, k);
  return Array.from({ length: k }, (_, x) => valueAt(use, x));
}

/** With fewer than k shards, a different message that gives exactly the same shards: the
 *  proof they can't decide. It moves the curve at the first point nobody holds by one. */
export function anotherFit(held: Shard[], message: number[], n: number): number[] {
  const k = message.length;
  const shards = encodeShards(message, n);
  const missing = shards.map((y, x) => ({ x, y })).filter((s) => !held.some((h) => h.x === s.x));
  const [moved, ...rest] = missing;
  const points = [...held, { x: moved.x, y: mod(moved.y + 1) }, ...rest].slice(0, k);
  return Array.from({ length: k }, (_, x) => valueAt(points, x));
}

/** A number as a letter when it is one (printable ASCII), else as a dot. */
export const letter = (y: number): string => (y >= 32 && y < 127 ? String.fromCharCode(y) : "·");

/** A short text's letters as numbers, or null if one isn't a byte (code 0 to 255). */
export function lettersOf(text: string): number[] | null {
  const codes = [...text].map((c) => c.codePointAt(0)!);
  return codes.every((c) => c < 256) ? codes : null;
}
