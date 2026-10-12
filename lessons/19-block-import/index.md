# Part 19 · Block import

Everything comes together. The state before a block, plus the block, gives the state
after it: the Gray Paper calls that whole step Υ (upsilon), and this part runs every piece
of it in the Gray Paper's order. It starts with the plan: which piece is made from which,
and an order to run them in.

By the end of this part your client imports real blocks: the whole state read and written,
every step of Υ in order, and all eight official block-import traces, 800 blocks, chained
from genesis with every state root right and the bad blocks refused.

**Builds on** [Part 3 · Work and reports](../03-work-and-reports/index.md), [Part 4 ·
Blocks](../04-blocks/index.md), [Part 5 · Hashing and
signatures](../05-hashing-and-signatures/index.md), [Part 6 · State and
Merklization](../06-state-and-merklization/index.md), [Part 8 ·
Safrole](../08-safrole/index.md), [Part 9 · Recent
history](../09-recent-history/index.md), [Part 10 · Disputes](../10-disputes/index.md),
[Part 11 · Assurances](../11-assurances/index.md), [Part 12 ·
Guarantees](../12-guarantees/index.md), [Part 13 ·
Authorization](../13-authorization/index.md), [Part 14 · Services and
preimages](../14-services/index.md), [Part 16 · Host calls](../16-host-calls/index.md),
[Part 17 · Accumulation](../17-accumulation/index.md) and [Part 18 ·
Statistics](../18-statistics/index.md), and on the foundations every part uses, [Parts 0
to 2](../index.md#lessons).

**Starting here?** At the repo root, `npm run catch-up -- 18.2` makes your client the one
this part starts from; [How to read it](../index.md#how-to-read-it) says more.

- [19.1 The order of things](./01-the-order-of-things.md)
- [19.2 The whole state](./02-the-whole-state.md)
- [19.3 Accounts from the state](./03-accounts-from-the-state.md)
- [19.4 Importing a block](./04-importing-a-block.md)
- [19.5 Work on the chain](./05-work-on-the-chain.md)
- [19.6 Blocks to refuse](./06-blocks-to-refuse.md)

**Test yourself:** [Ch. 4 Overview](https://abutlabs.github.io/jam-learning/lasair/exam.html?chapter=ch04-overview),
self-test cards on JAM learning.
