# Part 11 · Assurances

A report on a core is a promise that some work is done. Before JAM acts on it, the data
behind it has to be safely spread among the validators. Every block, validators report
which cores' data they hold. This part counts those assurances, makes reports
available, clears out the ones that waited too long, and refuses assurances that break
the rules.

By the end of this part your client counts assurances, makes reports available, clears
the ones that waited too long, and handles every assurances vector, tiny and full.

**Builds on** [Part 3 · Work and reports](../03-work-and-reports/index.md), [Part 4 ·
Blocks](../04-blocks/index.md), [Part 5 · Hashing and
signatures](../05-hashing-and-signatures/index.md) and [Part 10 ·
Disputes](../10-disputes/index.md), and on the foundations every part uses, [Parts 0 to
2](../index.md#lessons).

## At a glance

The whole part on one map. Boxes are what your client holds, and rounded cards are the
steps between them; a dashed card happens outside your client. Tap any card, or walk
through them in order with *next*.

<PartFlow :part="11" />

**Starting here?** At the repo root, `npm run catch-up -- 10.5` makes your client the one
this part starts from; [How to read it](../index.md#how-to-read-it) says more.

- [11.1 Available](./01-available.md)
- [11.2 Timeouts](./02-timeouts.md)
- [11.3 Bad assurances](./03-bad-assurances.md)

**Test yourself:** [Ch. 11 Reporting and Assurance](https://abutlabs.github.io/jam-learning/lasair/exam.html?chapter=ch11-reporting-assurance),
self-test cards on JAM learning.
