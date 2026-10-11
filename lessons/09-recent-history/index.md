# Part 9 · Recent history

A block carries no memory of its own, so the state keeps one: the last few blocks' hashes,
their state roots, the work they reported, and a running commitment to every
accumulation output, built so other chains can read it. Guarantors lean on this history to
show their work is anchored in a real, recent block. This part builds it.

By the end of this part your client keeps the chain's short-term memory, the last eight
blocks, up to date block by block, with the mountain belt of accumulation outputs.

**Builds on** [Part 4 · Blocks](../04-blocks/index.md), [Part 5 · Hashing and
signatures](../05-hashing-and-signatures/index.md) and [Part 6 · State and
Merklization](../06-state-and-merklization/index.md), and on the foundations every part
uses, [Parts 0 to 2](../index.md#lessons).

**Starting here?** At the repo root, `npm run catch-up -- 8.5` makes your client the one
this part starts from; [How to read it](../index.md#how-to-read-it) says more.

- [9.1 The mountain belt](./01-the-mountain-belt.md)
- [9.2 Recent blocks](./02-recent-blocks.md)

**Test yourself:** [Ch. 7 Recent History](https://abutlabs.github.io/jam-learning/lasair/exam.html?chapter=ch07-recent-history),
self-test cards on JAM learning.
