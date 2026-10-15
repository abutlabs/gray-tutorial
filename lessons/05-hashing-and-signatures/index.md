# Part 5 · Hashing and signatures

Your client can read a block. Now it learns to *check* one: that it really follows the
block before it, that its extrinsic is what its header promised, and that the
signatures in it were made by the validators they claim. Cryptography, from libraries
that do it well, put to work on real JAM blocks.

By the end of this part your client checks a block's links (hashes), its extrinsic hash,
and who signed what (Ed25519).

**Builds on** [Part 4 · Blocks](../04-blocks/index.md), and on the foundations every part
uses, [Parts 0 to 2](../index.md#lessons).

## At a glance

The whole part on one map. Boxes are what your client holds, and rounded cards are the
steps between them; a dashed card happens outside your client. Tap any card, or walk
through them in order with *next*.

<PartFlow :part="5" />

**Starting here?** At the repo root, `npm run catch-up -- 4.7` makes your client the one
this part starts from; [How to read it](../index.md#how-to-read-it) says more.

- [5.1 Hashes](./01-hashes.md)
- [5.2 The extrinsic hash](./02-the-extrinsic-hash.md)
- [5.3 Signatures](./03-signatures.md)
