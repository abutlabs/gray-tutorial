<!-- Lesson 2.1: ℰ_l, x in exactly l bytes, smallest first. Type x and pick l; see the
     Gray Paper's recursion step by step, and the same bytes as the number reads and as JAM
     writes them. -->
<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { encodeFixed, fixedSteps, leftOver, toHex } from "./bytes.ts";

const WIDTHS = [{ l: 1, name: "u8" }, { l: 2, name: "u16" }, { l: 4, name: "u32" }, { l: 8, name: "u64" }];
const GOALS = [
  { x: "1", l: 4, say: "a timeslot of 1, as a u32: 01 00 00 00" },
  { x: "256", l: 2, say: "256 in two bytes: 00 01" },
  { x: "65535", l: 2, say: "the biggest u16: ff ff" },
];
const MAX = (1n << 64n) - 1n;
const fmt = (n: bigint | number) => n.toLocaleString("en-US");

const text = ref("4807");
const l = ref(2);
const reached = ref(new Set<string>());
const x = computed(() => (/^\d+$/.test(text.value.trim()) && BigInt(text.value) <= MAX ? BigInt(text.value) : null));
const steps = computed(() => (x.value === null ? [] : fixedSteps(x.value, l.value)));
const bytes = computed(() => (x.value === null ? [] : encodeFixed(x.value, l.value)));
const dropped = computed(() => (x.value === null ? 0n : leftOver(x.value, l.value)));
const weight = (i: number) => fmt(256n ** BigInt(i));
const sum = computed(() => bytes.value.map((b, i) => ({ b, i })).filter(({ b }) => b > 0).reverse());
const readsAs = computed(() => (x.value === null ? "" : `0x${x.value.toString(16).padStart(2 * l.value, "0")}`));

// a goal counts once x and l match it, however the reader got there
watch([x, l], ([nowX, nowL]) => {
  const key = `${nowX}/${nowL}`;
  if (GOALS.some((g) => `${g.x}/${g.l}` === key)) reached.value = new Set([...reached.value, key]);
});
/** A byte's own colour, the same in both rows, so the eye can follow it across. */
const hue = (i: number) => ({ "--hue": String((i * 67 + 140) % 360) });
</script>

<template>
  <div class="widget fixed-width">
    <!-- one answer per row, label then value, so no answer moves when another grows -->
    <dl class="answers" aria-live="polite">
      <dt>x</dt><dd>{{ x === null ? "?" : fmt(x) }}</dd>
      <dt>as the number reads</dt><dd>{{ readsAs }}</dd>
      <dt>ℰ{{ "₀₁₂₃₄₅₆₇₈"[l] }}(x), as JAM writes</dt><dd>{{ toHex(bytes) }}</dd>
    </dl>
    <p class="range">
      {{ l }} byte{{ l === 1 ? "" : "s" }}: {{ 8 * l }} bits, 0 to {{ fmt(256n ** BigInt(l) - 1n) }}. Each byte counts 256
      times the one before it, as each decimal digit counts 10 times.
    </p>
    <div class="controls">
      <label>x = <input v-model="text" inputmode="numeric" spellcheck="false" aria-label="x" /></label>
      <button v-for="w in WIDTHS" :key="w.l" class="small" :class="{ chosen: w.l === l }" @click="l = w.l">
        ℰ{{ "₀₁₂₃₄₅₆₇₈"[w.l] }}, {{ w.name }}
      </button>
    </div>
    <p v-if="x === null" class="error">x is a whole number from 0 to 2^64 − 1.</p>
    <template v-else>
      <div class="label"><span class="unit-tag bytes">bytes</span> x, biggest byte first, as the number reads</div>
      <div class="byte-row">
        <div v-for="i in [...bytes.keys()].reverse()" :key="i" class="byte unit-byte" :style="hue(i)"><b>{{ toHex([bytes[i]]).slice(2) }}</b><small>{{ bytes[i] }} × {{ weight(i) }}</small></div>
      </div>
      <div class="label"><span class="unit-tag bytes">bytes</span> ℰ{{ "₀₁₂₃₄₅₆₇₈"[l] }}(x), smallest byte first, as JAM writes</div>
      <div class="byte-row">
        <div v-for="(b, i) in bytes" :key="i" class="byte unit-byte" :style="hue(i)"><b>{{ toHex([b]).slice(2) }}</b><small>{{ b }} × {{ weight(i) }}</small></div>
      </div>
      <p class="line">
        {{ sum.length ? sum.map(({ b, i }) => `${b} × ${weight(i)}`).join(" + ") : "0" }}
        = {{ fmt(x - dropped * 256n ** BigInt(l)) }}
      </p>
      <ol class="steps">
        <li v-for="(s, i) in steps" :key="i">
          {{ fmt(s.rest) }} mod 256 = {{ s.byte }} → <b>{{ toHex([s.byte]).slice(2) }}</b>; pass on ⌊{{ fmt(s.rest) }} / 256⌋ = {{ fmt(s.rest >> 8n) }}
        </li>
        <li v-if="dropped === 0n">no bytes left: ℰ₀ is no bytes at all. Done.</li>
      </ol>
      <p v-if="dropped > 0n" class="error">
        {{ fmt(x) }} doesn't fit in {{ l }} byte{{ l === 1 ? "" : "s" }}: ℰ{{ "₀₁₂₃₄₅₆₇₈"[l] }} only takes numbers below
        {{ fmt(256n ** BigInt(l)) }}. The loop writes the low {{ l }} and silently drops the {{ fmt(dropped) }} left over.
      </p>
    </template>
    <ul class="goals">
      <li v-for="g in GOALS" :key="g.say" :class="{ done: reached.has(`${g.x}/${g.l}`) }">
        {{ reached.has(`${g.x}/${g.l}`) ? "✓" : "○" }} {{ g.say }}
      </li>
    </ul>
  </div>
</template>

<style scoped>
.range { font-size: 14px; color: var(--vp-c-text-2); margin: 0 0 12px; line-height: 1.5; }
.controls { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; font-family: var(--vp-font-family-mono); }
.controls input {
  width: 22ch; padding: 2px 8px; border: 1px solid var(--vp-c-divider); border-radius: 6px;
  font-family: inherit; font-size: 15px;
}
.label { font-size: 13px; color: var(--vp-c-text-2); margin-top: 12px; }
.byte-row { display: flex; gap: 6px; flex-wrap: wrap; margin: 4px 0; }
.byte {
  display: flex; flex-direction: column; align-items: center; min-width: 64px; padding: 4px 8px;
  border: 2px solid var(--vp-c-text-1); border-radius: 4px; font-family: var(--vp-font-family-mono);
  background: hsl(var(--hue) 70% 92%);
}
:global(.dark) .byte { background: hsl(var(--hue) 35% 22%); }
.byte b { font-size: 18px; }
.byte small { font-size: 11px; color: var(--vp-c-text-2); }
.line, .steps { font-family: var(--vp-font-family-mono); font-size: 14px; }
.line { margin: 8px 0; }
.steps { margin: 4px 0 8px; padding-left: 24px; line-height: 1.8; }
.error { color: var(--vp-c-danger-1); font-size: 14px; }
.goals { list-style: none; padding: 0; margin: 12px 0 0; font-size: 14px; color: var(--vp-c-text-2); }
.goals li.done { color: var(--vp-c-green-1); }
</style>
