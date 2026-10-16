// Lesson 8.3's widget: F, the fallback sealers, worked one slot at a time. Slot i's sealer
// is validator ℰ₄⁻¹(the first four bytes of H(η′₂ ⌢ ℰ₄(i))) mod |κ′| of κ′. The values are
// the run's vector, enact-epoch-change-with-no-tickets-4: η′₂ is its old η₁, κ′ its old γ_K.
// tools/widget-fallback-sealer.test.ts checks every slot against the run's Output and the
// vector's γ_S.

import { encodeFixed, toHex } from "./bytes.ts";
import { fromHex } from "./codec-map.ts";
import { H } from "./hash.ts";

export const EPOCH_LENGTH = 12;
/** η′₂: the vector's pre-state η₁, carried two epochs on. */
export const ETA_2 = "0xee155ace9c40292074cb6aff8c9ccdd273c81648ff1149ef36bcea6ebb8a3e25";
/** κ′'s Bandersnatch keys: the vector's pre-state γ_K, the new active set. */
export const KAPPA = [
  "0xff71c6c03ff88adb5ed52c9681de1629a54e702fc14729f6b50d2f0a76f185b3",
  "0xdee6d555b82024f1ccf8a1e37e60fa60fd40b1958c4bb3006af78647950e1b91",
  "0x9326edb21e5541717fde24ec085000b28709847b8aab1ac51f84e94b37ca1b66",
  "0x0746846d17469fb2f95ef365efcab9f4e22fa1feb53111c995376be8019981cc",
  "0x151e5c8fe2b9d8a606966a79edd2f9e5db47e83947ce368ccba53bf6ba20a40b",
  "0x2105650944fcd101621fd5bb3124c9fd191d114b7ad936c1d79d734f9f21392e",
];

/** One slot's draw, every step on its real bytes. */
export interface Draw { slot: number; input: number[]; hash: number[]; first4: number[]; number: number; validator: number; key: string }
export function draw(slot: number, eta2 = ETA_2, kappa = KAPPA): Draw {
  const input = [...fromHex(eta2), ...encodeFixed(BigInt(slot), 4)]; // η′₂ ⌢ ℰ₄(i)
  const hash = H(input);
  const first4 = hash.slice(0, 4);
  const number = first4.reduce((n, b, k) => n + b * 2 ** (8 * k), 0); // ℰ₄⁻¹: least significant first
  const validator = number % kappa.length;
  return { slot, input, hash, first4, number, validator, key: kappa[validator] };
}
export const DRAWS: Draw[] = Array.from({ length: EPOCH_LENGTH }, (_, i) => draw(i));
/** How many slots each validator seals. */
export const TALLY: number[] = KAPPA.map((_, v) => DRAWS.filter((d) => d.validator === v).length);
export const hexOf = (bytes: number[]): string => toHex(bytes);
