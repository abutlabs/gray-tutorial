# Watch a decode

In lesson 2.6 you moved one field and three values went haywire. The test told you
*that* they were wrong. It couldn't tell you *where the bytes went*. Time to give the
decoder a voice: for every field, which bytes it read and where they sit. The trace goes
to your terminal and to Grafana, like everything else your client does.

## The idea

A decode trace is a list of the **innermost fields** of a value, in the order they are
read. Each says its path (`import_segments.0.index`), where its bytes start and end, and
the bytes themselves. Lengths count as fields too (`import_segments.length`),
so the trace covers every byte of the encoding exactly once. That's easy to test, and
it's what makes a trace trustworthy: no byte sneaks past unreported.

The Reader does the work. A record names each field as it reads it, a sequence names each
item by its index, and the Reader reports a field when nothing inside it was named.

## What the Reader reports to

The Reader shouldn't depend on the observability stack: it is part of the codec, and the
codec is part of everything. So it reports to anything with an `event` method. A `Run`
(lesson 0.3) has one.

**Add to** `src/codec/reader.ts`

```ts
/** What a Reader can report to: anything with an event method, such as a Run (src/obs.ts). */
export interface Trace {
  event(step: string, fields: Record<string, unknown>): void;
}
```

The Reader now takes a trace and has one new method, `field`. Everything else is as in
lesson 2.3.

**Replace in** `src/codec/reader.ts`

```ts
export class Reader {
  #bytes: Bytes;
  #at = 0; // where the next read starts
  #trace: Trace | null;
  #path: string[] = []; // the names of the fields being read, outermost first
  #inner = false; // whether the field being read has named fields of its own

  constructor(bytes: Bytes, trace: Trace | null = null) {
    this.#bytes = bytes;
    this.#trace = trace;
  }

  /** The next n bytes. */
  bytes(n: number): Bytes {
    const out = this.#bytes.slice(this.#at, this.#at + n);
    this.#at += n;
    return out;
  }

  /** The inverse of ℰ_l. */
  fixed(l: number): bigint {
    return decodeFixed(this.bytes(l));
  }

  /** The inverse of ℰ. */
  natural(): bigint {
    const { value, length } = decodeNatural(this.#bytes, this.#at);
    this.#at += length;
    return value;
  }

  /**
   * Reads one named part of a value. With a trace, every innermost part is reported: its
   * path (import_segments.0.index), where its bytes start and end, and the bytes.
   */
  field<T>(name: string, read: () => T): T {
    const from = this.#at;
    this.#path.push(name);
    this.#inner = false;
    const value = read();
    if (this.#trace && !this.#inner) {
      const bytes = this.#bytes.subarray(from, this.#at);
      this.#trace.event("decode", { field: this.#path.join("."), from, to: this.#at, bytes });
    }
    this.#path.pop();
    this.#inner = true; // tell the enclosing field it had a named field inside
    return value;
  }
}
```

`#inner` is how the Reader knows a field is innermost. Starting a field sets it to
`false`; finishing one sets it to `true`, which is what the *enclosing* field sees when
its own `read` returns. A field that named nothing inside it still sees `false`, and is
reported.

## Naming the fields

`decode` passes the trace on, and the composite codecs name what they read. Only the
`decode` lines change in each of these.

**Replace in** `src/codec/codec.ts`

```ts
import type { Trace } from "./reader.ts";

/** The value these bytes encode. A trace gets every field. */
export function decode<T>(codec: Codec<T>, bytes: Bytes, trace: Trace | null = null): T {
  return codec.decode(new Reader(bytes, trace));
}

/** ↕[...]: a sequence of any length, its length first. */
export function seq<T>(item: Codec<T>): Codec<T[]> {
  return {
    encode: (w, items) => {
      w.natural(BigInt(items.length));
      for (const x of items) item.encode(w, x);
    },
    decode: (r) => {
      const n = r.field("length", () => Number(r.natural()));
      return Array.from({ length: n }, (_, i) => r.field(String(i), () => item.decode(r)));
    },
    fromJson: (json) => (json as unknown[]).map((j) => item.fromJson(j)),
  };
}

/** A tuple with named fields, encoded field after field in the order they are written. */
export function record<F extends Fields>(fields: F): Codec<{ [K in keyof F]: Value<F[K]> }> {
  type T = { [K in keyof F]: Value<F[K]> };
  const names = Object.keys(fields) as (keyof F & string)[];
  return {
    encode: (w, value) => {
      for (const name of names) fields[name].encode(w, value[name]);
    },
    decode: (r) => {
      const value: Partial<T> = {};
      for (const name of names) value[name] = r.field(name, () => fields[name].decode(r));
      return value as T;
    },
    fromJson: (json) => {
      const object = json as Record<string, unknown>;
      const value: Partial<T> = {};
      for (const name of names) value[name] = fields[name].fromJson(object[name]);
      return value as T;
    },
  };
}
```

A sequence names its length `length` and its items `0`, `1`, `2`.

## The tests

The second test is the promise that matters: the trace covers every byte, once, in
order. Glue the bytes of every reported field back together and you get the whole
encoding.

**New file** `test/trace.test.ts`

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import type { Bytes } from "../src/bytes.ts";
import { concatBytes } from "../src/bytes.ts";
import { decode } from "../src/codec/codec.ts";
import { WorkItem } from "../src/work.ts";
import { vectorBytes } from "./vectors.ts";

type Field = { field: string; from: number; to: number; bytes: Bytes };

function traced(bytes: Bytes): Field[] {
  const fields: Field[] = [];
  decode(WorkItem, bytes, { event: (_step, f) => fields.push(f as Field) });
  return fields;
}

test("a decode trace names every innermost field, with where its bytes are", () => {
  const fields = traced(vectorBytes("codec/tiny/work_item.bin"));
  const service = { field: "service", from: 0, to: 4, bytes: Uint8Array.of(4, 3, 2, 1) };
  assert.deepEqual(fields[0], service);
  const names = fields.map((f) => f.field);
  for (const name of ["code_hash", "payload", "import_segments.length", "extrinsic.1.len"]) {
    assert.ok(names.includes(name), name);
  }
});

test("the trace covers every byte, once, in order", () => {
  const bytes = vectorBytes("codec/tiny/work_item.bin");
  const fields = traced(bytes);
  for (let i = 1; i < fields.length; i++) assert.equal(fields[i].from, fields[i - 1].to);
  assert.deepEqual(concatBytes(...fields.map((f) => f.bytes)), bytes);
});
```

The tests pass a plain object with an `event` method as the trace and collect what it's
handed. That's all a `Trace` is: something that listens.

**Run**

```sh
npm test
# prints: fail 0
# prints: reported
npm run typecheck
```

## Bytes in events

One snag before the program: `JSON.stringify` has never heard of bytes. Hand it a
`Uint8Array` and you get `{"0":4,"1":3,"2":2,"3":1}`, which is accurate and completely
useless. Teach `line` to write bytes the way the test vectors do:

**Replace in** `src/obs.ts`

```ts
import { toHex } from "./bytes.ts";

/** An event as Loki stores it: one line of JSON, with bytes written as 0x hex. */
function line(step: string, fields: Record<string, unknown>): string {
  return JSON.stringify({ step, ...fields }, (_key, value) =>
    value instanceof Uint8Array ? toHex(value) : value,
  );
}
```

The second argument to `JSON.stringify` is a *replacer*: it sees every value on the way
out and may swap it for another. Bytes become hex; everything else passes through.

## A program to watch any decode

**New file** `bin/decode.ts`

```ts
// Decodes a structure's bytes and shows, field by field, which bytes became what.
// Usage: node bin/decode.ts <structure> <file.bin>, e.g.
//        node bin/decode.ts work_item ../vectors/codec/tiny/work_item.bin

import { readFileSync } from "node:fs";
import { toHex } from "../src/bytes.ts";
import type { Codec } from "../src/codec/codec.ts";
import { decode } from "../src/codec/codec.ts";
import { Run } from "../src/obs.ts";
import { RefineContext, WorkItem } from "../src/work.ts";

/** The structures this program knows, by the test vectors' names for them. */
const CODECS: Record<string, Codec<unknown>> = {
  refine_context: RefineContext,
  work_item: WorkItem,
};

const [name, file] = process.argv.slice(2);
const codec = CODECS[name];
if (!codec || !file) {
  throw new Error(`usage: node bin/decode.ts <${Object.keys(CODECS).join("|")}> <file.bin>`);
}

const bytes = new Uint8Array(readFileSync(file));
const run = new Run("decode");
run.event("input", { structure: name, file, length: bytes.length });
decode(codec, bytes, {
  event(step, fields) {
    run.event(step, fields);
    const { field, from, to } = fields as { field: string; from: number; to: number };
    const where = `${String(from).padStart(5)}..${String(to).padEnd(5)}`;
    console.log(`${where} ${field.padEnd(30)} ${toHex(bytes.subarray(from, to))}`);
  },
});
const link = await run.report();
if (link) console.log(`reported to Grafana: ${link}`);
```

**Run**

```sh
node bin/decode.ts work_item ../vectors/codec/tiny/work_item.bin
# prints: 0..4     service
# prints: import_segments.0.tree_root
# prints: reported to Grafana
```

Read the output against the hex dump from lesson 2.6: `service` is bytes 0 to 4, then
`code_hash` 4 to 36, `refine_gas_limit` 36 to 44. On the dashboard, *Decode trace* shows
the same list for the run.

## Break it again

Now move `export_count` above the gas limits in `WorkItem` again, as in lesson 2.6, and
rerun `bin/decode.ts`:

```text
    0..4     service                        0x04030201
    4..36    code_hash                      0x70a50829851e8f6a8c80f92806ae0e95eb7c06ad064e311cc39107b3219e532e
   36..38    export_count                   0x2a00
   38..46    refine_gas_limit               0x0000000000002a00
   46..54    accumulate_gas_limit           0x0000000000000400
   54..60    payload                        0x050102030405
```

The trace shows exactly what happened: `export_count` read bytes 36 to 38, `2a00`, the
first two bytes of the refine gas limit, and both gas limits then started two bytes
late. `payload` starts at 54 either way, which is why everything after
it still decoded correctly. Put `export_count` back afterwards.

This is how you'll debug every failing vector from here on: don't just stare at what
your client got wrong, watch what it *read*.

<details>
<summary>lasair: <code>Trace_runner</code></summary>

lasair grew its own trace after the fact: when a block import's state root is wrong, its
trace runner prints which state keys differ and the first differing byte, as in the
banked fuzzer sessions:

```text
  FAIL: Post-state root verification failed
  Diff: added=0, removed=0, modified=1
  Modified key: 0x0d (expected 526 bytes, got 526 bytes)
    First diff at byte 349: expected 0x1c, got 0x1e
```

That says *where* the result is wrong, after the whole import. A decode trace, and the
step traces of later parts, say *which step* made it wrong, while it happens.

</details>

## What you have

A codec that can tell you, byte by byte, what it read, and a program that shows any
decode in the terminal and in Grafana.

Next: [Part 3 · Work and reports](../03-work-and-reports/index.md)
