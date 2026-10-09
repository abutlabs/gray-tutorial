# Part 9 · Recent history

A block carries no memory of its own, so the state keeps one: the last few blocks' hashes,
their state roots, the work they reported, and a running commitment to every
accumulation output, built so other chains can read it. Guarantors lean on this history to
show their work is anchored in a real, recent block. This part builds it.

- [9.1 The mountain belt](./01-the-mountain-belt.md)
