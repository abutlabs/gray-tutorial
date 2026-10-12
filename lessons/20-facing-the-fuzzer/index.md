# Part 20 · Facing the fuzzer

The JAM Prize checks a client with its conformance fuzzer: a program that makes blocks,
breaks some on purpose, sends them to the client over a socket and compares every state
root. This part teaches your client to talk to it: the protocol's messages, a target that
keeps its states and answers, a session of your own to test it with, and the packaging the
fuzzer expects.

By the end of this part your client is a fuzz target: it speaks the fuzzer's protocol, version 1, on a
Unix socket, checks lookup anchors against the chain's ancestry, survives a whole session
on every trace, and starts the way the official fuzzer starts targets.

**Builds on** [Part 4 · Blocks](../04-blocks/index.md), [Part 5 · Hashing and
signatures](../05-hashing-and-signatures/index.md), [Part 6 · State and
Merklization](../06-state-and-merklization/index.md) and [Part 19 · Block
import](../19-block-import/index.md), and on the foundations every part uses, [Parts 0 to
2](../index.md#lessons).

**Starting here?** At the repo root, `npm run catch-up -- 19.6` makes your client the one
this part starts from; [How to read it](../index.md#how-to-read-it) says more.

- [20.1 Speaking the protocol](./01-speaking-the-protocol.md)
- [20.2 A target](./02-a-target.md)
- [20.3 A session](./03-a-session.md)
- [20.4 Ready to be fuzzed](./04-ready-to-be-fuzzed.md)
