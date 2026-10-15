# Part 14 · Services and preimages

Services are JAM's programs: each has an account holding its code, its balance and its
storage. This part opens those accounts up, starting with how a service gets data it
asked for: preimages.

By the end of this part your client hands services the data they asked for, and reads
any service's account, checking that its footprint and balance add up.

**Builds on** [Part 4 · Blocks](../04-blocks/index.md), [Part 5 · Hashing and
signatures](../05-hashing-and-signatures/index.md) and [Part 6 · State and
Merklization](../06-state-and-merklization/index.md), and on the foundations every part
uses, [Parts 0 to 2](../index.md#lessons).

## At a glance

The whole part on one map. Boxes are what your client holds, and rounded cards are the
steps between them; a dashed card happens outside your client. Tap any card, or walk
through them in order with *next*.

<PartFlow :part="14" />

**Starting here?** At the repo root, `npm run catch-up -- 13.1` makes your client the one
this part starts from; [How to read it](../index.md#how-to-read-it) says more.

- [14.1 Providing preimages](./01-providing-preimages.md)
- [14.2 The service account](./02-the-service-account.md)

**Test yourself:** [Ch. 9 Service Accounts](https://abutlabs.github.io/jam-learning/lasair/exam.html?chapter=ch09-accounts),
self-test cards on JAM learning.
