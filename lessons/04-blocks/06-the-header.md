# The header

The header is a block's cover page: a few hundred bytes that say where the block sits
in the chain, who made it, and what's inside, sealed with the author's signature. Every
node reads every header. It's the most-read structure in JAM, and now your client can
read it too.

## What the Gray Paper says

§5 (*The Header*) defines ten fields:

| Field | What it says |
| --- | --- |
| `parent` | the parent block's header hash: the link in the chain |
| `parent_state_root` | the state root after the parent block |
| `extrinsic_hash` | a hash committing to this block's extrinsic (Part 4's five bags) |
| `slot` | the timeslot (lesson 0.4), ℰ₄ |
| `epoch_mark` | at an epoch's first block only: fresh randomness, and the keys of the validators for the epoch that's starting |
| `tickets_mark` | once per epoch, when the ticket lottery closes: the winning ticket for every slot of the next epoch |
| `author_index` | which validator made this block, ℰ₂ |
| `entropy_source` | a VRF signature: 96 bytes of verifiable fresh randomness |
| `offenders_mark` | the Ed25519 keys of validators newly convicted in disputes (lesson 4.4) |
| `seal` | the author's signature over all of the above |

Two markers that are only sometimes there: that's what `option` is for (lesson 4.5). And
the tickets mark holds exactly one ticket per slot of an epoch, E of them, 12 on tiny and
600 on full, with no length in front: that's `seqN`. The epoch mark's validator list,
though, *does* carry its length. (Trust the bytes: lesson 4.5 checked both.)

And the order? You know the drill. §5 lists the offenders mark before the author index;
Appendix C writes the author index, the entropy source, *then* the offenders. The encoding
wins.

## The size grows

The tickets mark needs E, so the config gets its third constant:

**Replace in** `src/config.ts`

```ts
/** The protocol constants that depend on the size of the network. */
export type Config = {
  name: string;
  validators_count: number; // V: validators in a set
  core_count: number; // C: cores doing work in parallel
  epoch_length: number; // E: timeslots in an epoch
};

export const TINY: Config = {
  name: "tiny",
  validators_count: 6,
  core_count: 2,
  epoch_length: 12,
};

export const FULL: Config = {
  name: "full",
  validators_count: 1023,
  core_count: 341,
  epoch_length: 600,
};
```

An epoch is 600 slots of six seconds: one hour. Tiny's epochs last a brisk 72 seconds.

## The tests

**Add to** `test/block.test.ts`

```ts
import { Header } from "../src/block.ts";

testCodecVector("header_0", Header);
testCodecVector("header_1", Header);
```

The two vectors show both markers: `header_0` starts an epoch (epoch mark, no tickets),
`header_1` closes the lottery (tickets, no epoch mark).

**Run, expect it to fail**

```sh
npm test
# fails with: does not provide an export named
```

## The code

**Add to** `src/block.ts`

```ts
import { option, seqN } from "./codec/codec.ts";

/** A validator's two public keys, as an epoch mark lists them. */
export const EpochMarkValidatorKeys = record({
  bandersnatch: fixedBytes(32), // for sealing blocks and the ticket lottery
  ed25519: fixedBytes(32), // for signing everything else
});
export type EpochMarkValidatorKeys = Value<typeof EpochMarkValidatorKeys>;

/** The epoch mark (GP §5): at an epoch's first block, the randomness and validators ahead. */
export const EpochMark = record({
  entropy: hash,
  tickets_entropy: hash,
  validators: seq(EpochMarkValidatorKeys),
});
export type EpochMark = Value<typeof EpochMark>;

/** A winning ticket: its id and attempt. Once a ticket has won, its proof can stay behind. */
export const TicketBody = record({
  id: hash,
  attempt: u8,
});
export type TicketBody = Value<typeof TicketBody>;

/** A block header (GP §5). */
export function Header(config: Config) {
  return record({
    parent: hash, // the parent block's header hash
    parent_state_root: hash, // the state root after the parent block
    extrinsic_hash: hash, // commits to this block's extrinsic
    slot: u32,
    epoch_mark: option(EpochMark), // only in an epoch's first block
    tickets_mark: option(seqN(TicketBody, config.epoch_length)), // when the lottery closes
    author_index: u16, // which validator made this block
    entropy_source: fixedBytes(96), // a VRF signature: fresh randomness for the chain
    offenders_mark: seq(fixedBytes(32)), // Ed25519 keys of newly convicted validators
    seal: fixedBytes(96), // the author's signature over everything above
  });
}
export type Header = Value<ReturnType<typeof Header>>;
```

A winning ticket in the header is just its `id` and `attempt`. The 784-byte proof from
lesson 4.1 already did its job when the ticket was submitted; by now everyone has checked
it, so the header can travel light.

**Run**

```sh
npm test
# prints: header_1 (full)
# prints: fail 0
# prints: reported
npm run typecheck
```

## Watch it

**Replace in** `bin/decode.ts`

```ts
import { Header } from "../src/block.ts";

/** The structures this program knows, by the test vectors' names; some depend on the size. */
const CODECS = (config: Config): Record<string, Codec<unknown>> => ({
  refine_context: RefineContext,
  work_item: WorkItem,
  work_package: WorkPackage,
  work_result: WorkDigest,
  work_report: WorkReport,
  tickets_extrinsic: TicketsExtrinsic,
  preimages_extrinsic: PreimagesExtrinsic,
  assurances_extrinsic: AssurancesExtrinsic(config),
  guarantees_extrinsic: GuaranteesExtrinsic,
  disputes_extrinsic: DisputesExtrinsic,
  header: Header(config),
});
```

**Run**

```sh
node bin/decode.ts header ../vectors/codec/tiny/header_1.bin
# prints: epoch_mark.present             0x00
# prints: tickets_mark.present           0x01
# prints: tickets_mark.11.attempt
# prints: reported to Grafana
```

Read it top to bottom: no epoch mark (`0x00`), a tickets mark (`0x01`), and then twelve
tickets, `tickets_mark.0` to `tickets_mark.11`, one for each slot of tiny's next epoch.
No length anywhere in between: the client knew there'd be twelve.

<details>
<summary>lasair: four headers, in four files</summary>

lasair has a `type header` in `lib/header.ml`, written in the Gray Paper's own notation:

```ocaml
type header = {
  parent: hash;             (** H_p: Hash of parent header *)
  prior_state_root: hash;   (** H_r: Prior state root (BEFORE this block) *)
  extrinsic_hash: hash;     (** H_x: Extrinsic Merkle commitment *)
  timeslot: timeslot;       (** H_t: Timeslot index *)
  epoch_marker: epoch_marker option;    (** H_e: Fallback epoch data *)
  winners_marker: winners_marker option; (** H_w: Next epoch tickets *)
  offenders_marker: ed_key seq;  (** H_o: Misbehaving validators *)
  author_index: val_index;  (** H_i: Block author validator index *)
  vrf_signature: bs_signature;   (** H_v: Entropy VRF signature *)
  seal_signature: bs_signature;  (** H_s: Block seal signature *)
}
```

It also has one in `lib/block_codec.ml`, one in `lib/overview.ml`, and one in
`conformance/codec_tests.ml`: four headers, grown over months, each kept in step with the
others by hand and by tests. Your client has one `Header`, and it is the type, the
encoder, the decoder and the JSON reader at once.

</details>

## What you have

A client that can read the cover page of any JAM block, at either size. Next, the whole
block.
