# Part 19 · Block import

Everything comes together. The state before a block, plus the block, gives the state
after it: the Gray Paper calls that whole step Υ (upsilon), and this part runs every piece
of it in the Gray Paper's order. It starts with the plan: which piece is made from which,
and an order to run them in.

So far this part has the plan: every step of a block import, what it's made from, the
order to run them in, and where you built each one. Running real blocks through it is
still to be written.

**Builds on** only [Parts 0 to 2](../index.md#lessons) so far, in its code: the plan names
the steps, and imports none of them yet.

**Starting here?** At the repo root, `npm run catch-up -- 18.2` makes your client the one
this part starts from; [How to read it](../index.md#how-to-read-it) says more.

- [19.1 The order of things](./01-the-order-of-things.md)

**Test yourself:** [Ch. 4 Overview](https://abutlabs.github.io/jam-learning/lasair/exam.html?chapter=ch04-overview),
self-test cards on JAM learning.
