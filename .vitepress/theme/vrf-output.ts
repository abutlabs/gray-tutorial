// Lesson 8.6's widget: 𝒴, the VRF output, in its three steps, on the run's five real blocks
// (the safrole trace's blocks 1 to 5). The output point is the entropy source's first 32
// bytes; SHA-512 of the suite's name, 03, the point and 00, cut to 32 bytes, is 𝒴; and
// η′₀ = H(η₀ ⌢ 𝒴). tools/widget-vrf-output.test.ts checks every value against the run's
// Output and, where vectors/ is downloaded, the trace.

import { sha512 } from "@noble/hashes/sha2.js";
import { fromHex } from "./codec-map.ts";
import { H } from "./hash.ts";

/** The VRF suite's name, as ark-vrf hashes it in. */
export const SUITE = "Bandersnatch_SHA-512_ELL2";
export const SUITE_BYTES = Array.from(new TextEncoder().encode(SUITE));

/** The safrole trace's blocks 1 to 5: slot, author, the header's entropy source (96 bytes),
 *  and η₀ in the state before the block. */
export const BLOCKS = [
  { n: 1, slot: 1, author: 0, source: "0x62bc9d2311da8db52da45c5785333b39da3f1464b0d0341d12e2ee2987da6595463487a2d903c169560a90521ce06ecc99e466afeaa04f766e4e6fd3bf3677170282a54709e0e92a1a37c853f8c83053c9746e53581366bf1aaedd621bd4a713", eta0Before: "0x15791ce2f9ad023b718ff82e41541cbdb452b39e8eb79204f81989e25717c70f" },
  { n: 2, slot: 2, author: 3, source: "0x635d6b1cd157934ab5867aa23bcb674989df30bb89853db2b1756e0fe24e318239fbdd0246efa09e6940f9ad136ec0d412cae086f5e1ef3ed5fdc58e1dedba1c3390dee109dace4b386fd0b6687e144e0290186da441fd7d85962cbb1e111308", eta0Before: "0x5b8e9d7c5c737a1d41f8dc4ad0cd7962e4718ee3761146c2ba992f6fbdf172ce" },
  { n: 3, slot: 3, author: 3, source: "0x635d6b1cd157934ab5867aa23bcb674989df30bb89853db2b1756e0fe24e318239fbdd0246efa09e6940f9ad136ec0d412cae086f5e1ef3ed5fdc58e1dedba1c3390dee109dace4b386fd0b6687e144e0290186da441fd7d85962cbb1e111308", eta0Before: "0x8087a00e646ae4425ac6ac961ef0246cb6e68ccefb4bd1f312e88ede54c9f2cd" },
  { n: 4, slot: 4, author: 5, source: "0xc50ffdade8936f3a7ceda394ec831ff3a840d64525388038f693825004b5005e24b2dbbe2dc19a86920335dc3d97812e9dca8fb3ee7f3a19d8c5de1a5d8fdd117b7d993feffff1e6fe5029d27b1d0106ee7e1b1432aa4102d93d6c4dba550c07", eta0Before: "0x6599553b14e478fa2aa9e6397958bdf447e1fde7640ed832c1ad44b3b9eb387c" },
  { n: 5, slot: 5, author: 2, source: "0x450dad32a84cdfa584f830fe2c5bfc3b9eaec59885f8b5857af3cb25769faee24586ebd8666c8d29df60725c1e98208a2f5c1a726bf43039b5f6e50b5d88cb013537fa53af9118b8198eddf83985568a908269a13a0e3cd1bc4f92908860070b", eta0Before: "0x7973268a3e9fccb18a6de4ea696e00a411dee7176bcef27c9291b40081429422" },
];
/** η₀ after block 5: the trace's state before block 6. */
export const ETA0_AFTER_5 = "0xe63da7998812574c7ca43e62c5a7e3481f8e101c249cb17aafc4845d6f965444";

/** The three steps of 𝒴 on one entropy source, and η′₀ from the η₀ before. */
export function vrfSteps(source: string, eta0Before: string) {
  const signature = fromHex(source);
  const point = signature.slice(0, 32); // 1: the output point
  const input = [...SUITE_BYTES, 3, ...point, 0]; // 2: what SHA-512 hashes
  const hash = Array.from(sha512(Uint8Array.from(input)));
  const output = hash.slice(0, 32); // 3: 𝒴
  const eta0 = H([...fromHex(eta0Before), ...output]); // η′₀ = H(η₀ ⌢ 𝒴)
  return { signature, point, input, hash, output, eta0 };
}
export const STEPS = BLOCKS.map((b) => vrfSteps(b.source, b.eta0Before));
