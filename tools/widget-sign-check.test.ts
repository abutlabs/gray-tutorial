// Lesson 5.3's signature widget: the message an assurance's validator signs, built in
// sign-check.ts, checked against the lesson's own prefix, code and RFC 8032 example, and the
// real assurance it embeds from the vectors checked with its embedded values (to be merged
// into tools/widgets.test.ts).

import { test } from "node:test";
import assert from "node:assert/strict";
import { toHex } from "../.vitepress/theme/bytes.ts";
import { H } from "../.vitepress/theme/hash.ts";
import {
  ascii, bytesApart, changes, DEMO_A, DEMO_B, DEMO_SECRET_A, flipParent, messageOf, PARENT, PREFIXES, publicKey,
  REAL_4, REAL_5, REAL_ASSURANCE, shortHex, sign, verify, why,
} from "../.vitepress/theme/sign-check.ts";
import type { Parts } from "../.vitepress/theme/sign-check.ts";
import { fromHex } from "../.vitepress/theme/vector-map.ts";
import { lessonCode, lessonText } from "./lessons.ts";

const text = lessonText("05-hashing-and-signatures/03-signatures.md");
const code = lessonCode("5.3");
const START: Parts = { prefix: "available", parent: PARENT, bitfield: [0x01] };

test("the widget's prefixes are the lesson's: jam_available's 13 bytes, the $ variant, a guarantee's", () => {
  const [, count, word] = /starts with the (\d+) ASCII bytes of `(jam_available)`/.exec(text)!;
  assert.equal(PREFIXES.available, word);
  assert.equal(ascii(PREFIXES.available).length, Number(count));
  assert.equal(shortHex(ascii(PREFIXES.available).slice(0, 4)), "6a 61 6d 5f"); // j a m _
  assert.equal(PREFIXES.dollar, "$" + /X_A = `\$([a-z_]+)`/.exec(text)![1]);
  assert.equal(PREFIXES.guarantee, /A guarantee's message starts with `([a-z_]+)`/.exec(text)![1]);
  // the lesson's code puts the same letters in front, then the hash of anchor ⌢ bitfield
  assert.equal(/const AVAILABLE = new TextEncoder\(\)\.encode\("([a-z_$]+)"\)/.exec(code)![1], PREFIXES.available);
  assert.match(code, /concatBytes\(AVAILABLE, blake2b256\(concatBytes\(assurance\.anchor, assurance\.bitfield\)\)\)/);
});

test("the message is the prefix's 13 bytes, then Blake2b-32 of parent ⌢ bitfield: 45 bytes", () => {
  // H is lesson 5.1's blake2b256: its known answer for no bytes at all
  const empty = /const empty: string = "(0x[0-9a-f]{64})"/.exec(lessonText("05-hashing-and-signatures/01-hashes.md"))![1];
  assert.equal(toHex(H([])), empty);
  const m = messageOf(START);
  assert.equal(m.bytes.length, 13 + 32);
  assert.deepEqual(m.prefix, ascii("jam_available"));
  assert.deepEqual(m.hash, H([...PARENT, 0x01]));
  assert.deepEqual(m.bytes, [...m.prefix, ...m.hash]);
  assert.equal(messageOf({ ...START, prefix: "dollar" }).bytes.length, 46);
  assert.equal(messageOf({ ...START, prefix: "dollar" }).bytes[0], 0x24);
});

test("sign and verify are the lesson's Ed25519: RFC 8032's first example, from the lesson's test", () => {
  const key = fromHex(/const key: Bytes = fromHex\("(0x[0-9a-f]{64})"\)/.exec(code)![1]);
  const [, a, b] = /fromHex\(\s*"(0x[0-9a-f]{64})" \+\s*"([0-9a-f]{64})",?\s*\)/.exec(code)!;
  const signature = fromHex(a + b);
  assert.equal(verify(key, [], signature), true);
  assert.equal(verify(key, [0x00], signature), false);
  // RFC 8032 §7.1, test 1: the secret key behind that public key, which signs it again
  const secret = fromHex("0x9d61b19deffd5a60ba844af492ec2cc44449c5697b326919703bac031cae7f60");
  assert.deepEqual(publicKey(secret), key);
  assert.deepEqual(sign(secret, []), signature);
});

test("the demo validator's key is fixed, and its signature checks", () => {
  assert.deepEqual(DEMO_SECRET_A, Array(32).fill(1));
  assert.deepEqual(DEMO_A.key, publicKey(Array(32).fill(1)));
  assert.notDeepEqual(DEMO_A.key, DEMO_B.key);
  const signature = sign(DEMO_SECRET_A, messageOf(START).bytes);
  assert.equal(signature.length, 64);
  assert.equal(DEMO_A.key.length, 32);
  assert.deepEqual(sign(DEMO_SECRET_A, messageOf(START).bytes), signature, "the same every time");
  assert.equal(verify(DEMO_A.key, messageOf(START).bytes, signature), true);
});

/** Every tamper the widget offers, on a message that was signed as `signed`. */
const tampers = (signed: Parts): [string, Parts, boolean][] => [
  ["claim core 1 too", { ...signed, bitfield: [signed.bitfield[0] ^ 0b10] }, false],
  ["drop core 0", { ...signed, bitfield: [signed.bitfield[0] ^ 0b01] }, false],
  ["flip the parent's last bit", { ...signed, parent: flipParent(signed.parent) }, false],
  ["a guarantee's prefix", { ...signed, prefix: "guarantee" }, false],
  ["the $ put in", { ...signed, prefix: "dollar" }, false],
  ["another validator's key", signed, true],
];

test("every tamper breaks the demo signature, and signing again mends all but the wrong key", () => {
  const signature = sign(DEMO_SECRET_A, messageOf(START).bytes);
  for (const [what, parts, other] of tampers(START)) {
    const checker = other ? DEMO_B : DEMO_A;
    assert.equal(verify(checker.key, messageOf(parts).bytes, signature), false, what);
    const again = sign(DEMO_SECRET_A, messageOf(parts).bytes);
    assert.equal(verify(checker.key, messageOf(parts).bytes, again), !other, `${what}, signed again`);
    if (!other) assert.ok(bytesApart(again, signature) > 56, `${what}: a whole new signature`);
  }
});

test("the real assurance from the vectors checks, and fails when any one byte changes", () => {
  const { parts, signature } = REAL_ASSURANCE;
  const message = messageOf(parts).bytes;
  assert.equal(verify(REAL_5.key, message, signature), true);
  for (let i = 0; i < 64; i++) {
    const bad = [...signature];
    bad[i] ^= 1;
    assert.equal(verify(REAL_5.key, message, bad), false, `signature byte ${i}`);
  }
  for (let i = 0; i < message.length; i++) {
    const bad = [...message];
    bad[i] ^= 0x80;
    assert.equal(verify(REAL_5.key, bad, signature), false, `message byte ${i}`);
  }
  for (const [what, tampered, other] of tampers(parts)) {
    assert.equal(verify(other ? REAL_4.key : REAL_5.key, messageOf(tampered).bytes, signature), false, what);
  }
});

test("what changed, and the sentence that says why", () => {
  assert.deepEqual(changes(START, START, false), []);
  assert.deepEqual(changes(START, { ...START, bitfield: [0x03] }, true), ["bitfield", "key"]);
  assert.deepEqual(changes(START, { ...START, prefix: "guarantee", parent: flipParent(PARENT) }, false), ["prefix", "parent"]);
  const say = (now: Parts, other = false) => why(false, START, now, changes(START, now, other), DEMO_A, other ? DEMO_B : DEMO_A);
  assert.match(say({ ...START, bitfield: [0x03] }), /^✗ One bit of the bitfield/);
  assert.match(say({ ...START, bitfield: [0x02] }), /^✗ 2 bits of the bitfield/);
  assert.match(say({ ...START, parent: flipParent(PARENT) }), /parent/);
  assert.match(say({ ...START, prefix: "guarantee" }), /jam_guarantee/);
  assert.match(say({ ...START, prefix: "dollar" }), /46 bytes .*\(0x24\)/);
  assert.match(say(START, true), /demo validator B's public key/);
  assert.match(say({ ...START, bitfield: [0x03] }, true), /And 1 more change/);
  assert.match(why(true, START, START, [], DEMO_A, DEMO_A), /^✓ .* 45 bytes/);
  assert.match(why(true, START, { ...START, prefix: "guarantee" }, [], DEMO_A, DEMO_A), /fails there/);
});
