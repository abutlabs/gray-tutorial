# Speaking the protocol

Your client imports blocks. The official conformance fuzzer is how we check
that: it makes blocks of its own, some of them broken on purpose, sends them to your client
one at a time, and compares every state root with its own. It doesn't run your tests or
read your code. It talks to your client over a socket, in a small protocol of its own, and
that's what this part builds. First the messages: by the end of this lesson your client
reads and writes every one of them, byte for byte as the protocol's examples have them.

## New words

- **Conformance fuzzer.** The testing program: it makes blocks, often mutated
  into bad ones, has a client import them, and compares the state roots. *Example:* the
  fuzzer sends a block, your client answers with a root, and the fuzzer checks it.
- **Unix socket.** A connection between two programs on the same computer, through a file
  path, read and written like a network connection. *Example:* `/tmp/jam_target.sock`.
- **Frame.** One message on a stream of bytes: its length first, so the reader knows where
  it ends. *Example:* `21 00 00 00`, then 33 bytes.

All three are in the [glossary](../glossary.md).

## What the protocol says

`fuzz-proto`, version 1, in the jam-conformance repository: a README and an ASN.1 file. Not
the Gray Paper, which leaves testing to others. In plain steps:

1. **The connection.** The client listens on a Unix socket; the fuzzer connects.
2. **Seven messages**, each in the JAM codec: one byte for its kind, then what it carries.
   PeerInfo (0), the handshake: a protocol version, features, the Gray Paper's version, and
   an app's name and version. Initialize (1): a header, a state's entries, and its ancestry
   ([lesson 20.2](./02-a-target.md)). StateRoot (2): a 32-byte root. ImportBlock (3): a block. GetState (4): a
   header's hash. State (5): a state's entries. Error (255): a reason, as text.
3. **Frames.** Every message goes on the socket as its length, four bytes, little end
   first, then the message.

The codec is the one you've had since [Part 2](../02-codec/index.md): the header, the block and the state's entries
are [Part 4](../04-blocks/index.md)'s and [Part 6](../06-state-and-merklization/index.md)'s. Only the envelope is new.

One honest note: the protocol's recorded example sessions are for Gray Paper 0.7.0 and
0.7.2, whose blocks are laid out a little differently, so your 0.8.0 codec can't read
their blocks. The README's own three examples don't change between versions, so the tests
check those byte for byte, and check Initialize and ImportBlock by making them from the
0.8.0 traces and reading them back.

## The tests

**New file** `test/fuzz.test.ts`

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { Block, Header, headerHash } from "../src/block.ts";
import type { Bytes } from "../src/bytes.ts";
import { concatBytes, fromHex, toHex } from "../src/bytes.ts";
import { decode, encode } from "../src/codec/codec.ts";
import { TINY } from "../src/config.ts";
import type { Message } from "../src/fuzz.ts";
import { MessageCodec, frame, readFrames } from "../src/fuzz.ts";
import { vectorJson } from "./vectors.ts";

/** The protocol README's three examples: a PeerInfo, a StateRoot and an Error. */
const EXAMPLES = [
  "0x0001020000000007000001190666757a7a6572",
  "0x024559342d3a32a8cbc3c46399a80753abff8bf785aa9d6f623e0de045ba6701fe",
  "0xff4c436861696e206572726f723a20626c6f636b20657865637574696f6e206661696c7572653a20" +
    "707265696d61676573206572726f723a20707265696d616765206e6f74207265717569726564",
];

test("the protocol's examples decode, and encode back byte for byte", () => {
  const codec = MessageCodec(TINY);
  const kinds: string[] = [];
  for (const example of EXAMPLES) {
    const message: Message = decode(codec, fromHex(example));
    kinds.push(message.kind);
    const back: string = toHex(encode(codec, message));
    assert.equal(back, example);
  }
  assert.deepEqual(kinds, ["peer_info", "state_root", "error"]);
  const hello: Message = decode(codec, fromHex(EXAMPLES[0]));
  const name: string =
    hello.kind === "peer_info" ? new TextDecoder().decode(hello.value.app_name) : "";
  assert.equal(name, "fuzzer");
});

test("Initialize and ImportBlock, made from a trace, round-trip too", () => {
  const codec = MessageCodec(TINY);
  const genesis = vectorJson("traces/storage/genesis.json") as { header: unknown; state: unknown };
  const header = Header(TINY).fromJson(genesis.header);
  const keyvals = (genesis.state as { keyvals: { key: string; value: string }[] }).keyvals
    .map((e) => ({ key: fromHex(e.key), value: fromHex(e.value) }));
  const ancestry = [{ slot: header.slot, header_hash: headerHash(TINY, header) }];
  const step = vectorJson("traces/storage/00000010.json") as { block: unknown };
  for (const message of [
    { kind: "initialize", value: { header, keyvals, ancestry } },
    { kind: "import_block", value: Block(TINY).fromJson(step.block) },
  ] as Message[]) {
    const bytes: Bytes = encode(codec, message);
    const decoded: Message = decode(codec, bytes);
    assert.deepEqual(decoded, message, message.kind);
  }
});

test("frames: a length in four bytes, then the message, however the bytes arrive", async () => {
  const framed: Bytes = frame(fromHex(EXAMPLES[1]));
  assert.equal(toHex(framed.subarray(0, 4)), "0x21000000"); // 33 bytes, little end first
  const both: Bytes = concatBytes(framed, frame(fromHex(EXAMPLES[0])));
  async function* inPieces() { // three bytes at a time, as a slow socket might deliver them
    for (let i = 0; i < both.length; i += 3) yield both.slice(i, i + 3);
  }
  const messages: string[] = [];
  for await (const message of readFrames(inPieces())) messages.push(toHex(message));
  assert.deepEqual(messages, [EXAMPLES[1], EXAMPLES[0]]);
});
```

The third test feeds two frames to `readFrames` three bytes at a time, the way a slow
socket might deliver them: a message must come out whole however its bytes arrive.

**Run, expect it to fail**

```sh
npm test
```

```text
...
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '…/client/src/fuzz.ts' imported from …/client/test/fuzz.test.ts
...
ℹ tests 649
ℹ suites 0
ℹ pass 648
ℹ fail 1
...
```

## The code

**New file** `src/fuzz.ts`

```ts
// The conformance fuzzer's protocol (jam-conformance fuzz-proto, version 1): the messages
// the fuzzer and a client send each other over a Unix socket, in the JAM codec.

import type { Bytes } from "./bytes.ts";
import { concatBytes } from "./bytes.ts";
import type { Codec, Value } from "./codec/codec.ts";
import { blob, fixedBytes, hash, record, seq, u8, u32 } from "./codec/codec.ts";
import type { Config } from "./config.ts";
import { Block, Header } from "./block.ts";

/** A version, as three bytes: major, minor, patch. */
const Version = record({ major: u8, minor: u8, patch: u8 });

/** Who's talking, and what they can do: the first message each side sends. */
export const PeerInfo = record({
  fuzz_version: u8, // the protocol's version: 1
  fuzz_features: u32, // bits: 1 for ancestry, 2 for forks
  jam_version: Version, // the Gray Paper's: 0.8.0
  app_version: Version,
  app_name: blob, // UTF-8, its length first
});
export type PeerInfo = Value<typeof PeerInfo>;

/** One entry of a state, as the fuzzer sends it: a 31-byte key and its value. */
const KeyValueCodec = record({ key: fixedBytes(31), value: blob });

/** A block the client may need as a lookup anchor: its slot and its header's hash. */
export const AncestryItem = record({ slot: u32, header_hash: hash });
export type AncestryItem = Value<typeof AncestryItem>;

/** Initialize: the state to start from, a header to name it by, and its ancestors. */
export function Initialize(config: Config) {
  return record({
    header: Header(config), // a header to name the state by: its hash
    keyvals: seq(KeyValueCodec), // the state, as entries
    ancestry: seq(AncestryItem), // the last L blocks, this one's header included
  });
}

/** A message, either way: its kind and what it carries. */
export type Message =
  | { kind: "peer_info"; value: PeerInfo }
  | { kind: "initialize"; value: Value<ReturnType<typeof Initialize>> }
  | { kind: "state_root"; value: Bytes }
  | { kind: "import_block"; value: Block }
  | { kind: "get_state"; value: Bytes } // a header's hash
  | { kind: "state"; value: { key: Bytes; value: Bytes }[] }
  | { kind: "error"; value: Bytes }; // UTF-8 text, for whoever reads the logs

/** Each kind of message: the byte it starts with, and how the rest is encoded. */
function kinds(config: Config): Record<Message["kind"], [number, Codec<any>]> {
  return {
    peer_info: [0, PeerInfo],
    initialize: [1, Initialize(config)],
    state_root: [2, hash],
    import_block: [3, Block(config)],
    get_state: [4, hash],
    state: [5, seq(KeyValueCodec)],
    error: [255, blob],
  };
}

/** A message (fuzz-proto): one byte for its kind, then what it carries. */
export function MessageCodec(config: Config): Codec<Message> {
  const all = Object.entries(kinds(config)) as [Message["kind"], [number, Codec<any>]][];
  return {
    encode: (w, m) => {
      const [tag, codec] = kinds(config)[m.kind];
      w.fixed(BigInt(tag), 1);
      codec.encode(w, m.value);
    },
    decode: (r) => {
      const tag = Number(r.fixed(1));
      const found = all.find(([, [t]]) => t === tag);
      if (!found) throw new Error(`no message starts with ${tag}`);
      const [kind, [, codec]] = found;
      return { kind, value: codec.decode(r) } as Message;
    },
    fromJson: () => {
      throw new Error("messages come as bytes");
    },
  };
}

/** The fuzzer's frame: every message is sent as its length, four bytes, then itself. */
export function frame(message: Bytes): Bytes {
  const framed = new Uint8Array(4 + message.length);
  new DataView(framed.buffer).setUint32(0, message.length, true);
  framed.set(message, 4);
  return framed;
}

/** The messages in a stream of frames, one at a time, however the bytes arrive. */
export async function* readFrames(stream: AsyncIterable<Uint8Array>): AsyncGenerator<Bytes> {
  let buffer: Bytes = new Uint8Array(0);
  for await (const chunk of stream) {
    buffer = concatBytes(buffer, chunk);
    while (buffer.length >= 4) {
      const length = new DataView(buffer.buffer, buffer.byteOffset).getUint32(0, true);
      if (buffer.length < 4 + length) break; // the rest is still on its way
      yield buffer.slice(4, 4 + length);
      buffer = buffer.slice(4 + length);
    }
  }
}
```

```ts
  | { kind: "state_root"; value: Bytes }
```

`Message` is a *union type* ([lesson 2.4](../02-codec/04-codecs.md)): one of seven shapes, told apart by `kind`. `kinds`
lists each kind's first byte and codec, so `MessageCodec` writes the byte and then the
rest, and reads the byte to know which codec reads the rest.

```ts
      if (buffer.length < 4 + length) break; // the rest is still on its way
```

`readFrames` keeps what has arrived in `buffer` and hands out each message once all of it
is there. `async function*` makes it a stream of its own, read with `for await`.

**Run**

```sh
npm test
npm run typecheck
```

```text
...
✔ the protocol's examples decode, and encode back byte for byte (1.556ms)
✔ Initialize and ImportBlock, made from a trace, round-trip too (22.031292ms)
✔ frames: a length in four bytes, then the message, however the bytes arrive (1.041375ms)
...
ℹ tests 651
ℹ suites 0
ℹ pass 651
ℹ fail 0
...
reported 651 tests to Grafana: http://127.0.0.1:3300/d/gray-tutorial?var-client=you&var-run_id=test-1791774812331
...
```

<details>
<summary>lasair: the same envelope, in <code>bin/conformance_target.ml</code></summary>

```ocaml
(** JAM conformance fuzz target — fuzz-proto v1 (jam-conformance).

    Black-box protocol over a Unix domain socket. Every message is a
    u32-LE length prefix followed by a JAM-codec body whose first byte is
    the variant:

      0 peer_info | 1 initialize | 2 state_root | 3 import_block
      4 get_state | 5 state      | 255 error
```

The top of lasair's fuzz target: your `src/fuzz.ts`, as a comment. "Black-box" is the
fuzzer's word for what it knows of a client: nothing inside, only what it answers. The
version string just below this comment in lasair's file is a long changelog, and worth a
read: most of its entries are a bug the fuzzer found that no test vector had.

</details>

## What you have

The fuzzer's language: every message, read and written, and frames on a stream. Next, a
client that listens, keeps the states it makes, and answers: [lesson 20.2](./02-a-target.md).

Next: [20.2 A target](./02-a-target.md)
