# Part 16 · Host calls

A service is a program in a sealed box. It can compute all it likes, but it can't see the
chain: everything it learns, and everything it changes, goes through the host. This part
builds the host's side of the conversation: first the loop that answers, then the host
calls an accumulating service needs, a few at a time, until a real accumulation matches
the test vectors down to the last unit of gas.

By the end of this part your client answers the host calls of a service accumulating,
and thirteen official accumulate vectors pass.

**Builds on** [Part 4 · Blocks](../04-blocks/index.md), [Part 5 · Hashing and
signatures](../05-hashing-and-signatures/index.md), [Part 14 · Services and
preimages](../14-services/index.md) and [Part 15 · The PVM](../15-the-pvm/index.md), and
on the foundations every part uses, [Parts 0 to 2](../index.md#lessons).

**Starting here?** At the repo root, `npm run catch-up -- 15.11` makes your client the one
this part starts from; [How to read it](../index.md#how-to-read-it) says more.

- [16.1 Calling the host](./01-calling-the-host.md)
- [16.2 Fetch](./02-fetch.md)
- [16.3 Growing the heap](./03-growing-the-heap.md)
- [16.4 Info](./04-info.md)
- [16.5 Storage](./05-storage.md)
- [16.6 Checkpoints](./06-checkpoints.md)
- [16.7 A service's inputs](./07-a-services-inputs.md)
- [16.8 Lookup](./08-lookup.md)
- [16.9 Asking for preimages](./09-asking-for-preimages.md)

**Test yourself:** [E · PVM invocations and host calls (Appendix B)](https://abutlabs.github.io/jam-learning/lasair/exam.html?chapter=e-invocations),
self-test cards on JAM learning.
