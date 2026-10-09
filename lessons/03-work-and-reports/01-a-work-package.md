# A work-package

In Part 2 you encoded a single work item. Nobody sends a work item on its own, though.
Items travel in a **work-package**: a parcel of up to sixteen jobs, addressed to one of
JAM's cores, with a permission slip stapled to the front.

## What the Gray Paper says

§14 (*Packages and Items*) defines a work-package as six things:

- **items**: the work items, 1 to 16 of them (the Gray Paper calls the limit I = 16);
- **context**: the refinement context from lesson 2.6, the chain as the package saw it;
- and the permission slip, in four parts. Each core only accepts packages that a small
  program called an **authorizer** approves. The package says where that program lives
  (`auth_code_host`, a service, and `auth_code_hash`, which code in it), hands it a token
  (`authorization`) and its settings (`authorizer_config`).

You'll run an authorizer in a much later part. Today the package is a shape to encode,
and almost every piece of it is already in your client.

Appendix C encodes it in this order: ℰ₄ of the code host, the code hash, the context,
then the token, the config and the items, each with its length in front.

## The test

**Add to** `test/work.test.ts`

```ts
import { WorkPackage } from "../src/work.ts";

for (const spec of ["tiny", "full"]) {
  test(`work_package (${spec})`, () => checkCodecVector(WorkPackage, `codec/${spec}/work_package`));
}
```

**Run, expect it to fail**

```sh
npm test
# fails with: does not provide an export named
```

## The code

**Add to** `src/work.ts`

```ts
/**
 * A work-package (GP §14): up to 16 work items for one core, the context they were built
 * against, and what the authorizer needs to let them in.
 */
export const WorkPackage = record({
  auth_code_host: u32, // the service whose storage holds the authorizer's code
  auth_code_hash: hash, // which code: the authorizer
  context: RefineContext,
  authorization: blob, // the token the authorizer checks
  authorizer_config: blob, // the authorizer's settings
  items: seq(WorkItem),
});
export type WorkPackage = Value<typeof WorkPackage>;
```

Look at what *isn't* there: no new codec. `context` is the whole `RefineContext` record,
`items` is a `seq` of whole `WorkItem` records, and the codec machinery from Part 2 just
nests them. Records inside records inside a list: it's bricks all the way down.

**Run**

```sh
npm test
# prints: work_package (full)
# prints: fail 0
# prints: reported
npm run typecheck
```

## Watch it

Teach `bin/decode.ts` the new structure:

**Replace in** `bin/decode.ts`

```ts
import { WorkPackage } from "../src/work.ts";

/** The structures this program knows, by the test vectors' names for them. */
const CODECS: Record<string, Codec<unknown>> = {
  refine_context: RefineContext,
  work_item: WorkItem,
  work_package: WorkPackage,
};
```

**Run**

```sh
node bin/decode.ts work_package ../vectors/codec/tiny/work_package.bin
# prints: context.lookup_anchor_slot
# prints: items.1.extrinsic.0.hash
# prints: reported to Grafana
```

The trace paths show the nesting: `context.anchor_slot`, `items.1.import_segments.0.index`.
And the very first field, `auth_code_host`, reads `0x78563412`: that's 305,419,896, better
known as `0x12345678`, written little end first. The vector's authors have a sense of
humour.

<details>
<summary>lasair: two orders for one package</summary>

lasair has *two* work-package types. The node's, in `lib/work_packages.ml`, lists the
parts in the Gray Paper's *definition* order, token first:

```ocaml
type work_package = {
  auth_token: bytes;              (** Authorization token blob *)
  auth_code_host: int;            (** Service hosting auth code *)
  auth_code_hash: hash;           (** Hash of authorization code *)
  auth_config: bytes;             (** Authorization configuration *)
  context: work_context;          (** Execution context *)
  work_items: work_item list;     (** 1 to C_max_package_items items *)
}
```

The other, in `conformance/codec_tests.ml`, uses the vectors' names in Appendix C's
order (`auth_code_host`, `auth_code_hash`, `context`, `authorization`, ...), and its
encoder writes them that way, code host first, the trap from lesson 2.6 avoided by hand:

```ocaml
let encode_work_package (wp : work_package) : bytes =
  let enc = Serialization.create_encoder () in
  (* auth_code_host: u32 *)
  Serialization.write_bytes enc (Serialization.encode_u32 wp.auth_code_host);
  (* auth_code_hash: 32 bytes *)
  Serialization.write_bytes enc wp.auth_code_hash;
  (* context *)
  Serialization.write_bytes enc (encode_refine_context wp.context);
```

Your client needs only one: a `record` is the type, the encoder, the decoder and the JSON
reader at once, in the encoding's order.

</details>

## What you have

The parcel that carries work into JAM, encoded byte for byte.

Next: [3.2 Work digests](./02-work-digests.md)
