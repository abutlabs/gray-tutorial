# Glossary

Every word this tutorial uses that a newcomer might not know, in plain English first,
with a small example. Where the Gray Paper (the GP, JAM's specification) has a symbol for
it, the symbol comes next, and the link at the end goes to the lesson that builds it.

You don't need to read this page first. Come back whenever a word stops you. The groups go
from the most everyday words to the most JAM-specific ones.

## The big picture

**JAM.** A blockchain protocol that blends ideas from Polkadot and Ethereum: anyone can put
a program (a service) on it, and the work for those programs runs in parallel on many
cores. *Example:* in Part 15 you run a real service's code.
([0.1](./00-start/01-what-you-will-build.md))

**Gray Paper (GP).** JAM's specification: the document that defines every rule, mostly in
maths. This tutorial follows version 0.8.0. *Example:* "§4" is its section 4.
([0.1](./00-start/01-what-you-will-build.md))

**Client.** A program that follows a protocol's rules. A JAM client reads blocks and works
out the chain's state, the same way every other client does. *Example:* lasair, and yours.
([0.1](./00-start/01-what-you-will-build.md))

## Programming words

**TypeScript.** JavaScript with types: you write down what kind of value each thing is
(a number, a list of bytes...), and a checker, `tsc`, catches mix-ups before you run
anything. *Example:* `const slot: number = 42`. ([0.2](./00-start/02-set-up-the-project.md))

**Node.** The program that runs your TypeScript files, outside a browser. *Example:*
`node bin/now.ts` runs the clock program. ([0.2](./00-start/02-set-up-the-project.md))

**npm.** Node's tool for downloading libraries and running a project's scripts.
*Example:* `npm test` runs every test. ([0.2](./00-start/02-set-up-the-project.md))

**Test.** A small program that checks one thing your code should do, and fails loudly if
it doesn't. This tutorial writes the test first, watches it fail, then writes the code.
*Example:* "slot 0 is the first six seconds of the JAM Common Era".
([0.4](./00-start/04-the-jam-clock.md))

**Test vector.** An official example from JAM's test suite: an input and the exact output
a correct client must produce, as files. Matching them is how you know your client is
right. *Example:* `codec/tiny/work_item.bin` and its `.json`.
([2.6](./02-codec/06-the-first-test-vectors.md))

**nvm.** A tool that installs Node versions and switches between them. *Example:*
`nvm use`. ([0.2](./00-start/02-set-up-the-project.md))

**tsc.** The TypeScript compiler; in this tutorial it only checks types and writes
nothing. *Example:* `npm run typecheck`. ([0.2](./00-start/02-set-up-the-project.md))

**Docker.** Runs ready-made programs in containers, so a whole set of tools starts with one
command. *Example:* `./obs up`. ([0.2](./00-start/02-set-up-the-project.md))

**Module.** A file that shares code with other files through `import` and `export`.
*Example:* `src/time.ts` exports `slotAt`. ([0.2](./00-start/02-set-up-the-project.md))

**Assertion.** One check inside a test: if the value is wrong, the test fails and says what
it got. *Example:* `assert.equal(slot, 600)`. ([0.4](./00-start/04-the-jam-clock.md))

**Test-first.** Writing a test before the code it tests, watching it fail, then making it
pass. *Example:* lesson 0.4's `slotAt`. ([0.4](./00-start/04-the-jam-clock.md))

**Reporter.** A plug-in for Node's test runner that receives every test's result; yours
sends them to Grafana. *Example:* `test/grafana.ts`. ([0.3](./00-start/03-watch-your-client.md))

**Observability, event and run.** Observability is seeing what a program does while it
runs. An event is one line saying something happened; a run is one `npm test` or one
program, everything it reported labelled with one id. *Example:* pick a run in Grafana to
see only its events. ([0.3](./00-start/03-watch-your-client.md))

**Unix epoch.** 00:00 UTC on 1 January 1970, the moment most computer clocks count from
(nothing to do with a JAM epoch). *Example:* the JAM Common Era is 1,735,732,800 seconds
after it. ([0.4](./00-start/04-the-jam-clock.md))

**`bigint`.** A JavaScript whole number with no size limit, written with an `n`.
Ordinary numbers lose precision past about 9 quadrillion (2^53); JAM's 64-bit numbers
need `bigint`. *Example:* `2n ** 64n - 1n`. ([1.2](./01-bytes-and-numbers/02-numbers.md))

**Floating point.** How a JavaScript `number` is stored: about 16 significant digits and
an exponent, so a huge whole number gets rounded. *Example:* `2 ** 64 - 70 === 2 ** 64`
is `true`. ([1.2](./01-bytes-and-numbers/02-numbers.md))

**Unsigned integer (u8, u16, u32, u64).** A whole number that is never negative, kept in
a fixed number of bits. The GP writes a u32 as ℕ_{2^32}, a natural below 2^32.
*Example:* a u32 goes from 0 to 4294967295. ([1.2](./01-bytes-and-numbers/02-numbers.md))

**Bitwise operator.** An operator that works on a number's bits: `|`, `&`, `^` and the
shifts `<<`, `>>`, `>>>`. In JavaScript they treat numbers as signed 32-bit integers.
*Example:* `6 & 3` is 2. ([1.2](./01-bytes-and-numbers/02-numbers.md))

**`Uint8Array`.** A row of bytes, the type this client uses for raw data.
*Example:* `Uint8Array.of(1, 2, 3)` is three bytes.
([1.1](./01-bytes-and-numbers/01-bytes-and-hex.md))

**Type alias.** A second name for a type you already have; it checks nothing extra, but
says what a value is for. *Example:* `type Bytes = Uint8Array`.
([1.1](./01-bytes-and-numbers/01-bytes-and-hex.md))

**Stack trace.** When a program crashes, the list of function calls it was in the middle
of, innermost first. Look for the first line in your own code. *Example:* `at fromHex
(src/bytes.ts:13:21)`. ([1.1](./01-bytes-and-numbers/01-bytes-and-hex.md))

**`Map`.** A lookup table from keys to values. *Example:* a service's storage maps each
key to its value. ([16.5](./16-host-calls/05-storage.md))

**Grafana.** The dashboard where your client's runs show up, with Loki (for events) and a
Pushgateway (for numbers) behind it. *Example:* the *Chain* panel lists 100 blocks.
([0.3](./00-start/03-watch-your-client.md))

## Bytes and encoding

**Byte (octet).** Eight bits: a number from 0 to 255. The GP says *octet*, and writes a
row of them as 𝔹. Everything JAM sends or stores is bytes. *Example:* 255, the biggest
byte, is `0xff` in hex. ([1.1](./01-bytes-and-numbers/01-bytes-and-hex.md))

**Hex.** Writing bytes as pairs of the digits 0-9 and a-f, after `0x`. *Example:* `0xff`
is the byte 255; `0x0102` is the bytes 1 and 2. ([1.1](./01-bytes-and-numbers/01-bytes-and-hex.md))

**Little-endian.** Writing a number's bytes smallest first. JAM does this everywhere.
*Example:* 258 in two bytes is `0x0201`. ([2.1](./02-codec/01-fixed-width-integers.md))

**Encoding, decoding, codec.** Encoding turns a value into bytes; decoding turns the
bytes back; a codec is the pair. The GP writes encoding as ℰ (Appendix C). *Example:* the
number 5 in one byte encodes as `0x05`. ([2.4](./02-codec/04-codecs.md))

**Compact natural.** JAM's space-saving way to encode a whole number: small numbers take
one byte, bigger ones more, and the first byte says how many follow. *Example:* 5 is
`0x05`, one byte; 300 takes two. ([2.2](./02-codec/02-compact-naturals.md))

**Blob.** Any run of bytes of no fixed length. Encoded with its length in front (the GP's
↕). *Example:* the three bytes 1, 2, 3 encode as `0x03010203`.
([2.5](./02-codec/05-sequences-and-records.md))

**Sequence and record.** A sequence is a list of the same kind of thing, a record a fixed
set of named fields, encoded one after another. *Example:* a work-item is a record; the
items of a package are a sequence. ([2.5](./02-codec/05-sequences-and-records.md))

**Option.** A value that may be missing: one byte, 0 for "nothing" or 1 and then the
value. *Example:* a header's epoch mark is only there at an epoch's start.
([4.5](./04-blocks/05-maybe-and-exactly-n.md))

## Time and the chain

**Timeslot (slot).** τ. A six-second tick of JAM's clock, counted from 0 at 12:00 UTC on
1 January 2025, the *JAM Common Era*. At most one block is made per slot. *Example:* 12:00:06
that day was slot 1. ([0.4](./00-start/04-the-jam-clock.md))

**Epoch.** A run of E slots: 600 (one hour) on the real network, 12 on the tiny test
network. Validators and the block-making lottery change at epoch boundaries.
([7.1](./07-time-and-shuffling/01-epochs.md))

**Tiny and full.** Two sizes of JAM with the same rules: *full* is the real network (1,023
validators, 341 cores), *tiny* a small one for tests (6 validators, 2 cores). The test
vectors come in both. ([4.2](./04-blocks/02-tiny-and-full.md))

**Block.** What the chain adds each slot: a header plus an extrinsic.
([4.7](./04-blocks/07-the-block.md))

**Header.** H. A block's cover page: its parent's hash, its slot, who made it, and a
seal. *Example:* `header.slot` says when the block was made. ([4.6](./04-blocks/06-the-header.md))

**Extrinsic.** E. The block's contents from the outside world, in five parts: tickets,
preimages, guarantees, assurances and disputes. ([4.1](./04-blocks/01-tickets-and-preimages.md))
A work-item's *extrinsics* are something else: data blobs sent along with the item, for
refine to read. *Example:* `items.1.extrinsic.0`, its first blob's hash and length.
([3.1](./03-work-and-reports/01-a-work-package.md))

**Parent.** The block before this one. Each header names its parent by hash, which is
what makes the blocks a chain. ([5.1](./05-hashing-and-signatures/01-hashes.md))

**Hash.** H(x). A 32-byte fingerprint of some data (JAM uses Blake2b-256). Change one bit
of the data and the fingerprint changes completely. *Example:* the hash of no bytes at
all starts `0x0e5751c0`. ([5.1](./05-hashing-and-signatures/01-hashes.md))

**Signature.** Proof that the holder of a secret key approved some bytes; anyone with the
matching public key can check it. JAM's everyday kind is Ed25519.
([5.3](./05-hashing-and-signatures/03-signatures.md))

**State.** σ. Everything the chain remembers between blocks: the validators, the
entropy, every service's account, and more, each part a *component* with a Greek letter.
*Example:* τ is the time, η the entropy.
([6.3](./06-state-and-merklization/03-reading-the-state.md))

**State root.** One 32-byte hash that fingerprints the whole state, through a tree of
hashes (a *trie*). Two clients agree on the state exactly when they agree on the root.
([6.1](./06-state-and-merklization/01-the-state-trie.md))

**State transition.** Υ. The rule that takes the state before a block, and the block, to
the state after it. A JAM client is, at heart, this one function.
([0.1](./00-start/01-what-you-will-build.md))

**Trace.** A recorded run of real blocks, each with the state before and after it, from
the test vectors. *Example:* the tiny `fallback` trace has 100 blocks.
([5.1](./05-hashing-and-signatures/01-hashes.md))

**Preimage.** The data behind a hash: if h = H(d), d is h's preimage. Services ask for
preimages by hash, and blocks provide them. ([14.1](./14-services/01-providing-preimages.md))

## Validators and making blocks

**Validator.** One of the V machines (1,023 on full, 6 on tiny) that run JAM: they make
blocks, check work and vote. ([4.2](./04-blocks/02-tiny-and-full.md))

**Validator sets.** Four lists of validators: κ the active ones, λ last epoch's, γ_P the
next epoch's (pending), and ι the ones queued after that (staging). Each epoch they move
along one. ([8.2](./08-safrole/02-rotating-the-validators.md))

**Entropy.** η. Randomness the chain gathers from every block, so that no one can predict
the future lotteries. ([8.1](./08-safrole/01-stirring-the-entropy.md))

**Safrole.** JAM's way of choosing who makes each block: a lottery run one epoch ahead.
([8.5](./08-safrole/05-one-step-of-safrole.md))

**Ticket.** A validator's anonymous entry in the lottery for the next epoch's slots.
([4.1](./04-blocks/01-tickets-and-preimages.md), [8.4](./08-safrole/04-the-lotterys-winners.md))

**Sealer and seal.** The sealer is the validator allowed to make the block in a slot; the
seal is its signature on the header. When the lottery didn't fill the epoch, fallback
sealers are picked from the entropy instead. ([8.3](./08-safrole/03-the-fallback-sealers.md))

## Work, cores and reports

**Core.** One of C parallel lanes (341 on full, 2 on tiny) where work gets done, a few
validators at a time. ([4.2](./04-blocks/02-tiny-and-full.md))

**Service.** A program that lives on JAM, with an id, code, a balance and storage. It
runs in two stages: refine, on a core, and accumulate, on the chain.
([14.2](./14-services/02-the-service-account.md))

**Work-item and work-package.** A work-item is one job for one service, with its input
(the *payload*) and gas limits; a work-package bundles up to 16 of them for one core.
([3.1](./03-work-and-reports/01-a-work-package.md))

**Refine.** The heavy, off-chain stage: a core runs each work-item's service code on its
payload and gets a result. ([3.2](./03-work-and-reports/02-work-digests.md))

**Work-digest (work result).** What refining one work-item produced: an output, or an
error, plus the gas it may use when accumulated. ([3.2](./03-work-and-reports/02-work-digests.md))

**Bundle.** A work-package together with everything needed to refine it: its extrinsics,
and the segments it imports with their proofs. Its length is in the report's
`package_spec`. *Example:* a 17180-byte bundle.
([18.2](./18-statistics/02-what-cores-and-services-did.md))

**Segment.** A 4104-byte piece of data (W_G) that a work-item exports, for later packages
to import. Every 64 of them come with a proof page. *Example:* a report exporting 3
segments. ([18.2](./18-statistics/02-what-cores-and-services-did.md))

**Work-report.** A core's statement about one package: its digests, and enough detail to
check and fetch everything. ([3.3](./03-work-and-reports/03-a-work-report.md))

**Authorizer.** Code that decides whether a package may use a core at all. Each core keeps
a small pool of authorizers. ([13.1](./13-authorization/01-the-authorizer-pools.md))

**Guarantee and guarantor.** Two or three validators (the guarantors) sign a work-report
to vouch that it's right; that bundle is a guarantee, and it puts the report onto its
core. ([12.2](./12-guarantees/02-signed-and-counted.md))

**Assurance and availability.** Each validator signs one bit per core: "I hold my piece of
this core's data". When more than two thirds do, the report is *available*.
([11.1](./11-assurances/01-available.md))

**Accumulate.** The light, on-chain stage: a service folds the results of its refined
work into its own state. ([16.6](./16-host-calls/06-checkpoints.md))

**Gas.** A count of how much computing something takes; every program has a budget, and
runs out when it's spent. ([15.9](./15-the-pvm/09-what-instructions-cost.md))

## Disputes

**Judgement and verdict.** When a work-report is challenged, validators vote on it
(judgements); enough of them together make a verdict: good, bad, or *wonky* (split).
([10.1](./10-disputes/01-votes-and-verdicts.md))

**Culprit, fault and offender.** A culprit guaranteed a report that turned out bad; a
fault voted against the verdict. Both become *offenders*, and lose their part in the
validator sets. ([10.2](./10-disputes/02-culprits-and-faults.md))

## Services and their accounts

**Service account.** A service's record in the state: its code hash, balance, gas
minimums, and counts of what it keeps. ([14.2](./14-services/02-the-service-account.md))

**Storage.** A service's own key-value store in the state. *Example:* a service writes the
key "last" with some bytes, and reads it back next time. ([16.5](./16-host-calls/05-storage.md))

**Request.** A service asking for a preimage by hash and length. Its history is a short
list of slots: asked for, provided, forgotten. ([16.9](./16-host-calls/09-asking-for-preimages.md))

**Footprint, deposit and minimum balance.** What a service keeps (items and bytes) costs
deposit: it must hold at least 100 + 10 per item + 1 per byte, its minimum balance.
([14.2](./14-services/02-the-service-account.md))

**Host call.** A program asking the client running it for something it can't do alone:
the gas left, an input, a storage read. ([16.1](./16-host-calls/01-calling-the-host.md))

**Checkpoint.** A moment a service marks as "keep everything up to here": if it fails
later, its changes roll back to the last checkpoint. ([16.6](./16-host-calls/06-checkpoints.md))

## Accumulating a block

**Always-accumulate service.** χ_Z. A service that accumulates in every block, on a
fixed amount of free gas, whether or not work came in for it. *Example:* in the
`always_accumulate` vectors, service 1729 runs with 100,000 free gas.
([16.7](./16-host-calls/07-a-services-inputs.md))

**Prerequisite.** A work-package that a report says must be accumulated before it.
*Example:* if package B names package A, B's report waits until A's has been accumulated.
([17.1](./17-accumulation/01-a-blocks-accumulation.md))

**Round.** Several services accumulated side by side, all from the same starting state;
none sees what the others do in that round. The GP's Δ\*.
([17.1](./17-accumulation/01-a-blocks-accumulation.md))

**Dependency.** Anything a report waits for: its prerequisites, and any work-packages its
segment-root lookups name. *Example:* report D depends on package A.
([17.2](./17-accumulation/02-waiting-reports.md))

**Ready queue.** ω. Where reports with dependencies wait: one list for each slot of an
epoch, used as a ring. *Example:* a report arriving at slot 43 on tiny waits in list 7.
([17.2](./17-accumulation/02-waiting-reports.md))

**Accumulated history.** ξ. For each of the last E slots, the set of work-packages
accumulated in it; dependencies are checked against it.
([17.2](./17-accumulation/02-waiting-reports.md))

**Unlock.** A waiting report goes once its last dependency is accumulated, possibly in
the same block. *Example:* A accumulates, so D, waiting for A, goes right after it.
([17.2](./17-accumulation/02-waiting-reports.md))

**Deferred transfer.** 𝕏. Money one service sends another while it accumulates: the
sender pays at once, the receiver gets it in the next round of the same block.
*Example:* service 0 sends service 1 a hundred. ([17.3](./17-accumulation/03-sending-a-transfer.md))

**Memo.** W_T = 128 bytes. A note that travels with a transfer, for the receiver's code to
read. *Example:* the bytes of "gift", then 124 zeros.
([17.3](./17-accumulation/03-sending-a-transfer.md))

**Outbox.** This client's name for the transfers a run has sent so far (the GP's 𝐭), and
the ones its last checkpoint kept. *Example:* two sent, one before the checkpoint.
([17.3](./17-accumulation/03-sending-a-transfer.md))

**Accumulation statistics.** S(s) = (N, T, G). For each service, per block: the digests
it accumulated, the transfers it received, the gas it used. *Example:* (1, 0, 29,643).
([17.1](./17-accumulation/01-a-blocks-accumulation.md))

**Last-accumulation slot.** The slot in which a service last accumulated, kept in its
account. *Example:* 43, after accumulating in slot 43.
([17.1](./17-accumulation/01-a-blocks-accumulation.md))

## Statistics

**Validator statistics.** π_V and π_L. A tally of each validator's work, for the epoch in
progress and the one before: blocks, tickets, preimages and their bytes, guarantees,
assurances. *Example:* 1 block, 2 tickets, 3 preimages of 51 bytes.
([18.1](./18-statistics/01-who-did-what.md))

**Core statistics.** π_C. One block's scorecard for each core: the work in the reports it
took on, its data load and its popularity. *Example:* core 0: 821 gas, a 17180-byte
bundle. ([18.2](./18-statistics/02-what-cores-and-services-did.md))

**Service statistics.** π_S. One block's scorecard for each active service: its share of
the work refined, the preimages provided for it, its accumulation. *Example:* service 42:
2 digests, 1518 gas. ([18.2](./18-statistics/02-what-cores-and-services-did.md))

**Data load.** The bytes a core's newly available reports ask validators to keep: each
bundle, plus its segments and their proof pages. *Example:* 12345 + 4 × 4104 = 28761.
([18.2](./18-statistics/02-what-cores-and-services-did.md))

**Popularity.** How many of a block's assurances have a core's bit set. *Example:* 4 of
6 validators assure core 1: popularity 4.
([18.2](./18-statistics/02-what-cores-and-services-did.md))

**Author.** H_I. The validator that made a block, named in its header by index.
*Example:* `author_index: 1`. ([18.1](./18-statistics/01-who-did-what.md))

**Reporters.** 𝐆. Every validator who signed a guarantee in a block, counted once.
*Example:* guarantees signed by 0 and 1, and by 2 and 3: four reporters.
([12.2](./12-guarantees/02-signed-and-counted.md))

## The PVM

**PVM.** The Polkadot Virtual Machine: a small, made-up computer, based on RISC-V, that
runs every service's code exactly the same way on every validator.
([15.3](./15-the-pvm/03-the-machine.md))

**Register.** One of the PVM's 13 little 64-bit boxes for numbers, named r0 to r12.
Instructions work on registers. ([15.3](./15-the-pvm/03-the-machine.md))

**Instruction and opcode.** An instruction is one small step (add, load, jump...); its
opcode is the number that says which. *Example:* opcode 200 is `add_64`.
([15.2](./15-the-pvm/02-instructions.md))

**Memory and page.** The PVM's memory is 2^32 bytes, handed out in pages of 4,096. Touch a
page you don't have, and the machine stops. ([15.4](./15-the-pvm/04-memory.md))

**Program blob.** A service's code as bytes: the instructions, a bitmask saying where
each starts, and a jump table. ([15.1](./15-the-pvm/01-the-program-blob.md))

**Basic block.** A run of instructions with one way in, its first instruction, and one
way out, a jump or branch (or a stop) at its end. Gas is paid one basic block at a time.
([15.3](./15-the-pvm/03-the-machine.md))

**Halt, panic and out of gas.** The ways a program stops: halt is finishing on purpose,
panic is a crash, out of gas (oog) is running out of budget.
([15.3](./15-the-pvm/03-the-machine.md), [15.11](./15-the-pvm/11-the-gas-meter.md))
