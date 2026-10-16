# Part 12 · Guarantees

A work-report gets onto a core only with guarantors behind it: validators assigned to
that core who ran the work and signed the result. This part deals out the guarantor
assignments, checks the guarantees' signatures, and puts new reports on free cores.

By the end of this part your client assigns guarantors, checks guarantees and reports,
and accepts or refuses every reports vector exactly as it should.

**Builds on** [Part 3 · Work and reports](../03-work-and-reports/index.md), [Part 4 ·
Blocks](../04-blocks/index.md), [Part 5 · Hashing and
signatures](../05-hashing-and-signatures/index.md), [Part 6 · State and
Merklization](../06-state-and-merklization/index.md), [Part 7 · Time and
shuffling](../07-time-and-shuffling/index.md), [Part 8 · Safrole](../08-safrole/index.md),
[Part 9 · Recent history](../09-recent-history/index.md) and [Part 10 ·
Disputes](../10-disputes/index.md), and on the foundations every part uses, [Parts 0 to
2](../index.md#lessons).

## At a glance

The whole part on one map. Boxes are what your client holds, and rounded cards are the
steps between them; a dashed card happens outside your client. The bands say where each
step runs: the chain deals the guarantors, the guarantors work in-core, and the chain
checks what they signed. Tap any card, or walk through them in order with *next*.

<PartFlow :part="12" />

**Starting here?** At the repo root, `npm run catch-up -- 11.3` makes your client the one
this part starts from; [How to read it](../index.md#how-to-read-it) says more.

- [12.1 Who guarantees what](./01-who-guarantees-what.md)
- [12.2 Signed and counted](./02-signed-and-counted.md)
- [12.3 Onto the cores](./03-onto-the-cores.md)
- [12.4 Bad guarantees](./04-bad-guarantees.md)
- [12.5 Bad reports](./05-bad-reports.md)

**Test yourself:** [Ch. 11 Reporting and Assurance](https://abutlabs.github.io/jam-learning/lasair/exam.html?chapter=ch11-reporting-assurance),
self-test cards on JAM learning.
