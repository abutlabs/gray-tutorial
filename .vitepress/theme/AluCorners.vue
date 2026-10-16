<!-- Lesson 15.5: pick an operation and two inputs, signed or unsigned, and see the result's
     64 bits with the sign bit marked, as hex and as a signed number; for a 32-bit form, the
     low 32 bits before and after sign-extension. The run's nine corners are presets.
     Computed in alu-corners.ts. -->
<script setup lang="ts">
import { computed, ref } from "vue";
import { asSigned, bits64, CASES, hex64, is32, NAMES, OPERATIONS, parse } from "./alu-corners.ts";

const name = ref(CASES[3].name);
const p = ref(CASES[3].r0);
const q = ref(CASES[3].r1);
const typedP = ref("-7");
const typedQ = ref("2");
const result = computed(() => OPERATIONS[name.value](p.value, q.value));
const bits = computed(() => bits64(result.value));
const low32 = computed(() => (p.value + q.value) & 0xffffffffn);
const set = (which: "p" | "q", text: string) => { const v = parse(text); if (v !== null) (which === "p" ? p : q).value = v; };
const pick = (c: typeof CASES[number]) => { name.value = c.name; p.value = c.r0; q.value = c.r1; typedP.value = asSigned(c.r0).toString(); typedQ.value = asSigned(c.r1).toString(); };
const fmt = (x: bigint) => x.toLocaleString("en-US");
</script>

<template>
  <div class="widget alu-corners">
    <div class="readout" aria-live="polite">
      <div class="tile"><span class="tile-label">{{ name }}</span><span class="tile-value small">{{ fmt(asSigned(p)) }}, {{ fmt(asSigned(q)) }}</span></div>
      <div class="tile wide"><span class="tile-label">result, 64 bits</span><span class="tile-value hash">{{ hex64(result) }}</span></div>
      <div class="tile"><span class="tile-label">as a signed number</span><span class="tile-value small">{{ fmt(asSigned(result)) }}</span></div>
      <div class="tile"><span class="tile-label">unsigned</span><span class="tile-value small">{{ fmt(result) }}</span></div>
    </div>
    <p class="line">
      <template v-if="is32(name)">A 32-bit form: the low 32 bits of the sum are 0x{{ low32.toString(16).padStart(8, "0") }}; their top bit is {{ (low32 >> 31n) === 1n ? "1, so sign-extending fills the 32 bits above with ff" : "0, so the 32 bits above stay 00" }}.</template>
      <template v-else-if="name.startsWith('div') && q === 0n">Division by zero doesn't crash: the answer is all ones, 2^64 − 1.</template>
      <template v-else-if="name === 'div_s_64'">Signed division rounds towards zero{{ p === 2n ** 63n && q === 2n ** 64n - 1n ? "; −2^63 ÷ −1 would be 2^63, which doesn't fit, so the answer is −2^63 itself" : "" }}.</template>
      <template v-else-if="name === 'rem_s_64'">The remainder keeps the dividend's sign: {{ fmt(asSigned(p)) }} = {{ fmt(asSigned(q)) }} × {{ q === 0n ? "?" : fmt(asSigned(OPERATIONS.div_s_64(p, q))) }} + {{ fmt(asSigned(result)) }}.</template>
      <template v-else-if="name === 'shar_r_64'">An arithmetic shift keeps the sign: the top bit is copied in from the left.</template>
      <template v-else-if="name === 'shlo_r_64'">A logical shift fills with zeros from the left, whatever the sign was.</template>
      <template v-else>Everything is modulo 2^64: the count rolls over like an odometer.</template>
    </p>
    <div class="controls">
      <select v-model="name" aria-label="the operation"><option v-for="n in NAMES" :key="n" :value="n">{{ n }}</option></select>
      <label class="num">r0 <input v-model="typedP" type="text" spellcheck="false" aria-label="the first input" @change="set('p', typedP)" @keyup.enter="set('p', typedP)" /></label>
      <label class="num">r1 <input v-model="typedQ" type="text" spellcheck="false" aria-label="the second input" @change="set('q', typedQ)" @keyup.enter="set('q', typedQ)" /></label>
    </div>
    <div class="controls">
      <button v-for="c in CASES" :key="c.what" class="small" :class="{ chosen: name === c.name && p === c.r0 && q === c.r1 }" @click="pick(c)">{{ c.what }}</button>
    </div>
    <div class="bit-row" aria-label="the result's 64 bits, most significant first">
      <span v-for="(b, i) in bits" :key="i" class="unit-bit" :class="{ one: b === '1', sign: i === 0, low: i >= 32 }">{{ b }}</span>
    </div>
    <p class="legend">The top bit is the sign when read signed; the low 32 bits are what a 32-bit form works on. Type a number as signed (−7), unsigned, or hex.</p>
  </div>
</template>

<style scoped>
.tile .tile-value { min-width: 6ch; }
.tile .tile-value.small { font-size: 15px; }
.tile.wide .tile-value { min-width: 19ch; font-size: 15px; }
.line { margin: 8px 0; font-size: 14px; line-height: 1.6; min-height: 4.8em; }
.controls { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin: 0 0 6px; }
.controls button.small { min-height: 32px; }
.controls select { min-height: 32px; border: 1px solid var(--vp-c-divider); border-radius: 4px; background: var(--vp-c-bg); color: var(--vp-c-text-1); font-family: var(--vp-font-family-mono); }
.num { display: inline-flex; align-items: center; gap: 4px; font-size: 13px; color: var(--vp-c-text-2); }
.num input { width: 16ch; min-height: 32px; padding: 0 6px; border: 1px solid var(--vp-c-divider); border-radius: 4px; background: var(--vp-c-bg); color: var(--vp-c-text-1); font-family: var(--vp-font-family-mono); font-size: 13px; }
.bit-row { display: flex; flex-wrap: wrap; gap: 1px; margin: 6px 0 0; font-family: var(--vp-font-family-mono); font-size: 11px; }
.bit-row span { min-width: 1.15em; text-align: center; padding: 2px 0; border: 1px solid var(--vp-c-divider); border-radius: 2px; opacity: 0.55; }
.bit-row span.one { opacity: 1; background: var(--bit-top); }
.bit-row span.low.one { background: var(--bit-low); }
.bit-row span.sign { border: 2px solid var(--changed-line); }
.legend { margin: 8px 0 0; font-size: 12px; color: var(--vp-c-text-2); }
</style>
