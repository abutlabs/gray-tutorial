<!-- Lesson 5.1: H(x), Blake2b with a 32-byte output. Tap a byte of the input, then one of its
     bits, to flip it: about half of the 256 hash bits flip, with no pattern. And one number
     in two encodings gives two strangers' hashes. Every hash is computed in hash.ts. -->
<script setup lang="ts">
import { computed, ref } from "vue";
import { allBits, bitsChanged, bitsOfByte, changedBits, encodeNumber, ENCODINGS, flipBit, H, inputBitsChanged, MAX_NUMBER, parseHex, spaced, textBytes } from "./hash.ts";
import type { Encoding } from "./hash.ts";

const START = [0xc7, 0x12]; // ℰ₂(4,807), lesson 2.1's example
const GOALS = [
  { id: "flip", say: "flip one bit and change over 100 hash bits" },
  { id: "nothing", say: "find the hash of nothing" },
  { id: "two", say: "make two encodings of 42 with different hashes" },
];
const PLACES = [128, 64, 32, 16, 8, 4, 2, 1];
const ROWS = [0, 8, 16, 24]; // a hash in 4 rows of 8 bytes

const input = ref<number[]>(START);
const previous = ref<number[] | null>(null); // the input before the last change
const sel = ref(0);
const typing = ref<"hex" | "text">("hex");
const draft = ref(spaced(START));
const num = ref(42);
const loaded = ref<Encoding | null>(null); // the encoding the input holds, while it holds one
const seen42 = ref(new Set<Encoding>());
const reached = ref(new Set<string>());

const hash = computed(() => H(input.value));
const before = computed(() => (previous.value ? H(previous.value) : null));
const flips = computed(() => (before.value ? changedBits(before.value, hash.value) : null));
const changed = computed(() => (before.value ? bitsChanged(before.value, hash.value) : null));
const inputFlips = computed(() => (previous.value ? inputBitsChanged(previous.value, input.value) : null));
const bits = computed(() => allBits(hash.value));
const selBits = computed(() => (sel.value < input.value.length ? bitsOfByte(input.value[sel.value]) : []));
const bad = computed(() => typing.value === "hex" && parseHex(draft.value) === null);
const numOk = computed(() => Number.isInteger(num.value) && num.value >= 0 && num.value <= MAX_NUMBER);
const encoded = computed(() => (numOk.value ? ENCODINGS.map((e) => ({ ...e, bytes: encodeNumber(num.value, e.id) })) : []));

const loadedSay = computed(() => ENCODINGS.find((e) => e.id === loaded.value)?.say ?? "");
const short = (bytes: number[]) => spaced(bytes.slice(0, 4)).replace(/ /g, "");
const byteChanged = (i: number) => before.value !== null && before.value[i] !== hash.value[i];

const mark = (id: string) => { reached.value = new Set([...reached.value, id]); };
/** The reader's change: keep what was there to compare against, and see what it brought about. */
function change(bytes: number[], from: "bits" | "field" | "preset", how: Encoding | null = null) {
  previous.value = input.value;
  input.value = bytes;
  loaded.value = how;
  sel.value = Math.min(sel.value, Math.max(0, bytes.length - 1));
  if (from !== "field") draft.value = typing.value === "hex" ? spaced(bytes) : new TextDecoder().decode(Uint8Array.from(bytes));
  if (inputFlips.value === 1 && (changed.value ?? 0) > 100) mark("flip");
  if (bytes.length === 0) mark("nothing");
  if (how && num.value === 42) {
    seen42.value = new Set([...seen42.value, how]);
    const hashes = new Set([...seen42.value].map((e) => short(H(encodeNumber(42, e)))));
    if (hashes.size >= 2) mark("two");
  }
}
const flip = (bit: number) => change(flipBit(input.value, sel.value, bit), "bits");
function typed() {
  const bytes = typing.value === "hex" ? parseHex(draft.value) : textBytes(draft.value);
  if (bytes) change(bytes, "field");
}
function setTyping(how: "hex" | "text") {
  typing.value = how;
  draft.value = how === "hex" ? spaced(input.value) : new TextDecoder().decode(Uint8Array.from(input.value));
}
const load = (how: Encoding) => numOk.value && change(encodeNumber(num.value, how), "preset", how);
</script>

<template>
  <div class="widget hash-avalanche">
    <div class="readout" aria-live="polite">
      <div class="tile"><span class="tile-label">input</span><span class="tile-value">{{ input.length }} B</span></div>
      <div class="tile hash"><span class="tile-label">H(input) starts</span><span class="tile-value">{{ short(hash) }}</span></div>
      <div class="tile flips"><span class="tile-label">hash bits changed</span><span class="tile-value">{{ changed === null ? "—" : `${changed}/256` }}</span></div>
    </div>
    <p class="range">
      H(x) is Blake2b with a 32-byte output: any number of bytes in, always 32 bytes (256 bits) out. Tap a byte of the
      input, then one of its bits to flip it, and compare the hash before and after.
    </p>

    <div class="label"><span class="unit-tag bytes">bytes</span> input, {{ input.length }} {{ input.length === 1 ? "byte" : "bytes" }}<template v-if="loadedSay">: {{ num }} as {{ loadedSay }}</template></div>
    <div class="byte-row" aria-label="the input's bytes">
      <button v-for="(b, i) in input" :key="i" class="byte unit-byte" :class="{ on: sel === i }" :aria-pressed="sel === i"
        :aria-label="`byte ${i}: ${spaced([b])}`" @click="sel = i">{{ spaced([b]) }}</button>
      <span v-if="!input.length" class="none">no bytes at all</span>
    </div>
    <template v-if="input.length">
      <div class="label"><span class="unit-tag bits">bits</span> byte {{ sel }}'s 8 bits: tap one to flip it</div>
      <div class="bit-row">
        <button v-for="(d, k) in selBits" :key="k" class="bit unit-bit" :class="{ one: d === 1 }" :aria-pressed="d === 1"
          :aria-label="`byte ${sel}'s ${PLACES[k]}s bit`" @click="flip(k)">
          <span class="digit">{{ d }}</span><span class="place">{{ PLACES[k] }}</span>
        </button>
      </div>
    </template>
    <div class="controls">
      <button class="small" :class="{ chosen: typing === 'hex' }" :aria-pressed="typing === 'hex'" @click="setTyping('hex')">hex</button>
      <button class="small" :class="{ chosen: typing === 'text' }" :aria-pressed="typing === 'text'" @click="setTyping('text')">text</button>
      <input v-model="draft" class="field" :class="{ bad }" :aria-label="typing === 'hex' ? 'the input in hex' : 'the input as text'"
        :placeholder="typing === 'hex' ? 'c7 12' : 'type some text'" spellcheck="false" autocomplete="off" @input="typed" />
    </div>
    <p v-if="bad" class="note">Not whole bytes yet: two hex digits per byte.</p>
    <div class="controls">
      <button class="small" @click="change([], 'preset')">nothing</button>
      <button class="small" @click="change(START, 'preset')">ℰ₂(4,807) = c7 12</button>
      <button class="small" @click="change([...input, 0], 'preset')">+ byte</button>
      <button class="small" :disabled="!input.length" @click="change(input.slice(0, -1), 'preset')">− byte</button>
    </div>

    <div class="hashes">
      <div v-if="before" class="hash-block">
        <div class="label">H before the last change</div>
        <div class="hex"><div v-for="r in ROWS" :key="r" class="hex-row">{{ spaced(before.slice(r, r + 8)) }}</div></div>
      </div>
      <div class="hash-block">
        <div class="label">H(input) now<template v-if="before">: changed bytes marked</template></div>
        <div class="hex">
          <div v-for="r in ROWS" :key="r" class="hex-row">
            <span v-for="i in 8" :key="i" :class="{ diff: byteChanged(r + i - 1) }">{{ spaced([hash[r + i - 1]]) }}</span>
          </div>
        </div>
      </div>
    </div>
    <div class="label"><span class="unit-tag bits">bits</span> its 256 bits, 16 to a row<template v-if="flips">: the {{ changed }} that flipped are marked</template></div>
    <div class="grid" aria-hidden="true">
      <span v-for="(b, i) in bits" :key="i" class="cell" :class="{ flipped: flips?.[i] }">{{ b }}</span>
    </div>
    <p class="line">
      <template v-if="changed === null">Nothing changed yet. Flip a bit.</template>
      <template v-else-if="inputFlips === 1">One input bit flipped: {{ changed }} of 256 hash bits changed ({{ Math.round((changed / 256) * 100) }}%), scattered with no pattern.</template>
      <template v-else-if="inputFlips === 0">Same input, same hash: H always gives the same 32 bytes for the same bytes.</template>
      <template v-else-if="inputFlips === null">The length changed: {{ changed }} of 256 hash bits changed.</template>
      <template v-else>{{ inputFlips }} input bits changed: {{ changed }} of 256 hash bits changed.</template>
    </p>

    <div class="label">JAM hashes encodings, not numbers: one number, three ways to write it</div>
    <div class="controls">
      <input v-model.number="num" class="num" type="number" min="0" :max="MAX_NUMBER" aria-label="a number to encode" />
      <button v-for="e in ENCODINGS" :key="e.id" class="small" :class="{ chosen: loaded === e.id }" :aria-pressed="loaded === e.id"
        :disabled="!numOk" @click="load(e.id)">{{ e.say }}</button>
    </div>
    <table v-if="numOk" class="encodings">
      <thead><tr><th>encoding</th><th>its bytes</th><th>H starts</th></tr></thead>
      <tbody>
        <tr v-for="e in encoded" :key="e.id" :class="{ now: loaded === e.id }">
          <td>{{ e.say }}({{ num }})</td><td>{{ spaced(e.bytes) }}</td><td>{{ short(H(e.bytes)) }}</td>
        </tr>
      </tbody>
    </table>
    <p v-else class="note">A whole number from 0 to 4,294,967,295 (ℰ₄'s biggest).</p>
    <p class="line">Same number, different bytes, a different hash: two sides comparing hashes must encode the same way.</p>

    <ul class="goals">
      <li v-for="g in GOALS" :key="g.id" :class="{ done: reached.has(g.id) }">{{ reached.has(g.id) ? "✓" : "○" }} {{ g.say }}</li>
    </ul>
  </div>
</template>

<style scoped>
.tile.hash .tile-value { min-width: 9ch; }
.tile.flips .tile-value { min-width: 7ch; }
.range { font-size: 14px; color: var(--vp-c-text-2); margin: 0 0 12px; line-height: 1.5; }
.label { font-size: 13px; color: var(--vp-c-text-2); margin: 8px 0 4px; }
.byte-row { display: flex; flex-wrap: wrap; gap: 4px; min-height: 36px; align-items: center; }
.byte {
  min-width: 36px; min-height: 36px; padding: 0 4px; border: 1px solid var(--bit-top-line); border-radius: 4px;
  background: var(--bit-top); font-family: var(--vp-font-family-mono); font-size: 15px; cursor: pointer;
}
.byte.on { outline: 2px solid var(--vp-c-brand-1); outline-offset: 1px; font-weight: 700; }
.none { font-size: 14px; color: var(--vp-c-text-3); }
.bit-row { display: grid; grid-template-columns: repeat(8, minmax(0, 1fr)); gap: 4px; max-width: 420px; }
.bit {
  display: flex; flex-direction: column; align-items: center; min-width: 0; padding: 4px 0;
  border: 1px solid var(--vp-c-divider); border-radius: 6px; background: var(--vp-c-bg-soft);
  font-family: var(--vp-font-family-mono); cursor: pointer;
}
.bit.one { background: var(--unit-bits-soft); border-color: var(--unit-bits); }
.digit { font-size: 20px; font-weight: 600; }
.bit:not(.one) .digit { color: var(--vp-c-text-3); }
.place { font-size: 11px; color: var(--vp-c-text-2); }
.controls { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; margin: 8px 0; }
.controls .small { min-height: 32px; }
/* every button a finger can hit on a phone */
button.small { min-height: 36px; min-width: 36px; }
.controls button:disabled { opacity: 0.5; cursor: default; }
.field, .num {
  min-height: 32px; padding: 2px 8px; border: 1px solid var(--vp-c-divider); border-radius: 6px;
  font-family: var(--vp-font-family-mono); font-size: 14px; background: var(--vp-c-bg); color: var(--vp-c-text-1);
}
.field { flex: 1 1 160px; min-width: 0; }
.num { width: 9em; }
.field.bad { border-color: var(--vp-c-danger-1); }
.note { font-size: 13px; color: var(--vp-c-danger-1); margin: 0 0 8px; }
.hashes { display: flex; flex-wrap: wrap; gap: 4px 24px; }
.hex { font-family: var(--vp-font-family-mono); font-size: 14px; line-height: 1.6; }
.hex-row { display: flex; gap: 0.6ch; }
.hex .diff { background: var(--changed); border-radius: 2px; box-shadow: 0 0 0 1px var(--changed-line); }
.grid {
  display: grid; grid-template-columns: repeat(16, minmax(0, 1fr)); gap: 1px; max-width: 400px;
  font-family: var(--vp-font-family-mono); font-size: 11px; text-align: center;
}
.cell { padding: 1px 0; border: 1px solid var(--vp-c-divider); border-radius: 2px; color: var(--vp-c-text-3); }
.cell.flipped { background: var(--changed); border-color: var(--changed-line); color: var(--vp-c-text-1); font-weight: 700; }
.line { font-size: 14px; margin: 8px 0; line-height: 1.5; min-height: 3em; }
.encodings { font-family: var(--vp-font-family-mono); font-size: 13px; border-collapse: collapse; margin: 4px 0; display: table; }
.encodings th, .encodings td { padding: 3px 8px; border: 1px solid var(--vp-c-divider); text-align: left; overflow-wrap: anywhere; }
.encodings th { font-family: var(--vp-font-family-base); font-size: 12px; font-weight: 400; color: var(--vp-c-text-2); }
.encodings tr.now { background: var(--bit-top); }
.goals { list-style: none; padding: 0; margin: 12px 0 0; font-size: 14px; color: var(--vp-c-text-2); }
.goals li.done { color: var(--vp-c-green-1); }
@media (max-width: 640px) {
  .widget.hash-avalanche { padding: 12px; }
  .encodings th, .encodings td { padding: 3px 4px; font-size: 12px; }
}
</style>
