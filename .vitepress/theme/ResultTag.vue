<!-- Lesson 3.2: a work result is output bytes or one of six errors, and Appendix C's O says
     which with a tag in front. Pick a case, grow the output, decode some bytes; then the
     digest's five load numbers as compact naturals, whose bytes grow with them. -->
<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { toHex } from "./bytes.ts";
import { compact } from "./compact.ts";
import type { Decoded } from "./work-result.ts";
import { CASE_NAMES, decodeResult, encodeResult, ERRORS, jsonOf, LOAD, parseHex, resultOf, stopIndex, stops } from "./work-result.ts";

const GOALS = [
  { id: "one", say: "make a result that is just one byte" },
  { id: "three", say: "make an ok result that is 3 bytes in all" },
  { id: "gas", say: "make gas used take 3 bytes" },
];
const START = [0xaa, 0xbb, 0xcc]; // the lesson's test, and work_result_0's output
const SAMPLES = [
  { hex: "0x0003aabbcc", say: "the lesson's ok" },
  { hex: "0x020000000000", say: "work_result_1's result and load" },
  { hex: "0x07", say: "a tag past 6" },
  { hex: "0x0003aabb", say: "cut short" },
];
const hex2 = (b: number) => b.toString(16).padStart(2, "0");

const tag = ref(0);
const output = ref<number[]>([...START]);
const result = computed(() => resultOf(tag.value, output.value));
const encoded = computed(() => encodeResult(result.value));
const code = computed(() => ("ok" in result.value ? `{ ok: 0x${output.value.map(hex2).join("")} }` : `{ error: "${ERRORS[tag.value - 1]}" }`));

/** The output's cells, shortened past 12 bytes: the first 8, how many are hidden, the last 2. */
const outputCells = computed(() => {
  const o = encoded.value.output;
  return o.length <= 12 ? o.map(hex2) : [...o.slice(0, 8).map(hex2), `+${o.length - 10}`, ...o.slice(-2).map(hex2)];
});
function grow(n: number) {
  const o = [...output.value];
  for (let i = 0; i < n; i++) o.push((0xaa + 0x11 * o.length) & 0xff); // aa bb cc dd ee ff 10 …
  output.value = o.slice(0, 300);
}
const shrink = () => { output.value = output.value.slice(0, -1); };

// decoding: bytes in, the case out
const typed = ref("0x0003aabbcc");
const typedBytes = computed(() => parseHex(typed.value));
const last = ref<{ text: string; d: Decoded } | null>(null);
const decoded = computed(() => (last.value?.text === typed.value ? last.value.d : null)); // gone once the bytes change
function decodeTyped() { if (typedBytes.value) last.value = { text: typed.value, d: decodeResult(typedBytes.value) }; }
function decodeThis(hex: string) { typed.value = hex; decodeTyped(); }

// the load: five compact naturals; both vectors' digests have all zeros
const texts = ref(LOAD.map(() => "0"));
const lists = LOAD.map((f) => stops(f.max));
const values = computed(() => texts.value.map((t, i) => (/^\d+$/.test(t.trim()) && BigInt(t.trim()) <= LOAD[i].max ? BigInt(t.trim()) : null)));
const sizes = computed(() => values.value.map((x) => (x === null ? null : compact(x).bytes)));
const loadTotal = computed(() => (sizes.value.every((s) => s) ? sizes.value.reduce((n, s) => n + s!.length, 0) : null));
const slide = (i: number, e: Event) => { texts.value[i] = String(lists[i][Number((e.target as HTMLInputElement).value)]); };

const reached = ref(new Set<string>());
const mark = (id: string) => { reached.value = new Set([...reached.value, id]); };
// a goal counts when the reader's own change brings it about
watch(() => encoded.value.bytes.length, (n) => {
  if (n === 1) mark("one");
  if (tag.value === 0 && n === 3) mark("three");
});
watch(() => sizes.value[0]?.length, (n) => { if (n === 3) mark("gas"); });
</script>

<template>
  <div class="widget result-tag">
    <div class="readout" aria-live="polite">
      <div class="tile"><span class="tile-label">case</span><span class="tile-value case">{{ CASE_NAMES[tag] }}</span></div>
      <div class="tile"><span class="tile-label">tag byte</span><span class="tile-value bytes">{{ toHex(encoded.tag) }}</span></div>
      <div class="tile"><span class="tile-label">result bytes</span><span class="tile-value">{{ encoded.bytes.length }}</span></div>
      <div class="tile"><span class="tile-label">load bytes</span><span class="tile-value">{{ loadTotal ?? "?" }}</span></div>
    </div>
    <p class="range">
      A result is output or one of six errors, and its first byte, the tag, says which: tag 0, then the output's length
      as a compact natural, then the output; or just the error's tag, 1 to 6, one byte and nothing after it.
    </p>

    <div class="controls" role="group" aria-label="the case">
      <button
        v-for="(name, t) in CASE_NAMES" :key="t" class="small" :class="{ chosen: t === tag }" :aria-pressed="t === tag"
        @click="tag = t"
      >{{ t }} {{ name }}</button>
    </div>
    <div v-if="tag === 0" class="controls">
      <span class="label">output: {{ output.length }} byte{{ output.length === 1 ? "" : "s" }}</span>
      <button class="small" :disabled="!output.length" @click="shrink">− byte</button>
      <button class="small" @click="grow(1)">+ byte</button>
      <button class="small" @click="grow(16)">+ 16 bytes</button>
      <button class="small" @click="output = [...START]">aa bb cc</button>
    </div>

    <div class="label"><span class="unit-tag bytes">bytes</span> O(result), {{ encoded.bytes.length }} byte{{ encoded.bytes.length === 1 ? "" : "s" }}</div>
    <div class="cells">
      <span class="cell unit-byte tag">{{ hex2(encoded.tag[0]) }}</span>
      <span v-for="(b, i) in encoded.length" :key="`l${i}`" class="cell unit-byte length">{{ hex2(b) }}</span>
      <span v-for="(c, i) in outputCells" :key="`o${i}`" class="cell unit-byte output" :class="{ more: c.startsWith('+') }">{{ c }}</span>
    </div>
    <p class="key">
      <span class="swatch tag"></span> tag
      <template v-if="tag === 0">
        <span class="swatch length"></span> length {{ output.length }}, {{ encoded.length.length }} byte{{ encoded.length.length === 1 ? "" : "s" }}
        <span class="swatch output"></span> output
      </template>
    </p>
    <p class="note">In the code: <code>{{ code.length > 40 ? `${code.slice(0, 36)}… }` : code }}</code>. In the vectors' JSON: <code>{{ jsonOf(result).length > 40 ? `${jsonOf(result).slice(0, 36)}…"}` : jsonOf(result) }}</code>.</p>

    <h4>Decode: read the tag, then what it says follows</h4>
    <div class="controls">
      <input v-model="typed" spellcheck="false" aria-label="bytes to decode, in hex" />
      <button class="small" :disabled="!typedBytes" @click="decodeTyped">decode</button>
      <button class="small" @click="decodeThis(toHex(encoded.bytes))">decode the bytes above</button>
    </div>
    <div class="controls">
      <button v-for="s in SAMPLES" :key="s.hex" class="small sample" @click="decodeThis(s.hex)">{{ s.hex }}<small>{{ s.say }}</small></button>
    </div>
    <p v-if="!typedBytes" class="error">Hex, two digits a byte: 0x0003aabbcc.</p>
    <dl v-else-if="decoded" class="answers" aria-live="polite">
      <template v-if="decoded.ok">
        <dt>tag</dt><dd>{{ decoded.tag }}: {{ CASE_NAMES[decoded.tag] }}</dd>
        <dt v-if="'ok' in decoded.result">output</dt>
        <dd v-if="'ok' in decoded.result" class="long">{{ decoded.result.ok.length }} bytes: <span class="bytes">{{ toHex(decoded.result.ok.slice(0, 16)) }}{{ decoded.result.ok.length > 16 ? "…" : "" }}</span></dd>
        <dt>used</dt><dd class="long">{{ decoded.used }} byte{{ decoded.used === 1 ? "" : "s" }}{{ decoded.tag ? ", the tag alone" : ": tag, length, output" }}</dd>
        <dt v-if="decoded.rest">left</dt>
        <dd v-if="decoded.rest" class="long">{{ decoded.rest }} byte{{ decoded.rest === 1 ? "" : "s" }}: not the result's, but whatever comes next (in a digest, the load)</dd>
      </template>
      <template v-else>
        <dt>no result</dt><dd class="long">{{ decoded.why }}</dd>
      </template>
    </dl>

    <h4>The load: five compact naturals</h4>
    <p class="range">
      Every validator reads every digest, so these are written in as few bytes as they need: under 128 one byte, under
      16,384 two, under 2^21 three (lesson 2.2's rule). Both vectors' digests load all zeros: five bytes in all.
    </p>
    <div v-for="(f, i) in LOAD" :key="f.field" class="load">
      <div class="label"><code>{{ f.field }}</code>, {{ f.say }}</div>
      <div class="controls">
        <input
          type="range" min="0" :max="lists[i].length - 1" :value="stopIndex(lists[i], values[i] ?? 0n)"
          :aria-label="`${f.say}: jump between sizes`" @input="slide(i, $event)"
        />
        <input v-model="texts[i]" class="number" inputmode="numeric" spellcheck="false" :aria-label="f.say" />
      </div>
      <div v-if="sizes[i]" class="cells">
        <span v-for="(b, j) in sizes[i]" :key="j" class="cell unit-byte" :class="j ? 'output' : 'tag'">{{ hex2(b) }}</span>
        <span class="count">{{ sizes[i]!.length }} byte{{ sizes[i]!.length === 1 ? "" : "s" }}</span>
      </div>
      <p v-else class="error">A whole number from 0 to {{ f.max }}.</p>
    </div>

    <ul class="goals">
      <li v-for="g in GOALS" :key="g.id" :class="{ done: reached.has(g.id) }">{{ reached.has(g.id) ? "✓" : "○" }} <UnitText :text="g.say" /></li>
    </ul>
  </div>
</template>

<style scoped>
.range { font-size: 14px; color: var(--vp-c-text-2); margin: 0 0 12px; line-height: 1.5; }
.tile-value.case { min-width: 11ch; }
.controls { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; margin-bottom: 8px; }
.controls .small { min-height: 32px; }
.controls input:not([type="range"]) {
  flex: 1 1 14ch; min-width: 0; max-width: 100%; min-height: 32px; padding: 2px 8px; border: 1px solid var(--vp-c-divider);
  border-radius: 6px; font-family: var(--vp-font-family-mono); font-size: 15px;
}
.controls input.number { flex: 0 1 22ch; }
.controls input[type="range"] { flex: 1 1 120px; min-width: 0; height: 32px; }
.sample { display: inline-flex; flex-direction: column; align-items: flex-start; line-height: 1.25; padding: 4px 10px; }
.sample small { font-size: 11px; color: var(--vp-c-text-2); font-family: var(--vp-font-family-base); }
.label { font-size: 13px; color: var(--vp-c-text-2); }
.cells { display: flex; flex-wrap: wrap; align-items: center; gap: 4px; margin: 4px 0; }
.cell {
  min-width: 30px; padding: 0 4px; text-align: center; font-family: var(--vp-font-family-mono); font-size: 15px;
  line-height: 28px; border: 2px solid; border-radius: 4px;
}
.cell.tag, .swatch.tag { background: var(--bit-mark); border-color: var(--bit-mark-line); }
.cell.length, .swatch.length { background: var(--bit-top); border-color: var(--bit-top-line); }
.cell.output, .swatch.output { background: var(--bit-low); border-color: var(--bit-low-line); }
.cell.more { border-style: dashed; font-size: 12px; }
.count { font-size: 13px; color: var(--vp-c-text-2); margin-left: 4px; }
.key { font-size: 13px; color: var(--vp-c-text-2); margin: 4px 0; }
.swatch { display: inline-block; width: 12px; height: 12px; border: 2px solid; border-radius: 3px; vertical-align: middle; margin-left: 8px; }
.swatch:first-child { margin-left: 0; }
.note { font-size: 13px; color: var(--vp-c-text-2); margin: 4px 0 0; overflow-wrap: anywhere; }
h4 { margin: 20px 0 8px; font-size: 15px; }
.load { margin-bottom: 8px; }
.error { color: var(--vp-c-danger-1); font-size: 14px; margin: 4px 0; }
.goals { list-style: none; padding: 0; margin: 12px 0 0; font-size: 14px; color: var(--vp-c-text-2); }
.goals li.done { color: var(--vp-c-green-1); }
@media (max-width: 640px) {
  .widget.result-tag { padding: 12px; }
  .cell { min-width: 28px; font-size: 14px; }
}
</style>
