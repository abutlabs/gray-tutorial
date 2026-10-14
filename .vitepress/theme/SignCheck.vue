<!-- Lesson 5.3: what an assurance's validator signs (GP §11), X_A then H(parent ⌢ bitfield),
     and what breaks the check. Tamper with the message or the key, press check; sign again
     to make it pass. A demo validator, whose made-up secret key is shown, or validator 5's
     real assurance from the vectors, which can only be checked. Logic in sign-check.ts. -->
<script setup lang="ts">
import { computed, ref, watch } from "vue";
import BitfieldBytes from "./BitfieldBytes.vue";
import { bitsChanged } from "./hash.ts";
import {
  bytesApart, changes, DEMO_A, DEMO_B, flipParent, messageOf, PARENT, PREFIXES, REAL_4, REAL_5, REAL_ASSURANCE,
  shortHex, sign, verify, why,
} from "./sign-check.ts";
import type { Parts, PrefixId, Signer } from "./sign-check.ts";

const CORES = 2; // tiny
const DEMO_START: Parts = { prefix: "available", parent: PARENT, bitfield: [0x01] };
const MODES = {
  demo: { signer: DEMO_A, other: DEMO_B, start: DEMO_START, signature: sign(DEMO_A.secret!, messageOf(DEMO_START).bytes) },
  real: { signer: REAL_5, other: REAL_4, start: REAL_ASSURANCE.parts, signature: REAL_ASSURANCE.signature },
};
type Mode = keyof typeof MODES;
const GOALS = [
  { id: "onebit", say: "make a valid signature fail by changing one bit" },
  { id: "replay", say: "show a guarantee's prefix can't reuse an assurance's signature" },
  { id: "wrongkey", say: "check with the wrong validator's key" },
  { id: "resign", say: "change the message, sign again and make it pass" },
];

const hex = (b: number) => b.toString(16).padStart(2, "0");

const mode = ref<Mode>("demo");
const prefix = ref<PrefixId>("available");
const parent = ref<number[]>(PARENT);
const bitfield = ref<number[]>([0x01]);
const otherKey = ref(false);
const signature = ref<number[]>(MODES.demo.signature);
const signed = ref<Parts>(DEMO_START); // the message the signature was made over
const result = ref<{ valid: boolean; say: string } | null>(null);
const resignNote = ref("");
const reached = ref(new Set<string>());

const m = computed(() => MODES[mode.value]);
const signer = computed<Signer>(() => m.value.signer);
const checker = computed<Signer>(() => (otherKey.value ? m.value.other : m.value.signer));
const parts = computed<Parts>(() => ({ prefix: prefix.value, parent: parent.value, bitfield: bitfield.value }));
const message = computed(() => messageOf(parts.value));
const signedMessage = computed(() => messageOf(signed.value));
const changed = computed(() => changes(signed.value, parts.value, otherKey.value));
const parentFlipped = computed(() => parent.value.some((b, i) => b !== m.value.start.parent[i]));
const letters = computed(() => [...PREFIXES[prefix.value]]);
const groups = computed(() => Array.from({ length: 16 }, (_, g) => signature.value.slice(4 * g, 4 * g + 4).map(hex).join("")));
const changedSay = computed(() => (changed.value.length ? `${changed.value[0]}${changed.value.length > 1 ? ` +${changed.value.length - 1}` : ""}` : "nothing"));

// any change to what's checked, or by whom, makes the last result stale
watch([parts, otherKey], () => { result.value = null; resignNote.value = ""; });

const mark = (id: string) => { reached.value = new Set([...reached.value, id]); };
function check() {
  const valid = verify(checker.value.key, message.value.bytes, signature.value);
  result.value = { valid, say: why(valid, signed.value, parts.value, changed.value, signer.value, checker.value) };
  const c = changed.value;
  const bits = bitsChanged(parent.value, signed.value.parent) + bitsChanged(bitfield.value, signed.value.bitfield);
  if (!valid && bits === 1 && c.every((k) => k === "parent" || k === "bitfield")) mark("onebit");
  if (!valid && signed.value.prefix === "available" && prefix.value === "guarantee") mark("replay");
  if (!valid && otherKey.value) mark("wrongkey");
  if (valid && bytesApart(message.value.bytes, messageOf(m.value.start).bytes) > 0) mark("resign");
}
function signAgain() {
  const secret = signer.value.secret;
  if (!secret) return;
  const before = signature.value;
  signature.value = sign(secret, message.value.bytes);
  signed.value = { ...parts.value };
  const n = bytesApart(before, signature.value);
  check();
  resignNote.value = n ? `New signature: ${n} of its 64 bytes changed.` : "Same message, same key: the same signature (Ed25519 is deterministic).";
}
function reset(to: Mode = mode.value) {
  mode.value = to;
  const s = MODES[to];
  prefix.value = s.start.prefix;
  parent.value = s.start.parent;
  bitfield.value = s.start.bitfield;
  otherKey.value = false;
  signature.value = s.signature;
  signed.value = s.start;
  result.value = null;
  resignNote.value = "";
}
const prefixDiff = (i: number) => message.value.prefix[i] !== signedMessage.value.prefix[i];
const hashDiff = (i: number) => message.value.hash[i] !== signedMessage.value.hash[i];
</script>

<template>
  <div class="widget sign-check">
    <div class="readout" aria-live="polite">
      <div class="tile"><span class="tile-label">message</span><span class="tile-value len">{{ message.bytes.length }} bytes</span></div>
      <div class="tile"><span class="tile-label">signature</span><span class="tile-value sig bytes">{{ shortHex(signature.slice(0, 4)) }}…</span></div>
      <div class="tile" :class="{ ok: result?.valid, bad: result && !result.valid }">
        <span class="tile-label">check</span>
        <span class="tile-value res">{{ result ? (result.valid ? "✓ valid" : "✗ fails") : "? press check" }}</span>
      </div>
      <div class="tile"><span class="tile-label">changed since signed</span><span class="tile-value what">{{ changedSay }}</span></div>
    </div>
    <p class="range">
      An assurance's validator signs {{ PREFIXES.available.length }} + 32 = 45 bytes: the letters jam_available, then
      H(parent ⌢ bitfield). Its Ed25519 secret key makes a 64-byte signature; anyone with its 32-byte public key can
      check it. Change something, then press check.
    </p>
    <div class="controls" role="group" aria-label="who signed">
      <button class="small" :class="{ chosen: mode === 'demo' }" :aria-pressed="mode === 'demo'" @click="reset('demo')">a demo validator</button>
      <button class="small" :class="{ chosen: mode === 'real' }" :aria-pressed="mode === 'real'" @click="reset('real')">a real assurance from the vectors</button>
    </div>

    <dl class="answers keys">
      <dt>signer</dt>
      <dd class="long">{{ signer.name }}<template v-if="mode === 'real'"> of tiny some_assurances-1, core 0 only</template></dd>
      <template v-if="signer.secret">
        <dt>secret key</dt>
        <dd class="long"><span class="bytes">{{ shortHex(signer.secret) }}</span> <span class="note">(32 bytes of 0x01, made up and shown so you can sign: a real one never leaves its validator)</span></dd>
      </template>
      <dt>public key</dt>
      <dd class="long bytes">{{ shortHex(signer.key) }}</dd>
    </dl>

    <div class="strip">
      <div class="label"><span class="unit-tag bytes">bytes</span> 1 · the prefix X_A: {{ message.prefix.length }} ASCII bytes</div>
      <div class="cells">
        <span v-for="(b, i) in message.prefix" :key="i" class="cell unit-byte letter" :class="{ diff: prefixDiff(i) }">
          <span class="h">{{ hex(b) }}</span><span class="c">{{ letters[i] }}</span>
        </span>
      </div>
      <div class="controls" role="group" aria-label="the prefix">
        <button v-for="(text, id) in PREFIXES" :key="id" class="small" :class="{ chosen: prefix === id }" :aria-pressed="prefix === id"
          @click="prefix = id">{{ text }}</button>
      </div>
    </div>

    <div class="strip">
      <div class="label">2 · what's hashed: parent ⌢ bitfield, 32 + 1 bytes</div>
      <div class="input">
        <span class="part"><span class="tag">parent</span> <code class="bytes">{{ shortHex(parent) }}</code></span>
        <button class="small" :class="{ chosen: parentFlipped }" :aria-pressed="parentFlipped"
          @click="parent = flipParent(parent)">flip its last bit</button>
      </div>
      <div class="input">
        <span class="tag">bitfield</span>
        <BitfieldBytes v-model="bitfield" :cores="CORES" compact inline />
        <span class="note">a 1 says "I hold my piece of this core"</span>
      </div>
    </div>

    <div class="strip">
      <div class="label"><span class="unit-tag bytes">bytes</span> 3 · H(parent ⌢ bitfield): 32 bytes of Blake2b <span class="note">(outlined: bytes that differ from the message that was signed)</span></div>
      <div class="cells hash">
        <span v-for="(b, i) in message.hash" :key="i" class="cell unit-byte" :class="{ diff: hashDiff(i) }">{{ hex(b) }}</span>
      </div>
    </div>

    <div class="strip">
      <div class="label">signature: 64 bytes, made by {{ signer.name }}'s secret key</div>
      <div class="sigbytes"><span v-for="(g, i) in groups" :key="i">{{ g }}</span></div>
    </div>

    <div class="controls actions">
      <button class="small" :class="{ chosen: otherKey }" :aria-pressed="otherKey" @click="otherKey = !otherKey">
        check with {{ m.other.name }}'s key
      </button>
      <button class="small go" @click="check">check</button>
      <button class="small" :disabled="!signer.secret" @click="signAgain">sign again</button>
      <button class="small" @click="reset()">start over</button>
    </div>
    <p class="line" aria-live="polite">
      <template v-if="result">{{ result.say }} <span v-if="resignNote" class="note">{{ resignNote }}</span></template>
      <template v-else-if="!signer.secret">You can check {{ signer.name }}'s signature, but not sign again: only {{ signer.name }} holds its secret key.</template>
      <template v-else>Checking with {{ checker.name }}'s public key.</template>
    </p>

    <ul class="goals">
      <li v-for="g in GOALS" :key="g.id" :class="{ done: reached.has(g.id) }">{{ reached.has(g.id) ? "✓" : "○" }} <UnitText :text="g.say" /></li>
    </ul>
  </div>
</template>

<style scoped>
.tile .tile-value { font-size: 18px; }
.tile .len { min-width: 8ch; }
.tile .sig { min-width: 13ch; }
.tile .res { min-width: 13ch; }
.tile .what { min-width: 11ch; }
.tile.ok { border-color: var(--bit-low-line); background: var(--bit-low); }
.tile.bad { border-color: var(--vp-c-danger-1); }
.range { font-size: 14px; color: var(--vp-c-text-2); margin: 0 0 8px; line-height: 1.5; }
.controls { display: flex; gap: 6px; flex-wrap: wrap; margin: 6px 0; }
.controls button.small { min-height: 32px; }
/* every button a finger can hit on a phone */
button.small { min-height: 36px; min-width: 36px; }
.keys { margin: 8px 0; }
.keys dd.long { font-size: 13px; word-break: normal; overflow-wrap: anywhere; }
.note { font-family: var(--vp-font-family-base); font-size: 12px; font-weight: 400; color: var(--vp-c-text-2); }
.strip { margin: 10px 0; }
.label { font-size: 13px; color: var(--vp-c-text-2); margin-bottom: 4px; }
.cells { display: flex; flex-wrap: wrap; gap: 2px; font-family: var(--vp-font-family-mono); font-size: 13px; }
.cell {
  display: inline-flex; flex-direction: column; align-items: center; justify-content: center; min-width: 2.6ch;
  padding: 2px 3px; border: 1px solid var(--bit-top-line); border-radius: 3px; background: var(--bit-top);
}
.cell.letter { border-color: var(--bit-mark-line); background: var(--bit-mark); }
.cell .c { font-size: 12px; color: var(--vp-c-text-2); }
.cell.diff { outline: 2px solid var(--changed-line); outline-offset: -1px; font-weight: 700; }
.input { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 10px; margin: 4px 0; }
.input code { font-size: 13px; }
.tag { font-size: 13px; font-family: var(--vp-font-family-mono); color: var(--vp-c-text-2); }
.sigbytes { display: flex; flex-wrap: wrap; gap: 2px 8px; font-family: var(--vp-font-family-mono); font-size: 13px; }
.actions button.go { border-color: var(--vp-c-brand-1); font-weight: 600; }
.actions button:disabled { opacity: 0.5; cursor: not-allowed; }
.line { font-size: 14px; margin: 8px 0; line-height: 1.5; min-height: 4.5em; }
.goals { list-style: none; padding: 0; margin: 12px 0 0; font-size: 14px; color: var(--vp-c-text-2); }
.goals li.done { color: var(--vp-c-green-1); }
@media (max-width: 640px) {
  .widget.sign-check { padding: 12px; }
  .tile .tile-value { font-size: 16px; }
  .cells { font-size: 12px; }
}
</style>
