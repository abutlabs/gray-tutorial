# Part 4 · Blocks

A JAM block is a header plus an *extrinsic*: everything the block brings in from the
outside world. This part encodes all of it, piece by piece, until your client can read a
whole block, checked against the official vectors.

By the end of this part your client reads any JAM block, at either size, and can show you
every byte of it. Checking one is [Part 5](../05-hashing-and-signatures/index.md)'s job.

**Builds on** [Part 3 · Work and reports](../03-work-and-reports/index.md), and on the
foundations every part uses, [Parts 0 to 2](../index.md#lessons).

## How much a block carries

Every block has all five bags, always in the same order, but each holds only what that
block needs, and often nothing:

| Bag | A block holds | In the traces |
| --- | --- | --- |
| tickets | 0 to 3 on tiny, 0 to 16 on full; none once the lottery closes, at slot 10 of 12 (500 of 600) | 0 to 2 |
| preimages | any number, each one data a service asked for | 0 to 10 |
| guarantees | 0 to 2 on tiny, 0 to 341 on full: one per core | 0 to 2 |
| assurances | 0 to 6 on tiny, 0 to 1,023 on full: one per validator | 0 to 6 |
| disputes | 0 to 16 each of verdicts, culprits and faults (§10) | none |

The traces are 1,000 real tiny blocks. All 100 of the fallback trace's carry nothing: an
empty extrinsic is 7 bytes of `00`, a count of 0 for each of its seven lists (disputes
holds three).

## At a glance

Here is a whole block, the tiny test vector's: a header, the cover page, and the
extrinsic, five bags of things from outside the chain. It's a codec vector, so it fills
every bag to show them all; a real block rarely does. Tap any part, down to its bytes.

<BlockParcel />

And the order this part builds those pieces in, lesson by lesson: the bags, then the
header, then the block, then reading any block at either size. Boxes are what your
client holds, rounded cards the steps between them.

<PartFlow :part="4" />

**Starting here?** At the repo root, `npm run catch-up -- 3.3` makes your client the one
this part starts from; [How to read it](../index.md#how-to-read-it) says more.

- [4.1 Tickets and preimages](./01-tickets-and-preimages.md)
- [4.2 Tiny and full](./02-tiny-and-full.md)
- [4.3 Guarantees](./03-guarantees.md)
- [4.4 Disputes](./04-disputes.md)
- [4.5 Maybe, and exactly n](./05-maybe-and-exactly-n.md)
- [4.6 The header](./06-the-header.md)
- [4.7 The block](./07-the-block.md)

**Test yourself:** [Ch. 5 The Header](https://abutlabs.github.io/jam-learning/lasair/exam.html?chapter=ch05-header),
self-test cards on JAM learning.
