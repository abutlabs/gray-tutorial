# Glossary

Every word this tutorial uses that a newcomer might not know, in plain English first,
with a small example. Where the Gray Paper (the GP, JAM's specification) has a symbol for
it, the symbol comes next, and the link at the end goes to the lesson that builds it.

You don't need to read this page first. Come back whenever a word stops you. The groups go
from the most everyday words to the most JAM-specific ones, after a table of the Gray
Paper's symbols.

## Gray Paper symbols

The Gray Paper names things with letters, mostly Greek. Here is each one this tutorial uses,
how to say it (so you can search for it), what it stands for, and where it first appears.

| Symbol | Say it | What it is | First in |
| --- | --- | --- | --- |
| σ | sigma | the whole state: everything the chain remembers | [0.1](./00-start/01-what-you-will-build.md) |
| Υ | upsilon | the state transition: the state and a block give the next state | [0.1](./00-start/01-what-you-will-build.md) |
| ℰ | script E | encoding a value as bytes; ℰ_l: in exactly l bytes | [2.1](./02-codec/01-fixed-width-integers.md) |
| α | alpha | the authorizer pools | [6.2](./06-state-and-merklization/02-state-keys.md) |
| ϕ | phi (straight) | the authorizer queue | [6.2](./06-state-and-merklization/02-state-keys.md) |
| β | beta | recent blocks | [6.2](./06-state-and-merklization/02-state-keys.md) |
| γ | gamma | Safrole's state: the ticket lottery | [6.2](./06-state-and-merklization/02-state-keys.md) |
| ψ | psi | past judgements, from disputes | [6.2](./06-state-and-merklization/02-state-keys.md) |
| η | eta | entropy | [6.2](./06-state-and-merklization/02-state-keys.md) |
| ι | iota | the next validators | [6.2](./06-state-and-merklization/02-state-keys.md) |
| κ | kappa | the validators | [6.2](./06-state-and-merklization/02-state-keys.md) |
| λ | lambda | the previous validators | [6.2](./06-state-and-merklization/02-state-keys.md) |
| ρ | rho | reports awaiting availability | [6.2](./06-state-and-merklization/02-state-keys.md) |
| τ | tau | the time: the current timeslot | [6.2](./06-state-and-merklization/02-state-keys.md) |
| χ | chi | the privileged services | [6.2](./06-state-and-merklization/02-state-keys.md) |
| π | pi | the statistics | [6.2](./06-state-and-merklization/02-state-keys.md) |
| ω | omega | reports ready to accumulate (the ready queue) | [6.2](./06-state-and-merklization/02-state-keys.md) |
| ξ | xi | recently accumulated work-packages | [6.2](./06-state-and-merklization/02-state-keys.md) |
| θ | theta | the last accumulation outputs | [6.2](./06-state-and-merklization/02-state-keys.md) |
| Φ | capital phi | the filter that keeps offenders out of a validator set | [8.2](./08-safrole/02-rotating-the-validators.md) |
| ζ | zeta | a program's code, followed by zeros forever | [15.2](./15-the-pvm/02-instructions.md) |
| φ | phi (curly) | the PVM's registers: φ₇ is register 7 | [15.3](./15-the-pvm/03-the-machine.md) |
| Ψ | capital psi | running the PVM; Ψ₁ is one step | [15.3](./15-the-pvm/03-the-machine.md) |
| ε | epsilon | how a PVM step ended: carry on, halt, panic, ... | [15.3](./15-the-pvm/03-the-machine.md) |
| μ | mu | the PVM's memory | [15.4](./15-the-pvm/04-memory.md) |
| ν | nu | an instruction's immediate values (ν_X, ν_Y) | [15.4](./15-the-pvm/04-memory.md) |
| Ω | capital omega | the host calls: Ω_G is gas, Ω_Y is fetch, ... | [16.1](./16-host-calls/01-calling-the-host.md) |
| Δ | capital delta | accumulation: Δ₁ one service, Δ* one round, Δ+ every round | [16.7](./16-host-calls/07-a-services-inputs.md) |
| Σ | capital sigma | a sum | [18.2](./18-statistics/02-what-cores-and-services-did.md) |

Two of them are both phi, as in the Gray Paper: the straight ϕ is the authorizer queue, the
curly φ the PVM's registers.

## The big picture

**JAM.** A blockchain protocol that blends ideas from Polkadot and Ethereum: anyone can put
a program (a service) on it, and the work for those programs runs in parallel on many
cores. *Example:* in Part 15 you run a real service's code.
([0.1](./00-start/01-what-you-will-build.md))

**Gray Paper (GP).** JAM's specification: the document that defines every rule, mostly in
maths. It is still being improved, and new versions change rules; this tutorial follows
version 0.8.0. *Example:* "§4" is its section 4.
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
it doesn't. This tutorial uses test-driven development: the test first, then the code.
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

**Test-driven development (TDD).** Writing a test before the code it tests, watching it
fail, then writing the code that makes it pass. *Example:* [lesson 0.4](./00-start/04-the-jam-clock.md)'s `slotAt`. ([0.4](./00-start/04-the-jam-clock.md))

**Debugger.** A tool that pauses a running program so you can read its variables, then
lets it go on. In VS Code, *Run and Debug*, with the configurations in
`.vscode/launch.json`. *Example:* *Tests: all (npm test)*. ([0.4](./00-start/04-the-jam-clock.md))

**Breakpoint.** A line where the debugger pauses the program: click left of the line's
number, and a red dot appears. *Example:* line 12 of `src/time.ts`, where `slotAt`
rounds. ([0.4](./00-start/04-the-jam-clock.md))

**Command-line argument.** A word you type after a program's name, which the program reads
from `process.argv` (`process.argv[2]` is the first). *Example:* the `3` in
`node bin/now.ts 3`. ([0.4](./00-start/04-the-jam-clock.md))

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

**Off-by-one.** A bug that's wrong by exactly one, usually at the edge of a range: `<=`
where `<` was meant, or a count that starts at 1 instead of 0. *Example:* treating 128
as if it fitted in one byte. ([2.2](./02-codec/02-compact-naturals.md))

**Class, method.** A class is a blueprint for objects that keep their own data; its
functions are methods. *Example:* `new Writer()` makes a writer; `w.natural(5n)` calls a
method. ([2.3](./02-codec/03-writer-and-reader.md))

**Private field.** A field of a class whose name starts with `#`: only the class's own
methods can touch it. *Example:* the Reader's `#at`. ([2.3](./02-codec/03-writer-and-reader.md))

**Offset.** A position in a row of bytes, counted from 0. *Example:* in `c7 12 80 80`, the
compact 128 starts at offset 2. ([2.3](./02-codec/03-writer-and-reader.md))

**JSON.** The plain-text format the test vectors are written in. *Example:* `{"slot":
42}`. ([2.4](./02-codec/04-codecs.md))

**Interface.** A TypeScript list of what an object must have, with no code in it.
*Example:* every `Codec` has `encode`, `decode` and `fromJson`. ([2.4](./02-codec/04-codecs.md))

**Generic (`<T>`).** A type with a blank in it, filled in where it's used. *Example:*
`Codec<number>` is a codec for numbers. ([2.4](./02-codec/04-codecs.md))

**Optional field.** A field written with a `?`, which an object may leave out; reading a
missing one gives `undefined`. *Example:* `privileges?: Privileges`.
([17.5](./17-accumulation/05-privileges.md))

**Mapped type.** A TypeScript type built by going through another type's field names one
by one. *Example:* `{ [K in keyof F]: Value<F[K]> }` gives each field its codec's type.
([2.5](./02-codec/05-sequences-and-records.md))

**Union type.** A TypeScript type that is one shape or another; a check like `"ok" in x`
tells which. *Example:* `{ ok: Bytes } | { error: WorkError }`.
([3.2](./03-work-and-reports/02-work-digests.md))

**Tag.** A number in front of an encoded value saying which case follows. *Example:* in a
work result, 0 is "the output follows", 2 is "it panicked".
([3.2](./03-work-and-reports/02-work-digests.md))

**Library (dependency).** Code someone else wrote and published, which your project
installs and uses. *Example:* `@noble/hashes`, from `npm install`.
([5.1](./05-hashing-and-signatures/01-hashes.md))

**Known-answer test.** A test whose expected value comes from a source you trust, not from
your own code. *Example:* the published Blake2b-256 of nothing at all.
([5.1](./05-hashing-and-signatures/01-hashes.md))

**`Map`.** A lookup table from keys to values. *Example:* a service's storage maps each
key to its value. ([16.5](./16-host-calls/05-storage.md))

**Grafana.** The dashboards where your client's runs show up, with Loki (for events) and a
Pushgateway (for numbers) behind them. *Example:* the *Chain* panel, on *2 · Blocks and
state*, lists 100 blocks.
([0.3](./00-start/03-watch-your-client.md))

## Bytes and encoding

**Byte (octet).** Eight bits: a number from 0 to 255. The GP says *octet*, and writes a
row of them as 𝔹. Everything JAM sends or stores is bytes. *Example:* 255, the biggest
byte, is `0xff` in hex. ([1.1](./01-bytes-and-numbers/01-bytes-and-hex.md))

**Hex.** Writing bytes as pairs of the digits 0-9 and a-f, after `0x`. *Example:* `0xff`
is the byte 255; `0x0102` is the bytes 1 and 2. ([1.1](./01-bytes-and-numbers/01-bytes-and-hex.md))

**Little-endian.** Writing a number's bytes smallest first. JAM does this everywhere.
*Example:* 258 in two bytes is `0x0201`. ([2.1](./02-codec/01-fixed-width-integers.md))

**Fixed-width integer.** ℰ_l. A number always written in the same l bytes, however small
it is. *Example:* a u32 always takes four bytes, so 1 is `01 00 00 00`.
([2.1](./02-codec/01-fixed-width-integers.md))

**Encoding, decoding, codec.** Encoding turns a value into bytes; decoding turns the
bytes back. A codec is one object that does both for one kind of value, and reads it from
the test vectors' JSON too. The GP writes encoding as ℰ (Appendix C). *Example:* the
number 5 in one byte encodes as `0x05`.
([2.1](./02-codec/01-fixed-width-integers.md)), codec ([2.4](./02-codec/04-codecs.md))

**Compact natural.** JAM's space-saving way to encode a whole number: small numbers take
one byte, bigger ones more, and the first byte says how many follow. *Example:* 5 is
`0x05`, one byte; 300 takes two. ([2.2](./02-codec/02-compact-naturals.md))

**Leading ones.** The one-bits at the very start of a byte, before its first zero; in a
compact natural, how many more bytes follow. *Example:* `110xxxxx` has two.
([2.2](./02-codec/02-compact-naturals.md))

**Blob.** Any run of bytes of no fixed length. Encoded with its length in front (the GP's
↕). *Example:* the three bytes 1, 2, 3 encode as `0x03010203`.
([2.5](./02-codec/05-sequences-and-records.md))

**Fixed-length sequence.** A list whose length the protocol fixes, so it's written with no
length in front. The GP writes ⟦T⟧ₙ. *Example:* the tickets mark.
([4.5](./04-blocks/05-maybe-and-exactly-n.md))

**Sequence and record.** A sequence is a list of the same kind of thing, a record a fixed
set of named fields, encoded one after another. *Example:* a work-item is a record; the
items of a package are a sequence. ([2.5](./02-codec/05-sequences-and-records.md))

**Codec factory.** A function that takes codecs and builds a new codec from them.
*Example:* `seq(u8)` is a codec for lists of bytes. ([2.5](./02-codec/05-sequences-and-records.md))

**Hex dump.** A file's bytes printed as hex, a few to a line, to read by eye. *Example:*
`node bin/hexdump.ts work_item.bin` prints `04 03 02 01 70 a5 ...`.
([2.6](./02-codec/06-the-first-test-vectors.md))

**Round trip.** Decoding bytes, encoding the result, and getting the very same bytes back:
how a codec proves it agrees with a test vector. *Example:* `work_item.bin` → a work item
→ `work_item.bin`. ([2.6](./02-codec/06-the-first-test-vectors.md))

**Decode trace.** A list of every innermost field a decoder read, each with its field
path and where its bytes were; every byte covered once. Not a block trace. *Example:*
`0..4 service`. ([2.7](./02-codec/07-watch-a-decode.md))

**Field path.** A field's place inside a value, from the outside in, with dots.
*Example:* `import_segments.0.index`. ([2.7](./02-codec/07-watch-a-decode.md))

**Innermost field.** A field with no fields inside it: a number, a hash, a length.
*Example:* `service` is one; `import_segments` isn't. ([2.7](./02-codec/07-watch-a-decode.md))

**Option (discriminator).** A value that may be missing: one byte, 0 for "nothing" or 1 and then the
value. *Example:* a header's epoch mark is only there at an epoch's start.
([4.5](./04-blocks/05-maybe-and-exactly-n.md))

## Time and the chain

**Timeslot (slot).** τ. A six-second tick of JAM's clock, counted from 0 at 12:00 UTC on
1 January 2025, the *JAM Common Era*. At most one block is made per slot. *Example:* 12:00:06
that day was slot 1. ([0.4](./00-start/04-the-jam-clock.md))

**Epoch.** A run of E slots: 600 (one hour) on the real network, 12 on the tiny test
network. Validators and the block-making lottery change at epoch boundaries.
([7.1](./07-time-and-shuffling/01-epochs.md))

**Configuration.** The numbers that make one JAM bigger than another: validators, cores,
epoch length. *Example:* `TINY` has 6 validators and 2 cores.
([4.2](./04-blocks/02-tiny-and-full.md))

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

**Anchor (of an assurance).** The block an assurance was made on top of; it must be the
parent of the block carrying it. *Example:* an assurance anchored two blocks back is
refused. ([11.3](./11-assurances/03-bad-assurances.md))

**Rejected block.** A block that breaks any rule: refused whole, nothing in it counts, and
the state stays as it was. *Example:* one bad signature sinks the block.
([11.3](./11-assurances/03-bad-assurances.md))

**Error name.** The test vectors' name for the rule a rejected block breaks. *Example:*
`bad_signature`. ([11.3](./11-assurances/03-bad-assurances.md))

**Parent.** The block before this one. Each header names its parent by hash, which is
what makes the blocks a chain. ([5.1](./05-hashing-and-signatures/01-hashes.md))

**Hash.** H(x). A 32-byte fingerprint of some data (JAM uses Blake2b-256). Change one bit
of the data and the fingerprint changes completely. *Example:* the hash of no bytes at
all starts `0x0e5751c0`. ([5.1](./05-hashing-and-signatures/01-hashes.md))

**Blake2b.** The hash function JAM uses: fingerprints of any size up to 64 bytes, of which
JAM asks for 32. *Example:* the hash of no bytes at all starts `0e5751c0`.
([5.1](./05-hashing-and-signatures/01-hashes.md))

**Keccak-256.** Ethereum's hash function: 32 bytes, like Blake2b, but different ones. JAM
uses it where other chains must check the result. *Example:* the Keccak-256 of no bytes
at all starts `0xc5d24601`. ([9.1](./09-recent-history/01-the-mountain-belt.md))

**Extrinsic hash.** A header's 32-byte promise of exactly which extrinsic belongs to it: a
hash of the five parts' hashes. *Example:* swap one ticket, and it no longer matches.
([5.2](./05-hashing-and-signatures/02-the-extrinsic-hash.md))

**Merkle commitment.** A hash of hashes, built so that one piece can be proven to be inside
without showing the rest. *Example:* one report, plus the other parts' hashes.
([5.2](./05-hashing-and-signatures/02-the-extrinsic-hash.md))

**Secret key and public key.** A pair: the secret key signs, the public key checks. Only
the holder knows the secret one. *Example:* a validator's 32-byte Ed25519 public key.
([5.3](./05-hashing-and-signatures/03-signatures.md))

**Ed25519.** The signature scheme for JAM's everyday signatures (RFC 8032): 32-byte public
keys, 64-byte signatures. *Example:* every assurance's signature.
([5.3](./05-hashing-and-signatures/03-signatures.md))

**Domain prefix.** A few ASCII bytes put in front of a signed message, so a signature for
one job can't pass for another. *Example:* `jam_available`, `jam_guarantee`.
([5.3](./05-hashing-and-signatures/03-signatures.md))

**Signature.** Proof that the holder of a secret key approved some bytes; anyone with the
matching public key can check it. JAM's everyday kind is Ed25519.
([5.3](./05-hashing-and-signatures/03-signatures.md))

**State.** σ. Everything the chain remembers between blocks: the validators, the
entropy, every service's account, and more, each part a *component* with a Greek letter.
*Example:* τ is the time, η the entropy.
([6.3](./06-state-and-merklization/03-reading-the-state.md))

**Intermediate value.** A value halfway through a block, marked with a dagger. *Example:*
ρ† is the cores after the judgments, ρ‡ after the assurances, ρ′ after the whole block.
([19.1](./19-block-import/01-the-order-of-things.md))

**Dependency graph.** ≺. What each new piece of state is made from (GP §4.2). *Example:*
ρ‡ ≺ (E_A, ρ†). ([19.1](./19-block-import/01-the-order-of-things.md))

**Wave.** This client's name for a group of block-import steps whose ingredients are all
ready; steps in one wave don't need each other. *Example:* wave 1 is τ′, β_H†, η′, κ′, λ′,
ψ′ and ρ†. ([19.1](./19-block-import/01-the-order-of-things.md))

**Trie, leaf and branch.** A trie files entries by the bits of their keys, 0 left, 1
right; a leaf holds one entry, a branch the hashes of its two subtries. *Example:* every
node is 64 bytes. ([6.1](./06-state-and-merklization/01-the-state-trie.md))

**Merklization.** Hashing a whole trie down to one root, so any one entry can later be
proven with a few hashes. The GP writes the root as M. *Example:* a state, down to 32
bytes. ([6.1](./06-state-and-merklization/01-the-state-trie.md))

**Merkle mountain belt, peak and super-peak.** A list of Merkle tree roots, one per power
of two, grown one item at a time like a binary counter. Each root is a *peak* (∅ where
there's no mountain of that size), and the *super-peak*, M_R, is one hash for the whole
belt. JAM keeps one of every block's accumulation outputs, for bridges to other chains.
*Example:* 5 items make a mountain of 4 and a mountain of 1.
([9.1](./09-recent-history/01-the-mountain-belt.md))

**State key and state component.** The state is 16 components, C(1) to C(16), each a Greek
letter, filed under 31-byte keys; services' data have keys of their own. *Example:* C(11)
is τ, the time. ([6.2](./06-state-and-merklization/02-state-keys.md))

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

**Validator key.** The 336 bytes the chain keeps for one validator: a Bandersnatch key
(32), an Ed25519 key (32), a BLS key (144) and metadata (128). *Example:* κ is a list of
them. ([6.3](./06-state-and-merklization/03-reading-the-state.md))

**Bandersnatch key.** A validator's key for the ticket lottery and for sealing blocks.
*Example:* the first 32 bytes of a validator key.
([6.3](./06-state-and-merklization/03-reading-the-state.md))

**BLS key.** A 144-byte key for signatures that can be combined. *Example:* bytes 64 to 207
of a validator key. ([6.3](./06-state-and-merklization/03-reading-the-state.md))

**Validator.** One of the V machines (1,023 on full, 6 on tiny) that run JAM: they make
blocks, check work and vote. ([4.2](./04-blocks/02-tiny-and-full.md))

**Validator sets.** Four lists of validators: κ the active ones, λ last epoch's, γ_P the
next epoch's (pending), and ι the ones queued after that (staging). Each epoch they move
along one. ([8.2](./08-safrole/02-rotating-the-validators.md))

**Entropy.** η. Randomness the chain gathers from every block, so that no one can predict
the future lotteries. ([8.1](./08-safrole/01-stirring-the-entropy.md))

**Safrole.** JAM's way of choosing who makes each block: a lottery run one epoch ahead.
([8.5](./08-safrole/05-one-step-of-safrole.md))

**Ring VRF proof.** Cryptography proving that *some* validator in a set made something,
without saying which. *Example:* every ticket carries a 784-byte one.
([4.1](./04-blocks/01-tickets-and-preimages.md))

**Epoch mark.** At an epoch's first block only: fresh randomness and the keys of the
validators starting their epoch. *Example:* most headers have none.
([4.6](./04-blocks/06-the-header.md))

**Tickets mark.** Once per epoch, when the ticket lottery closes: the winning ticket for
every slot of the next epoch. *Example:* 12 tickets on tiny, 600 on full.
([4.6](./04-blocks/06-the-header.md))

**Offenders mark.** The Ed25519 keys of the validators a block convicts in its disputes.
*Example:* empty in almost every block. ([4.6](./04-blocks/06-the-header.md))

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

**Refinement context.** The chain as a work-package saw it when built: an anchor block (its
hash, slot, state root and belt root), a lookup anchor to read preimages from, and the
packages that must be accumulated first. *Example:* every package and report carries one.
([3.1](./03-work-and-reports/01-a-work-package.md))

**Availability specification.** How to find a package's data again: its hash, its
bundle's length, the erasure root and shard count, and its exported segments' root and
count. *Example:* a report's `package_spec`. ([3.3](./03-work-and-reports/03-a-work-report.md))

**Erasure coding.** Chopping data into one piece (shard) per validator so that any third
of the pieces can rebuild it all. *Example:* 6 shards on tiny, 1,023 on full.
([3.3](./03-work-and-reports/03-a-work-report.md))

**Work-report.** A core's statement about one package: its digests, and enough detail to
check and fetch everything. ([3.3](./03-work-and-reports/03-a-work-report.md))

**Authorizer.** Code that decides whether a package may use a core at all. Each core keeps
a small pool of authorizers. ([13.1](./13-authorization/01-the-authorizer-pools.md))

**Rotation.** R slots (4 on tiny, 10 on full) after which the guarantors move on to the
next core. *Example:* on tiny, slots 12 to 15 are one rotation.
([12.1](./12-guarantees/01-who-guarantees-what.md))

**Active core.** One of the first |κ′|/3 cores, the ones the current validators can staff
three apiece. *Example:* 6 validators keep 2 cores active.
([12.1](./12-guarantees/01-who-guarantees-what.md))

**Authorizer pool.** α[c]. The authorizers core c accepts right now; a report's authorizer
must be in its core's pool. *Example:* refused as `core_unauthorized` if it isn't.
([12.4](./12-guarantees/04-bad-guarantees.md))

**Credential.** One guarantor's signature on a guarantee: its validator index and its
Ed25519 signature. *Example:* index 3, then 64 bytes. ([4.3](./04-blocks/03-guarantees.md))

**Guarantee and guarantor.** Two or three validators (the guarantors) sign a work-report
to vouch that it's right; that bundle is a guarantee, and it puts the report onto its
core. ([12.1](./12-guarantees/01-who-guarantees-what.md))

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

**Judges.** K. The validators whose votes a verdict carries: κ if the verdict's age is this
epoch, λ if it's the last. *Example:* on tiny, 6 judges, so a verdict needs 5 votes.
([10.1](./10-disputes/01-votes-and-verdicts.md))

**Verdict age.** The epoch a verdict's votes were cast in; only this epoch or the last will
do. *Example:* in epoch 3, ages 3 and 2 are fine, 1 isn't.
([10.1](./10-disputes/01-votes-and-verdicts.md))

**Vote split.** How many of a verdict's votes say "valid": all (good), none (bad) or a
third of the judges (wonky); any other split rejects the block. *Example:* on tiny, 5, 0
or 2. ([10.1](./10-disputes/01-votes-and-verdicts.md))

**Evidence.** What makes an accusation stick: the accused validator's own signature. A
culprit carries its signed guarantee, a fault its signed vote.
([10.5](./10-disputes/05-bad-culprits-and-faults.md))

**If and only if (⇔).** Two statements true together or false together. *Example:* "the
report is bad ⇔ the fault voted valid". ([10.5](./10-disputes/05-bad-culprits-and-faults.md))

**Culprit, fault and offender.** A culprit guaranteed a report that turned out bad; a
fault voted against the verdict. Both become *offenders* (their keys go into ψ_O), and
lose their part in the validator sets. ([10.2](./10-disputes/02-culprits-and-faults.md))

## Services and their accounts

**Service account.** A service's record in the state: its code hash, balance, gas
minimums, and counts of what it keeps. ([14.2](./14-services/02-the-service-account.md))

**Storage.** A service's own key-value store in the state. *Example:* a service writes the
key "last" with some bytes, and reads it back next time. ([16.5](./16-host-calls/05-storage.md))

**Eject, ejector.** Removing a finished service for good; its ejector is the service it
named to do it, by setting its code hash to the ejector's id in 32 bytes. *Example:* a code
hash of 32 zero bytes names service 0. ([17.7](./17-accumulation/07-ejecting-a-service.md))

**Expunge period.** D. How many slots a forgotten preimage must wait before it may go: 32
on tiny, 19,200 on full. *Example:* forgotten at slot 10, gone from slot 43 on tiny.
([17.7](./17-accumulation/07-ejecting-a-service.md))

**Public id.** A service id of 2^16 (S) or more: anyone may create a service with one;
ids below S are the registrar's. *Example:* 70,000 is public, 5 isn't.
([17.8](./17-accumulation/08-creating-a-service.md))

**Next free id.** i. The id a run's next `new` hands out: from the creating service's id,
η′₀ and the slot, then 42 further on after each use. *Example:* 70,000, then 70,042.
([17.8](./17-accumulation/08-creating-a-service.md))

**Gratis storage.** f. A discount on a service's deposit: storage it keeps without paying
for it. Only the manager may give it. *Example:* gratis from anyone else: `HUH`.
([17.8](./17-accumulation/08-creating-a-service.md))

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

**Report anchor.** The recent block a report was built against: its hash, slot, state root
and belt root, in the report's context; it must match a block the chain remembers.
*Example:* refused as `anchor_not_recent` if it doesn't. ([12.5](./12-guarantees/05-bad-reports.md))

**Segment-root lookup.** A report's list of the packages whose exported segments it
imported, each with those segments' root. *Example:* "package A, segments root R".
([12.5](./12-guarantees/05-bad-reports.md))

**Pipeline.** Every package the chain is already dealing with: recently accumulated,
waiting, or pending on a core; none may be reported again. *Example:* the vectors'
`known_packages`. ([12.5](./12-guarantees/05-bad-reports.md))

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

**Δ+ (accumulating in rounds).** The loop over a block's rounds: one round, then another
for the transfers it sent, until a round sends none. *Example:* a block with one transfer
takes two rounds. ([17.4](./17-accumulation/04-rounds.md))

**Delivery.** A transfer arriving, in the round after it was sent: its money goes into the
receiver's balance before its code runs, and the transfer becomes one of its inputs.
*Example:* service 1's balance grows by 100, then it reads "gift".
([17.4](./17-accumulation/04-rounds.md))

**Transfer input.** An accumulation input that starts with a 1, then one transfer; an
operand starts with a 0. *Example:* service 1's only input in round 2.
([17.4](./17-accumulation/04-rounds.md))

**Privilege.** χ. A right only one service holds at a time: the manager (χ_M, may change
the others), an assigner for each core (χ_A), the delegator (χ_V, picks the next
validators), the registrar (χ_R, creates services with small ids), and the
always-accumulate services (χ_Z). *Example:* service 0 is core 0's assigner.
([17.5](./17-accumulation/05-privileges.md))

**Assigner.** χ_A[c]. The service that may set core c's authorizer queue and hand that
right on. *Example:* service 0 hands core 0 to service 1 with `assign`.
([17.5](./17-accumulation/05-privileges.md))

**Authorizer queue.** ϕ[c]. For each core, 80 authorizer hashes; one joins the core's pool
every slot. *Example:* the 80 hashes `assign` hands over with a core.
([13.1](./13-authorization/01-the-authorizer-pools.md))

**Holder.** The service holding a privilege when a round starts. *Example:* service 1
holds core 0's assignment. ([17.6](./17-accumulation/06-who-wins.md))

**Merge (of privileges).** Turning every run's version of the privileges into one after a
round. *Example:* two runs left different assigners for core 0; the merge picks one.
([17.6](./17-accumulation/06-who-wins.md))

**R (replace if changed).** R(o, a, b): the manager's change a wins; if the manager left
it as o, the holder's own change b. *Example:* R(1, 5, 7) = 5, R(1, 1, 7) = 7.
([17.6](./17-accumulation/06-who-wins.md))

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
