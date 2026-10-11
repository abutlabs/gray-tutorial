# Part 6 · State and Merklization

Blocks change the state, so before your client can change anything it has to know what
the state *is*: every validator's keys, every service, every byte of storage, all of it
committed to by one 32-byte root in every header. This part computes that root, then
learns to read the state it stands for.

By the end of this part your client computes the state's root and reads any component
of the state by its key, with the codecs it already has.

- [6.1 The state trie](./01-the-state-trie.md)
- [6.2 State keys](./02-state-keys.md)
- [6.3 Reading the state](./03-reading-the-state.md)

**Test yourself:** [E · Serialization and Merklization (Appendices C and D)](https://abutlabs.github.io/jam-learning/lasair/exam.html?chapter=e-codec-merklization),
self-test cards on JAM learning.
