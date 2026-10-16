# Cryptography we use

Your client is TypeScript you write yourself, with one exception: cryptography. A hash, a
signature or a VRF is a published standard that's easy to get subtly wrong: one wrong byte
and every check fails, or worse, a check passes that shouldn't. So for these, and only
these, your client calls open-source libraries written by specialists. This page lists
them: what each does, where JAM uses it, which library does it, and the lesson that brings
it in.

Tap an algorithm to light the bytes of a real block it made, or holds the keys of. The
block is the tiny test vector's, from [Part 4](./04-blocks/index.md); its three ring proofs alone are
2,352 of its 5,150 bytes.

<CryptoMap />

## The algorithms

The Gray Paper names them in §3.8 (*Cryptography*), and the Bandersnatch ones in
Appendix G.

### Blake2b-256

H(x), JAM's hash: a 32-byte fingerprint of any data. "JAM" hashes to `bf77ce74…` and "JAN"
to `7f4c0e47…`: one letter changed, a whole new fingerprint. Headers, reports, the state
trie and the extrinsic are all hashed with it. *Standard:* RFC 7693. *Library:*
`@noble/hashes`, from [lesson 5.1](./05-hashing-and-signatures/01-hashes.md).

### Keccak-256

H_K(x), Ethereum's hash, also 32 bytes. JAM uses it for the one root a bridge to an
Ethereum-style chain reads: the belt of accumulation outputs, which a report carries as
`beefy_root`. "JAM" hashes to `4924ad2a…`. It isn't SHA3-256, which pads its input
differently and gives `c16d7737…`. *Standard:* Keccak, as Ethereum uses it. *Library:*
`@noble/hashes`, from [lesson 9.1](./09-recent-history/01-the-mountain-belt.md).

### SHA-512

A 64-byte hash that no field of a block shows: a VRF's output is the first 32 bytes of one,
and Ed25519 uses it inside. *Library:* `@noble/hashes`, from [lesson 8.6](./08-safrole/06-the-vrf-output.md).

### Ed25519

JAM's everyday signature: a 32-byte public key and a 64-byte signature. Guarantors sign
reports, validators sign assurances, judges sign votes, and culprits and faults carry
signatures as evidence. *Standard:* RFC 8032. *Library:* `@noble/curves`, from
[lesson 5.3](./05-hashing-and-signatures/03-signatures.md).

### Bandersnatch VRF

A VRF is a signature that also gives a random number: only the key's owner could make it,
anyone can check it, and nobody, the owner included, could have picked the number. A
block's author seals it with one (96 bytes), and signs a second, the entropy source, that
feeds JAM's randomness. Bandersnatch is the elliptic curve it runs on, built over
BLS12-381's numbers so that the ring proofs below are practical. *Standard:* RFC 9381's
VRF, as the Bandersnatch VRF specification (Hosseini and Galassi) sets it out for JAM.
*Library:* `@typeberry/native`, from [lesson 8.9](./08-safrole/09-seals.md).

### Bandersnatch ring VRF

The same, anonymous: a 784-byte proof that *one of* a list of keys, the ring, made it,
without saying which. Every ticket carries one, so the lottery's winners stay secret until
their slot comes. The ring is kept as a 144-byte ring root, γ_Z. Under the hood it's a
zero-knowledge proof, with a pairing on BLS12-381 and 590 KB of public parameters every
checker shares. *Standard:* the same specification, after Burdges and others' ring VRF
paper (2023). *Library:* `@typeberry/native`, from [lesson 8.8](./08-safrole/08-the-ring-root.md).

### BLS

Signatures that combine: many validators' signatures merge into one. Every validator has a
144-byte BLS key (bytes 64 to 207 of its 336-byte validator key) for BEEFY (§18): each
validator signs every finalized block's accumulation root, so bridges can follow JAM
cheaply. That happens beside block import, not in it, so your client never checks a BLS
signature and installs nothing for it.

## The libraries

The audits are as each library's own README lists them:

- **`@noble/hashes` 2.4.0**, by Paul Miller, MIT licence. Audited by Cure53 in January
  2022, at 1.0.0, with Blake2b, Keccak and SHA-512 in scope.
- **`@noble/curves` 2.4.0**, by Paul Miller, MIT licence. Audited by Trail of Bits in August
  2026, at 2.3.0, everything; by Cure53 in September 2024, at 1.6.0, with Ed25519 in scope;
  and twice before that.
- **`@typeberry/native` 0.5.1**, by Fluffy Labs, MPL-2.0 licence. No audit claimed.
- **ark-vrf**, inside it, by Davide Galassi, MIT licence. No audit claimed.

`@typeberry/native` is the Bandersnatch library another JAM team, Fluffy Labs, made for
their client, typeberry. It wraps ark-vrf, the Rust library behind the specification the
Gray Paper cites, as WebAssembly and native code, so it runs in Node.

Why trust the two without an audit? ark-vrf is written by one of the specification's two
authors, who also makes the official test vectors, so a client that disagrees with it fails
them; and your client checks the wrapper the same way, against every vector its tickets
and seals appear in. Passing vectors shows agreement, not safety: the right bar for a
client you learn from, not enough on its own for one that holds real value.

<details>
<summary>lasair: the same choices, from OCaml</summary>

lasair hashes with digestif, an OCaml library, and reaches Rust for the rest, through its
own bindings in `rust/`: ed25519-consensus for Ed25519, and ark-vrf 0.1 for Bandersnatch.
Different libraries, the same standards: both clients pass the same vectors.

</details>
