<!-- Lesson 6.2: the three recipes C that make every 31-byte state key. Pick one, type i, a
     service id s or the hash's bytes, and see each byte of the key coloured by where it came
     from: i, ℰ₄(s)'s bytes n₀ to n₃, the hash's bytes a₀ to a₂₆, or a zero. -->
<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { encodeFixed, toHex } from "./bytes.ts";
import { accountKey, bytesOf, COMPONENTS, componentKey, HASH_BYTES_USED, LESSON_HASH, padHash, parseHashBytes, parseNumber, wovenKey } from "./state-keys.ts";
import type { Cell } from "./state-keys.ts";

type Recipe = "C(i)" | "C(255, s)" | "C(s, h)";
const RECIPES: Recipe[] = ["C(i)", "C(255, s)", "C(s, h)"];
const MAX_SERVICE = 2 ** 32 - 1;
const PER_ROW = 8;
const GOALS = [
  { id: "time", say: "τ's key, C(11): 0b and 30 zeros" },
  { id: "account", say: "service 0x04030201's account: ff 01 00 02 00 03 00 04 00, then zeros" },
  { id: "zero", say: "service 0's account: ff and 30 zeros, the key a component 255 would have" },
  { id: "weave", say: "weave another service into the same hash: only bytes 0, 2, 4 and 6 change" },
];
const SUB = "₀₁₂₃₄₅₆₇₈₉";
const sub = (n: number) => [...String(n)].map((d) => SUB[Number(d)]).join("");

const recipe = ref<Recipe>("C(i)");
const iText = ref("1");
const sText = ref("1");
const hashText = ref(LESSON_HASH);
const reached = ref(new Set<string>());

const i = computed(() => parseNumber(iText.value, 255));
const s = computed(() => parseNumber(sText.value, MAX_SERVICE));
const typed = computed(() => parseHashBytes(hashText.value));
const n = computed(() => (s.value === null ? [] : encodeFixed(BigInt(s.value), 4)));
const key = computed<Cell[] | null>(() => {
  if (recipe.value === "C(i)") return i.value === null ? null : componentKey(i.value);
  if (s.value === null) return null;
  if (recipe.value === "C(255, s)") return accountKey(s.value);
  return typed.value === null ? null : wovenKey(s.value, padHash(typed.value));
});
const hex = computed(() => (key.value === null ? "?" : toHex(bytesOf(key.value))));
const rowsOf = (cells: Cell[]) => Array.from({ length: Math.ceil(cells.length / PER_ROW) }, (_, r) => cells.slice(r * PER_ROW, (r + 1) * PER_ROW));
const spaced = (bytes: number[]) => bytes.map((b) => toHex([b]).slice(2)).join(" ");

const named = computed(() => {
  if (recipe.value === "C(i)") return i.value === null ? "" : `C(${i.value}): ${COMPONENTS[i.value] || "no component has this number"}`;
  if (s.value === null) return "";
  return recipe.value === "C(255, s)" ? `C(255, ${s.value}): service ${s.value}'s account` : `C(${s.value}, h): something service ${s.value} keeps`;
});
const labelOf = (c: Cell) =>
  c.from.kind === "lead" ? (recipe.value === "C(i)" ? "i" : "255") : c.from.kind === "zero" ? "0" : `${c.from.kind}${sub(c.from.index)}`;

function newHash() {
  hashText.value = spaced(Array.from({ length: HASH_BYTES_USED }, () => Math.floor(Math.random() * 256)));
}

// a goal counts when the reader's own change brings it about
watch([recipe, hex, s, typed], ([r, h, sv, a], [, hBefore, sBefore, aBefore]) => {
  const mark = (id: string) => { reached.value = new Set([...reached.value, id]); };
  if (h === hBefore || key.value === null) return;
  if (r === "C(i)" && i.value === 11) mark("time");
  if (h === toHex(bytesOf(accountKey(0x04030201))) && r === "C(255, s)") mark("account");
  if (r === "C(255, s)" && sv === 0) mark("zero");
  if (r === "C(s, h)" && sv !== sBefore && sBefore !== null && JSON.stringify(a) === JSON.stringify(aBefore)) mark("weave");
});
</script>

<template>
  <div class="widget state-key-weave">
    <dl class="answers" aria-live="polite">
      <dt>recipe</dt><dd class="long">{{ named || "?" }}</dd>
      <dt>the key</dt><dd class="long">{{ hex }}</dd>
    </dl>
    <p class="range">
      Every key is 31 bytes. Each byte below says where it came from: <span class="tag lead">i</span> the component's
      number (255 for an account), <span class="tag n">n₀</span> to n₃ the four bytes of ℰ₄(s), smallest first,
      <span class="tag a">a₀</span> to a₂₆ the hash's bytes, and <span class="tag zero">0</span> a zero the recipe puts there.
    </p>
    <div class="controls" role="group" aria-label="recipe">
      <button v-for="r in RECIPES" :key="r" class="small" :class="{ chosen: r === recipe }" :aria-pressed="r === recipe" @click="recipe = r">{{ r }}</button>
    </div>
    <div class="inputs">
      <label v-if="recipe === 'C(i)'">i = <input v-model="iText" inputmode="numeric" spellcheck="false" class="short" aria-label="i, 0 to 255" /></label>
      <template v-else>
        <label>s = <input v-model="sText" spellcheck="false" autocapitalize="off" class="mid" aria-label="the service id s" /></label>
        <span v-if="s !== null" class="note">ℰ₄(s) = {{ spaced(n) }}</span>
      </template>
      <template v-if="recipe === 'C(s, h)'">
        <label class="hash">H(h) =
          <textarea v-model="hashText" rows="2" spellcheck="false" autocapitalize="off" aria-label="the hash's first 27 bytes, in hex" /></label>
        <span class="buttons">
          <button class="small" @click="hashText = LESSON_HASH; sText = '0'">6.1's first woven key</button>
          <button class="small" @click="newHash">a new hash</button>
        </span>
        <p class="note">
          H(h) is h's 32-byte Blake2b hash, which this page doesn't compute: the bytes above stand for it. The key uses
          its first 27.<template v-if="typed !== null && typed.length < HASH_BYTES_USED"> You typed {{ typed.length }};
          the other {{ HASH_BYTES_USED - typed.length }} are taken as 00 here.</template>
        </p>
      </template>
    </div>
    <p v-if="key === null" class="error">
      {{ recipe === "C(i)" ? "i is one byte: a whole number from 0 to 255."
        : s === null ? "s is a service id: a whole number from 0 to 4,294,967,295, or 0x and up to 8 hex digits."
        : "The hash is hex: two digits a byte, at most 27 bytes." }}
    </p>
    <div v-else class="key" role="list" aria-label="the key's 31 bytes">
      <div v-for="(row, r) in rowsOf(key)" :key="r" class="row">
        <div v-for="(c, k) in row" :key="k" class="cell" :class="c.from.kind" role="listitem"
          :aria-label="`byte ${r * PER_ROW + k}: ${toHex([c.byte]).slice(2)}, from ${labelOf(c)}`">
          <small class="at">{{ r * PER_ROW + k }}</small>
          <b>{{ toHex([c.byte]).slice(2) }}</b>
          <small class="from">{{ labelOf(c) }}</small>
        </div>
      </div>
    </div>
    <ul class="goals">
      <li v-for="g in GOALS" :key="g.id" :class="{ done: reached.has(g.id) }">{{ reached.has(g.id) ? "✓" : "○" }} {{ g.say }}</li>
    </ul>
  </div>
</template>

<style scoped>
.range { font-size: 14px; color: var(--vp-c-text-2); margin: 0 0 12px; line-height: 1.7; }
.controls { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 8px; }
.controls button { min-height: 32px; }
.inputs { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 12px; font-family: var(--vp-font-family-mono); }
.inputs input, .inputs textarea {
  min-height: 32px; padding: 2px 8px; border: 1px solid var(--vp-c-divider); border-radius: 6px;
  font-family: inherit; font-size: 15px;
}
.inputs input.short { width: 6ch; }
.inputs input.mid { width: 14ch; }
.hash { display: flex; align-items: flex-start; gap: 8px; width: 100%; }
.hash textarea { flex: 1; min-width: 0; font-size: 13px; resize: vertical; }
.buttons { display: flex; gap: 6px; flex-wrap: wrap; }
.buttons button { min-height: 32px; }
.note { font-size: 13px; color: var(--vp-c-text-2); font-family: var(--vp-font-family-base); margin: 0; }
.error { color: var(--vp-c-danger-1); font-size: 14px; }
.key { margin: 12px 0 4px; }
.row { display: grid; grid-template-columns: repeat(8, minmax(0, 1fr)); gap: 3px; margin-bottom: 3px; max-width: 420px; }
.cell {
  display: flex; flex-direction: column; align-items: center; padding: 2px 0;
  border: 1.5px solid var(--vp-c-divider); border-radius: 4px; font-family: var(--vp-font-family-mono);
}
.cell b { font-size: 16px; line-height: 1.3; }
.cell small { font-size: 10px; color: var(--vp-c-text-2); line-height: 1.2; }
.cell.lead, .tag.lead { background: var(--bit-mark); border-color: var(--bit-mark-line); }
.cell.n, .tag.n { background: var(--bit-top); border-color: var(--bit-top-line); }
.cell.a, .tag.a { background: var(--bit-low); border-color: var(--bit-low-line); }
.cell.zero b { color: var(--vp-c-text-3); font-weight: 400; }
.tag { font-family: var(--vp-font-family-mono); padding: 0 4px; border: 1.5px solid var(--vp-c-divider); border-radius: 4px; }
.goals { list-style: none; padding: 0; margin: 12px 0 0; font-size: 14px; color: var(--vp-c-text-2); }
.goals li.done { color: var(--vp-c-green-1); }
@media (max-width: 640px) {
  .cell b { font-size: 14px; }
}
</style>
