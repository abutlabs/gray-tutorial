<!-- Lesson 15.7: one register, ten answers. Flip its bits or type a number; tap an
     instruction to light the bits it looked at, and read its answer as hex and signed.
     Computed in bit-counts.ts. -->
<script setup lang="ts">
import { computed, ref } from "vue";
import { asSigned, BIT_OPERATIONS, counted, hex64, NAMES, parse, PRESETS, says } from "./bit-counts.ts";

const x = ref(0x1f0n);
const typed = ref("0x1f0");
const name = ref("leading_zero_bits_64");
const answer = computed(() => BIT_OPERATIONS[name.value](x.value));
const lit = computed(() => counted(name.value, x.value));
const bit = (k: number) => ((x.value >> BigInt(k)) & 1n) === 1n;
const flip = (k: number) => { x.value ^= 1n << BigInt(k); typed.value = hex64(x.value); };
const set = () => { const v = parse(typed.value); if (v !== null) x.value = v; };
const pick = (v: bigint) => { x.value = v; typed.value = `0x${v.toString(16)}`; };
/** byte 7 down to byte 0, each its bits highest first */
const BYTES = [7, 6, 5, 4, 3, 2, 1, 0];
</script>

<template>
  <div class="widget bit-counts">
    <div class="readout" aria-live="polite">
      <div class="tile wide"><span class="tile-label">r0</span><span class="tile-value hash">{{ hex64(x) }}</span></div>
      <div class="tile wide"><span class="tile-label">{{ name }}</span><span class="tile-value hash">{{ hex64(answer) }}</span></div>
      <div class="tile"><span class="tile-label">as a number</span><span class="tile-value small">{{ asSigned(answer).toLocaleString("en-US") }}</span></div>
    </div>
    <p class="line">{{ says(name, x) }}</p>
    <div class="controls">
      <label class="num">r0 <input v-model="typed" type="text" spellcheck="false" aria-label="r0" @change="set" @keyup.enter="set" /></label>
      <button v-for="p in PRESETS" :key="p.says" class="small" :class="{ chosen: x === p.x }" @click="pick(p.x)">{{ p.says }}</button>
    </div>
    <div class="bit-grid" aria-label="r0's 64 bits, highest first: tap one to flip it">
      <div v-for="b in BYTES" :key="b" class="byte-group" :class="{ low32: b < 4 }">
        <span class="byte-label">byte {{ b }}{{ b === 3 ? " · low 32 bits →" : "" }}</span>
        <button v-for="i in 8" :key="i" class="bit" :class="{ one: bit(8 * b + 8 - i), lit: lit.has(8 * b + 8 - i) }"
          :aria-label="`bit ${8 * b + 8 - i}: ${bit(8 * b + 8 - i) ? 1 : 0}`" @click="flip(8 * b + 8 - i)">{{ bit(8 * b + 8 - i) ? 1 : 0 }}</button>
      </div>
    </div>
    <div class="ops" role="group" aria-label="the ten instructions">
      <button v-for="n in NAMES" :key="n" class="op" :class="{ chosen: name === n }" :aria-pressed="name === n" @click="name = n">
        <span class="op-name">{{ n }}</span><span class="op-value">{{ asSigned(BIT_OPERATIONS[n](x)).toLocaleString("en-US") }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
/* fixed columns, nothing wraps: the readout keeps one height whatever r0 holds */
.bit-counts .readout { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); }
.tile .tile-value { font-size: 14px; white-space: nowrap; }
.line { margin: 8px 0; font-size: 14px; line-height: 1.6; min-height: 3.2em; }
.controls { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin: 0 0 8px; }
.controls button.small { min-height: 32px; font-family: var(--vp-font-family-mono); }
.num { display: inline-flex; align-items: center; gap: 4px; font-size: 13px; color: var(--vp-c-text-2); }
.num input { width: 20ch; min-height: 32px; padding: 0 6px; border: 1px solid var(--vp-c-divider); border-radius: 4px; background: var(--vp-c-bg); color: var(--vp-c-text-1); font-family: var(--vp-font-family-mono); font-size: 13px; }
.bit-grid { display: flex; flex-wrap: wrap; gap: 8px 10px; margin: 4px 0 10px; }
.byte-group { display: flex; flex-wrap: wrap; gap: 2px; width: 172px; }
.byte-label { width: 100%; font-size: 11px; color: var(--vp-c-text-3); }
.byte-group.low32 .byte-label { color: var(--vp-c-text-2); }
.bit { width: 19px; min-height: 32px; padding: 0; border: 1px solid var(--vp-c-divider); border-radius: 3px; font-family: var(--vp-font-family-mono); font-size: 13px; color: var(--vp-c-text-3); background: var(--vp-c-bg); cursor: pointer; }
.bit.one { color: var(--vp-c-text-1); font-weight: 700; background: var(--bit-top); }
.bit.lit { border: 2px solid var(--vp-c-brand-1); }
.byte-group.low32 .bit:not(.one) { background: var(--vp-c-bg-soft); }
.ops { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 4px; }
.op { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 0 8px; min-height: 32px; padding: 4px 8px; border: 1px solid var(--vp-c-divider); border-radius: 4px; background: var(--vp-c-bg); font-family: var(--vp-font-family-mono); font-size: 13px; color: var(--vp-c-text-1); cursor: pointer; text-align: left; }
.op.chosen { border: 2px solid var(--vp-c-brand-1); background: var(--vp-c-brand-soft); }
.op-value { margin-left: auto; color: var(--vp-c-text-2); text-align: right; }
</style>
