# Part 5 · Hashing and signatures

Your client can read a block. Now it learns to *check* one: that it really follows the
block before it, that its extrinsic is what its header promised, and that the
signatures in it were made by the validators they claim. Cryptography, from libraries
that do it well, put to work on real JAM blocks.

By the end of this part your client checks a block's links (hashes), its extrinsic hash,
and who signed what (Ed25519).

- [5.1 Hashes](./01-hashes.md)
- [5.2 The extrinsic hash](./02-the-extrinsic-hash.md)
- [5.3 Signatures](./03-signatures.md)
