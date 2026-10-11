# Part 11 · Assurances

A report on a core is a promise that some work is done. Before JAM acts on it, the data
behind it has to be safely spread among the validators. Every block, validators report
which cores' data they hold. This part counts those assurances, makes reports
available, clears out the ones that waited too long, and refuses assurances that break
the rules.

By the end of this part your client counts assurances, makes reports available, clears
the ones that waited too long, and handles every assurances vector, tiny and full.

- [11.1 Available](./01-available.md)
- [11.2 Timeouts](./02-timeouts.md)
- [11.3 Bad assurances](./03-bad-assurances.md)

**Test yourself:** [Ch. 11 Reporting and Assurance](https://abutlabs.github.io/jam-learning/lasair/exam.html?chapter=ch11-reporting-assurance),
self-test cards on JAM learning.
