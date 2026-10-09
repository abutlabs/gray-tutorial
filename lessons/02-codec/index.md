# Part 2 · The codec

Appendix C of the Gray Paper defines the codec ℰ, which turns any JAM value into bytes,
and its inverse, which reads the value back. It matters more than it looks. JAM hashes
encodings: a block's hash is the hash of its header's encoding, a work-report is known
by the hash of its encoding. One byte out of place anywhere, and your hashes differ from
every other client's.

By the end of this part your client encodes and decodes its first two JAM structures
and agrees with the official test vectors, byte for byte.

- [2.1 Fixed-width integers](./01-fixed-width-integers.md)
- [2.2 Compact naturals](./02-compact-naturals.md)
- [2.3 Writer and Reader](./03-writer-and-reader.md)
- [2.4 Codecs](./04-codecs.md)
- [2.5 Sequences, options and records](./05-sequences-options-and-records.md)
- [2.6 The first test vectors](./06-the-first-test-vectors.md)
- [2.7 Watch a decode](./07-watch-a-decode.md)
