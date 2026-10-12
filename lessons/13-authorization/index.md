# Part 13 · Authorization

Not every work-package may use a core: each must be authorized by one of the
authorizers the core currently accepts. This part keeps each core's pool of authorizers
moving, one in and one out, block by block.

By the end of this part your client keeps every core's pool of authorizers moving,
checked on the vectors and on 99 real blocks.

**Builds on** [Part 4 · Blocks](../04-blocks/index.md), and on the foundations every part
uses, [Parts 0 to 2](../index.md#lessons).

**Starting here?** At the repo root, `npm run catch-up -- 12.5` makes your client the one
this part starts from; [How to read it](../index.md#how-to-read-it) says more.

- [13.1 The authorizer pools](./01-the-authorizer-pools.md)

**Test yourself:** [Ch. 8 Authorization](https://abutlabs.github.io/jam-learning/lasair/exam.html?chapter=ch08-authorization),
self-test cards on JAM learning.
