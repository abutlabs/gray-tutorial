# Part 7 · Time and shuffling

JAM's clock has two hands: the slot, every six seconds, and the epoch, every hour. This
part teaches your client to read both, and then to shuffle: JAM deals validators out to
cores with a shuffle everyone can repeat, from randomness nobody could steer.

By the end of this part your client reads slots and epochs, and shuffles a list from a
hash exactly the way every other JAM client does.

**Builds on** [Part 4 · Blocks](../04-blocks/index.md), [Part 5 · Hashing and
signatures](../05-hashing-and-signatures/index.md) and [Part 6 · State and
Merklization](../06-state-and-merklization/index.md), and on the foundations every part
uses, [Parts 0 to 2](../index.md#lessons).

## At a glance

The whole part on one map. Boxes are what your client holds, and rounded cards are the
steps between them; a dashed card happens outside your client. Tap any card, or walk
through them in order with *next*.

<PartFlow :part="7" />

**Starting here?** At the repo root, `npm run catch-up -- 6.3` makes your client the one
this part starts from; [How to read it](../index.md#how-to-read-it) says more.

- [7.1 Epochs](./01-epochs.md)
- [7.2 The shuffle](./02-the-shuffle.md)
