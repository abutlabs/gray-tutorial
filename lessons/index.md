# Gray Tutorial

Build a JAM client in TypeScript, one Gray Paper rule at a time.

Each lesson explains a piece of the Gray Paper, gives you the code for it in small
snippets, and has you run it. You assemble the snippets into your own client in
`client/`, run the tests, and watch it grow, from an empty folder to a program that
imports JAM blocks and agrees byte for byte with the official test vectors. From the
first lesson on, it reports every run to Grafana, so you can watch what it does.

Start with [0.1 What you will build](./00-start/01-what-you-will-build.md).

## Lessons

**[Part 0 · Start](./00-start/index.md)**

- [0.1 What you will build](./00-start/01-what-you-will-build.md)
- [0.2 Set up the project](./00-start/02-set-up-the-project.md)
- [0.3 Watch your client](./00-start/03-watch-your-client.md)
- [0.4 The JAM clock](./00-start/04-the-jam-clock.md)

**[Part 1 · Bytes and numbers](./01-bytes-and-numbers/index.md)**

- [1.1 Bytes and hex](./01-bytes-and-numbers/01-bytes-and-hex.md)
- [1.2 Numbers](./01-bytes-and-numbers/02-numbers.md)

**[Part 2 · The codec](./02-codec/index.md)**

- [2.1 Fixed-width integers](./02-codec/01-fixed-width-integers.md)
- [2.2 Compact naturals](./02-codec/02-compact-naturals.md)
- [2.3 Writer and Reader](./02-codec/03-writer-and-reader.md)
- [2.4 Codecs](./02-codec/04-codecs.md)
- [2.5 Sequences and records](./02-codec/05-sequences-and-records.md)
- [2.6 The first test vectors](./02-codec/06-the-first-test-vectors.md)
- [2.7 Watch a decode](./02-codec/07-watch-a-decode.md)

**[Part 3 · Work and reports](./03-work-and-reports/index.md)**

- [3.1 A work-package](./03-work-and-reports/01-a-work-package.md)
- [3.2 Work digests](./03-work-and-reports/02-work-digests.md)
- [3.3 A work-report](./03-work-and-reports/03-a-work-report.md)

**[Part 4 · Blocks](./04-blocks/index.md)**

- [4.1 Tickets and preimages](./04-blocks/01-tickets-and-preimages.md)
- [4.2 Tiny and full](./04-blocks/02-tiny-and-full.md)
- [4.3 Guarantees](./04-blocks/03-guarantees.md)
- [4.4 Disputes](./04-blocks/04-disputes.md)
- [4.5 Maybe, and exactly n](./04-blocks/05-maybe-and-exactly-n.md)
- [4.6 The header](./04-blocks/06-the-header.md)
- [4.7 The block](./04-blocks/07-the-block.md)

**[Part 5 · Hashing and signatures](./05-hashing-and-signatures/index.md)**

- [5.1 Hashes](./05-hashing-and-signatures/01-hashes.md)
- [5.2 The extrinsic hash](./05-hashing-and-signatures/02-the-extrinsic-hash.md)
- [5.3 Signatures](./05-hashing-and-signatures/03-signatures.md)

**[Part 6 · State and Merklization](./06-state-and-merklization/index.md)**

- [6.1 The state trie](./06-state-and-merklization/01-the-state-trie.md)
- [6.2 State keys](./06-state-and-merklization/02-state-keys.md)
- [6.3 Reading the state](./06-state-and-merklization/03-reading-the-state.md)

**[Part 7 · Time and shuffling](./07-time-and-shuffling/index.md)**

- [7.1 Epochs](./07-time-and-shuffling/01-epochs.md)
- [7.2 The shuffle](./07-time-and-shuffling/02-the-shuffle.md)

**[Part 8 · Safrole](./08-safrole/index.md)**

- [8.1 Stirring the entropy](./08-safrole/01-stirring-the-entropy.md)
- [8.2 Rotating the validators](./08-safrole/02-rotating-the-validators.md)
- [8.3 The fallback sealers](./08-safrole/03-the-fallback-sealers.md)
- [8.4 The lottery's winners](./08-safrole/04-the-lotterys-winners.md)
- [8.5 One step of Safrole](./08-safrole/05-one-step-of-safrole.md)

**[Part 9 · Recent history](./09-recent-history/index.md)**

- [9.1 The mountain belt](./09-recent-history/01-the-mountain-belt.md)
- [9.2 Recent blocks](./09-recent-history/02-recent-blocks.md)

**[Part 10 · Disputes](./10-disputes/index.md)**

- [10.1 Votes and verdicts](./10-disputes/01-votes-and-verdicts.md)
- [10.2 Culprits and faults](./10-disputes/02-culprits-and-faults.md)
- [10.3 Clearing the cores](./10-disputes/03-clearing-the-cores.md)

**[Part 11 · Assurances](./11-assurances/index.md)**

- [11.1 Available](./11-assurances/01-available.md)
- [11.2 Timeouts](./11-assurances/02-timeouts.md)

**[Part 12 · Guarantees](./12-guarantees/index.md)**

- [12.1 Who guarantees what](./12-guarantees/01-who-guarantees-what.md)
- [12.2 Signed and counted](./12-guarantees/02-signed-and-counted.md)
- [12.3 Onto the cores](./12-guarantees/03-onto-the-cores.md)

**[Part 13 · Authorization](./13-authorization/index.md)**

- [13.1 The authorizer pools](./13-authorization/01-the-authorizer-pools.md)

**[Part 14 · Services and preimages](./14-services/index.md)**

- [14.1 Providing preimages](./14-services/01-providing-preimages.md)
- [14.2 The service account](./14-services/02-the-service-account.md)

**[Part 15 · The PVM](./15-the-pvm/index.md)**

- [15.1 The program blob](./15-the-pvm/01-the-program-blob.md)
- [15.2 Instructions](./15-the-pvm/02-instructions.md)
- [15.3 The machine](./15-the-pvm/03-the-machine.md)
- [15.4 Memory](./15-the-pvm/04-memory.md)
- [15.5 Arithmetic](./15-the-pvm/05-arithmetic.md)
- [15.6 Branches and calls](./15-the-pvm/06-branches-and-calls.md)
- [15.7 Bits and bytes](./15-the-pvm/07-bits-and-bytes.md)
- [15.8 A real program](./15-the-pvm/08-a-real-program.md)
- [15.9 What instructions cost](./15-the-pvm/09-what-instructions-cost.md)
- [15.10 The pipeline](./15-the-pvm/10-the-pipeline.md)
- [15.11 The gas meter](./15-the-pvm/11-the-gas-meter.md)

## Still to be written

The road from here to a full block importer, part by part. The parts are written in
this order, and each one is checked end to end before it is published here.

| Part | You build | Gray Paper |
| --- | --- | --- |
| 8 · Safrole (rest) | Bandersnatch: entering tickets, the ring root, seals | §6, App. G |
| 16 · Host calls | the accumulate invocation and its host calls | App. B |
| 17 · Accumulation | the ready queue, privileges, transfers | §12 |
| 18 · Statistics | validator, core and service activity | §13 |
| 19 · Block import | Υ: every piece in order, the block-import traces | §4, §5 |
| 20 · Facing the fuzzer | the conformance fuzzer's protocol | |
