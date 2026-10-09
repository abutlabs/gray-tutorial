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

## Still to be written

The road from here to a full block importer, part by part. The parts are written in
this order, and each one is checked end to end before it is published here.

| Part | You build | Gray Paper |
| --- | --- | --- |
| 5 · Hashing and signatures (rest) | Ed25519 signatures | §3, §11 |
| 6 · State and Merklization | σ, state keys, the trie, the state root | §4, App. D |
| 7 · Time and shuffling | epochs, entropy, the Fisher-Yates shuffle | §4, App. E |
| 8 · Safrole | Bandersnatch, tickets, sealing keys | §6, App. F |
| 9 · Recent history | recent blocks, the accumulation-output belt | §7 |
| 10 · Disputes | judgments, verdicts, culprits, faults | §10 |
| 11 · Assurances | availability of work-reports | §11 |
| 12 · Guarantees | reports on cores, guarantor assignment | §11 |
| 13 · Authorization | authorizer pools and queues | §8 |
| 14 · Services and preimages | accounts, storage, preimage requests | §9, §12 |
| 15 · The PVM | decoding programs, every instruction, gas | App. A |
| 16 · Host calls | the accumulate invocation and its host calls | App. B |
| 17 · Accumulation | the ready queue, privileges, transfers | §12 |
| 18 · Statistics | validator, core and service activity | §13 |
| 19 · Block import | Υ: every piece in order, the block-import traces | §4, §5 |
| 20 · Facing the fuzzer | the conformance fuzzer's protocol | |
