# The extrinsic hash

Nodes pass headers around on their own, ahead of the rest of the block. A header is a
few hundred bytes; the extrinsic behind it can be many times that. So how does a header
say *exactly* which extrinsic belongs to it? With a field you've decoded since lesson 4.6
without a second look: `extrinsic_hash`, 32 bytes that promise the whole contents. Swap
one ticket, drop one signature, and the promise is broken. This lesson computes the
promise, then checks it in 400 real blocks.

## What the Gray Paper says

§5 (*The Header*), in three steps:

1. Encode each of the extrinsic's five parts, in Appendix C's order: tickets, preimages,
   guarantees, assurances, disputes.
2. Hash each encoding. That's five hashes.
3. Glue the five hashes together, 160 bytes, and hash *that*.

Two parts get a twist before step 1:

- a **preimage** goes in as its requester and the *hash* of its data, not the data;
- a **guarantee** goes in as the *hash* of its work-report, then its slot and signatures.

Why? The Gray Paper calls the extrinsic hash a Merkle commitment that lets reports and
preimages "individually have their inclusion proven". To prove one report was in a
block, you show the report, the guarantees part (every other report shrunk to its 32-byte
hash), and the other four parts' hashes. Nobody needs the other reports themselves.

## The tests

The test vectors have block traces besides `fallback`, and they carry different things.
Over their 100 blocks each:

| Trace | What its blocks carry |
| --- | --- |
| `fallback` | nothing at all: every extrinsic is empty |
| `safrole` | 80 tickets |
| `preimages` | 68 preimages, 87 guarantees, 524 assurances |
| `storage` | 86 guarantees, 520 assurances |

Together they put four of the five parts to work. (No trace carries a dispute, so here
the disputes part is only ever empty. Lesson 4.4's vectors already checked its bytes.)
First, let `traceBlock` read any of them:

**Replace in** `test/hash.test.ts`

```ts
/** Block n of a tiny trace ("fallback" unless said): a chain of 100 real blocks. */
function traceBlock(n: number, family = "fallback"): Block {
  const name = `traces/${family}/${String(n).padStart(8, "0")}.json`;
  const trace = vectorJson(name) as { block: unknown };
  return Block(TINY).fromJson(trace.block);
}
```

Then check every block's promise, in all four traces:

**Add to** `test/hash.test.ts`

```ts
import { extrinsicHash } from "../src/block.ts";

test("every block's header promises its extrinsic by hash", () => {
  for (const family of ["fallback", "safrole", "preimages", "storage"]) {
    for (let n = 1; n <= 100; n++) {
      const { header, extrinsic } = traceBlock(n, family);
      assert.deepEqual(extrinsicHash(TINY, extrinsic), header.extrinsic_hash, `${family} ${n}`);
    }
  }
});
```

That last argument to `deepEqual` is the message for a failure: if block 42 of
`preimages` disagrees, the test says `preimages 42` instead of leaving you to guess.

**Run, expect it to fail**

```sh
npm test
# fails with: does not provide an export named
```

## The code

**Add to** `src/block.ts`

```ts
import { concatBytes } from "./bytes.ts";

/** A preimage as the extrinsic hash sees it: its requester, and the hash of its data. */
const HashedPreimage = record({
  requester: u32,
  hash: hash,
});

/** A guarantee as the extrinsic hash sees it: the report's hash in place of the report. */
const HashedGuarantee = record({
  report: hash,
  slot: u32,
  signatures: seq(ValidatorSignature),
});

/**
 * The extrinsic hash (GP §5): the hash of the five parts' hashes. Preimages and reports
 * go in by their own hashes, so that each can be proven part of the block on its own.
 */
export function extrinsicHash(config: Config, extrinsic: Extrinsic): Bytes {
  const preimages = extrinsic.preimages.map((p) => ({
    requester: p.requester,
    hash: blake2b256(p.blob),
  }));
  const guarantees = extrinsic.guarantees.map((g) => ({
    report: blake2b256(encode(WorkReport, g.report)),
    slot: g.slot,
    signatures: g.signatures,
  }));
  const parts = [
    encode(TicketsExtrinsic, extrinsic.tickets),
    encode(seq(HashedPreimage), preimages),
    encode(seq(HashedGuarantee), guarantees),
    encode(AssurancesExtrinsic(config), extrinsic.assurances),
    encode(DisputesExtrinsic, extrinsic.disputes),
  ];
  return blake2b256(concatBytes(...parts.map(blake2b256)));
}
```

The Gray Paper's three steps close the function: `parts` is step 1,
`parts.map(blake2b256)` is step 2, and `blake2b256(concatBytes(...))` is step 3. The two
twists are plain records from Part 2, built for this one job. They aren't exported:
nothing else in the client needs them.

**Run**

```sh
npm test
# prints: every block's header promises its extrinsic by hash
# prints: fail 0
# prints: reported
npm run typecheck
```

400 promises, all kept. Here's a fun one: all 100 `fallback` blocks carry the *same*
extrinsic hash, `0x189d15af...6ca252`. Five empty parts always encode the same way, so
they always hash the same way: that's the fingerprint of an empty block.

## Watch it

`bin/chain.ts` gets the second check, and learns to walk any trace you name.

**Rewrite** `bin/chain.ts`

```ts
// Walks the 100 blocks of a tiny trace ("fallback", unless you name another) and checks
// each one: does it name the hash of the block before it as its parent, and does its
// header's extrinsic hash match the extrinsic it carries?

import { readFileSync } from "node:fs";
import { Block, extrinsicHash, headerHash } from "../src/block.ts";
import type { Bytes } from "../src/bytes.ts";
import { toHex } from "../src/bytes.ts";
import { TINY } from "../src/config.ts";
import { Run } from "../src/obs.ts";

const trace = process.argv[2] ?? "fallback";
const run = new Run("chain");
let previous: Bytes | null = null; // the hash of the last block's header
let holding = 0;
let matching = 0;
for (let n = 1; n <= 100; n++) {
  const file = `../vectors/traces/${trace}/${String(n).padStart(8, "0")}.json`;
  const json = JSON.parse(readFileSync(file, "utf8"));
  const { header, extrinsic } = Block(TINY).fromJson(json.block);
  const hash = headerHash(TINY, header);
  const linked = previous !== null && toHex(header.parent) === toHex(previous);
  if (linked) holding++;
  const matches = toHex(extrinsicHash(TINY, extrinsic)) === toHex(header.extrinsic_hash);
  if (matches) matching++;
  run.event("block", { slot: header.slot, hash, parent: header.parent, linked, matches });
  previous = hash;
}
console.log(`${holding} of 99 links hold.`);
console.log(`${matching} of 100 extrinsics match their headers.`);
const link = await run.report();
if (link) console.log(`reported to Grafana: ${link}`);
```

**Run**

```sh
node bin/chain.ts preimages
# prints: 99 of 99 links hold.
# prints: 100 of 100 extrinsics match their headers.
# prints: reported to Grafana
```

The *Chain* panel now ends each block's line with `extrinsic matches: true`. Try the
others too: `node bin/chain.ts safrole`, `node bin/chain.ts storage`, and plain
`node bin/chain.ts` for `fallback`.

### Break it on purpose

In Gray Paper 0.7.2, preimages went into the extrinsic hash *whole*: only reports were
swapped for their hashes. 0.8.0 shrinks preimages too. Travel back in time: in
`extrinsicHash`, change

```ts
    encode(seq(HashedPreimage), preimages),
```

to

```ts
    encode(PreimagesExtrinsic, extrinsic.preimages),
```

and run `node bin/chain.ts preimages` again. 73 of 100 extrinsics match: the 27 blocks
that carry a preimage now break their promise, and every block without one is fine,
because an empty list encodes the same way under both rules. The links still hold: the
headers didn't change, only your idea of what they promise. Put the line back, and the
100 come back.

<details>
<summary>lasair: two <code>compute_extrinsic_hash</code>es</summary>

lasair has one in `lib/header.ml`, next to the header it belongs to:

```ocaml
(** Placeholder for extrinsic hash computation. *)
let compute_extrinsic_hash (_extrinsic : Overview.extrinsic) : hash =
  failwith "TODO: implement extrinsic hash"
```

That one is still a placeholder. The one lasair really uses lives in
`conformance/stf_guarantees.ml`, and it builds each part's bytes by hand. Its preimages:

```ocaml
  let preimages = cat (compact (List.length e.preimages) ::
    List.map (fun (req, blob) ->
      cat [u32 req; hash_bytes blob]) e.preimages) in
```

A count, then each requester as four bytes and its data's hash: exactly your
`seq(HashedPreimage)`, spelled out byte by byte, and the same for the other four parts.
Your version reuses the codecs you already trust, so it has one less place to be wrong.

</details>

## What you have

A client that checks two promises in every block: the link to its parent, and the
contents of its extrinsic. One kind of promise is left in Part 5: signatures, a
validator's word that *it* made something.
