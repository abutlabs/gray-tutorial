# Part 9 · Recent history

A block carries no memory of its own, so the state keeps one: the last few blocks' hashes,
their state roots, the work they reported, and a running commitment to every
accumulation output, built so other chains can read it. Guarantors lean on this history to
show their work is anchored in a real, recent block. This part builds it.

By the end of this part your client keeps the chain's short-term memory, the last eight
blocks, up to date block by block, with the mountain belt of accumulation outputs.

- [9.1 The mountain belt](./01-the-mountain-belt.md)
- [9.2 Recent blocks](./02-recent-blocks.md)

**Test yourself:** [Ch. 7 Recent History](https://abutlabs.github.io/jam-learning/lasair/exam.html?chapter=ch07-recent-history),
self-test cards on JAM learning.
