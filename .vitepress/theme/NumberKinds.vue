<!-- Lesson 1.2: one value as a number and as a bigint. Pick a value or nudge it, and see the
     number round above 2^53 while the bigint stays exact; then the lesson's third trap, all
     32 bits set read signed (−1) and unsigned (4294967295). Everything is computed in
     number-kinds.ts. -->
<script setup lang="ts">
import { computed, ref } from "vue";
import { asBigint, asNumber, bitsOf, exact, MAX_SAFE, NUDGES, PATTERNS, sameAsNumber, signed, unsigned, VALUES, wrongDigits } from "./number-kinds.ts";

const value = ref(VALUES[2].value); // 2^64 − 70, the gas amount the lesson turns on
const pattern = ref(PATTERNS[0].value);

const chosen = computed(() => VALUES.find((v) => v.value === value.value)?.name);
const digits = computed(() => [...asNumber(value.value)].map((d, i) => ({ d, wrong: wrongDigits(value.value)[i] })));
const same = computed(() => sameAsNumber(value.value, -70n));
const bits = computed(() => bitsOf(pattern.value));
const nudge = (by: bigint) => { if (value.value + by >= 0n) value.value = value.value + by; };
const label = (by: bigint) => `${by < 0n ? "−" : "+"}${by < 0n ? -by : by}`;
</script>

<template>
  <div class="widget number-kinds">
    <div class="readout" aria-live="polite">
      <div class="tile wide" :class="{ wrong: !exact(value) }">
        <span class="tile-label">as a number</span>
        <span class="tile-value"><span v-for="(x, i) in digits" :key="i" :class="{ off: x.wrong }">{{ x.d }}</span></span>
      </div>
      <div class="tile wide"><span class="tile-label">as a bigint</span><span class="tile-value">{{ asBigint(value) }}</span></div>
      <div class="tile"><span class="tile-label">a number is exact here</span><span class="tile-value">{{ exact(value) ? "yes" : "no" }}</span></div>
      <div class="tile" :class="{ wrong: same }"><span class="tile-label">=== 70 below, as numbers</span><span class="tile-value">{{ same }}</span></div>
    </div>
    <p class="line">
      <template v-if="exact(value)">Up to 2^53 − 1 = {{ MAX_SAFE.toLocaleString("en-US") }}, a number holds every whole number exactly. Nudge past it.</template>
      <template v-else>Above 2^53 − 1 a number rounds, and says nothing: the <span class="bug">red digits</span> are where it stopped being the value. The bigint has every digit.</template>
    </p>
    <div class="controls" role="group" aria-label="a value">
      <button v-for="v in VALUES" :key="v.name" class="small" :class="{ chosen: chosen === v.name }" :aria-pressed="chosen === v.name" @click="value = v.value">{{ v.name }}</button>
    </div>
    <div class="controls" role="group" aria-label="nudge the value">
      <button v-for="n in NUDGES" :key="`${n}`" class="small" :disabled="value + n < 0n" @click="nudge(n)">{{ label(n) }}</button>
    </div>

    <p class="trap">The third trap: <code>|</code>, <code>&amp;</code>, <code>^</code>, <code>&lt;&lt;</code> and <code>&gt;&gt;</code> read a number as a <em>signed</em> 32-bit integer, its top bit worth −2^31.</p>
    <div class="controls" role="group" aria-label="a 32-bit pattern">
      <button v-for="p in PATTERNS" :key="p.name" class="small" :class="{ chosen: pattern === p.value }" :aria-pressed="pattern === p.value" @click="pattern = p.value">{{ p.name }}</button>
    </div>
    <div class="bit-row" aria-label="the 32 bits, most significant first">
      <span v-for="(b, i) in bits" :key="i" class="unit-bit" :class="{ top: i === 0, one: b === '1' }" :title="i === 0 ? 'worth −2^31 when signed' : ''">{{ b }}</span>
    </div>
    <dl class="answers">
      <dt><code>x | 0</code>, signed</dt><dd>{{ signed(pattern).toLocaleString("en-US") }}</dd>
      <dt><code>x &gt;&gt;&gt; 0</code>, unsigned</dt><dd>{{ unsigned(pattern).toLocaleString("en-US") }}</dd>
    </dl>
  </div>
</template>

<style scoped>
.tile.wide .tile-value { font-size: 16px; min-width: 22ch; }
.tile .tile-value { min-width: 5ch; }
/* a number's rounding is a change nobody asked for: red, as a tap's change is elsewhere (custom.css) */
.tile.wrong { background: var(--changed); border-color: var(--changed-line); }
.off, .bug { color: var(--changed-line); font-weight: 700; }
.line { margin: 8px 0; font-size: 14px; line-height: 1.6; min-height: 3.2em; }
.controls { display: flex; flex-wrap: wrap; gap: 6px; margin: 0 0 8px; }
.controls button.small { min-height: 32px; }
.trap { margin: 14px 0 8px; font-size: 14px; line-height: 1.6; }
.bit-row { display: flex; flex-wrap: wrap; gap: 2px; margin: 4px 0 8px; font-family: var(--vp-font-family-mono); font-size: 13px; }
.bit-row span { min-width: 1.4em; text-align: center; padding: 2px 0; border: 1px solid var(--vp-c-divider); border-radius: 3px; opacity: 0.6; }
.bit-row span.one { opacity: 1; background: var(--bit-top, var(--vp-c-bg-soft)); }
.bit-row span.top { border-color: var(--changed-line); border-width: 2px; }
.answers dd { font-size: 18px; }
</style>
