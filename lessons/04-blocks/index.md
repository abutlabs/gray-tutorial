# Part 4 · Blocks

A JAM block is a header plus an *extrinsic*: everything the block brings in from the
outside world. Tickets for the authorship lottery, data services asked for, reports from
the cores, availability promises, disputes. This part encodes all of it, piece by piece,
until your client can read a whole block, checked against the official vectors.

By the end of this part your client reads any JAM block, at either size, and can show you
every byte of it. Checking one is Part 5's job.

**Builds on** the foundations alone, [Parts 0 to 2](../index.md#lessons).

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
