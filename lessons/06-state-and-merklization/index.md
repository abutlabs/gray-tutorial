# Part 6 · State and Merklization

Blocks change the state, so before your client can change anything it has to know what
the state *is*: every validator's keys, every service, every byte of storage, all of it
committed to by one 32-byte root in every header. This part computes that root, then
learns to read the state it stands for.

- [6.1 The state trie](./01-the-state-trie.md)
- [6.2 State keys](./02-state-keys.md)
- [6.3 Reading the state](./03-reading-the-state.md)
