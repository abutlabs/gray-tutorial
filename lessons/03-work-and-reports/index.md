# Part 3 · Work and reports

JAM's whole reason to exist is *work*: services send jobs to the chain's cores, the cores
compute, and the results come back as reports that every validator can check. This part
encodes the paperwork of that journey, from the parcel that goes in to the report that
comes out, each piece checked against the official vectors.

By the end of this part your client encodes and decodes a work-package, its digests and
the work-report that binds them, byte for byte with the official vectors at both sizes.

**Builds on** the foundations alone, [Parts 0 to 2](../index.md#lessons).

## At a glance

The whole part on one map. Boxes are what your client holds, and rounded cards are the
steps between them; a dashed card happens outside your client. Tap any card, or walk
through them in order with *next*.

<PartFlow :part="3" />

**Starting here?** At the repo root, `npm run catch-up -- 2.7` makes your client the one
this part starts from; [How to read it](../index.md#how-to-read-it) says more.

- [3.1 A work-package](./01-a-work-package.md)
- [3.2 Work digests](./02-work-digests.md)
- [3.3 A work-report](./03-a-work-report.md)

**Test yourself:** [F3 · One order's journey: the work-package](https://abutlabs.github.io/jam-learning/lasair/exam.html?chapter=f03-the-work-package),
self-test cards on JAM learning.
