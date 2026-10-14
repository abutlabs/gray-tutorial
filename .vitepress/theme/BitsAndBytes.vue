<!-- Lesson 1.1: a number as any count of bits, 1 to 64, and the whole bytes they take. Each
     byte is a teal box of 8 copper bits (custom.css, Bits or bytes); click a bit, pick a
     size, or type a number as JavaScript writes one. The same digits read three ways (10,
     0x10, 0b10), and 16 in 4 bytes as JAM writes it, 10 00 00 00, are its goals. -->
<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { bigFirst, bitLength, bitsOf, byteCount, groupBits, MAX_BITS, PLAYGROUND_GOALS, readNumber, readings, spacedHex, toHex } from "./bytes.ts";

const SIZES = [1, 2, 4, 8]; // bytes
const fmt = (n: bigint | number) => n.toLocaleString("en-US");

const width = ref(16); // bits
const x = ref(300n);
const text = ref("");
const reached = ref(new Set<string>());

const bytes = computed(() => byteCount(width.value));
const max = computed(() => (1n << BigInt(width.value)) - 1n);
const big = computed(() => bigFirst(x.value, bytes.value));
const typed = computed(() => readNumber(text.value));
const ways = computed(() => readings(text.value));
const tooBig = computed(() => typed.value !== undefined && bitLength(typed.value.x) > MAX_BITS);
const sum = computed(() => big.value.map((b, j) => ({ b, weight: 256n ** BigInt(bytes.value - 1 - j) })).filter(({ b }) => b > 0));

/** The bits of the byte shown j-th (biggest first), highest first: its place within the
 *  byte, its index in x, and whether x's width reaches it. */
const bitsOfByte = (j: number) => {
  const b = bytes.value - 1 - j; // the byte's position, 0 the smallest
  return Array.from({ length: 8 }, (_, i) => {
    const k = 8 * b + 7 - i;
    return { k, place: 1 << (7 - i), on: ((x.value >> BigInt(k)) & 1n) === 1n, used: k < width.value };
  });
};

function resize(bits: number) {
  width.value = Math.min(MAX_BITS, Math.max(1, bits));
  x.value &= max.value; // the bits that no longer fit are gone, as in a smaller box
}
const set = (v: bigint) => { x.value = v < 0n ? 0n : v > max.value ? max.value : v; };
const flip = (k: number) => set(x.value ^ (1n << BigInt(k)));

// typing a number sets it, and grows the bits to fit it
watch(typed, (t) => {
  if (!t || bitLength(t.x) > MAX_BITS) return;
  width.value = Math.max(width.value, bitLength(t.x));
  x.value = t.x;
});
// a goal counts once the size and the number match it, however the reader got there
watch([width, x], ([w, v]) => {
  const key = `${w}/${v}`;
  if (PLAYGROUND_GOALS.some((g) => `${g.bits}/${g.x}` === key)) reached.value = new Set([...reached.value, key]);
});
</script>

<template>
  <div class="widget bits-and-bytes">
    <!-- one answer per row, label then value, so no answer moves when another grows -->
    <dl class="answers" aria-live="polite">
      <dt>decimal</dt><dd>{{ fmt(x) }}</dd>
      <dt>hex, as the number reads</dt><dd :class="{ long: bytes > 4 }"><code class="bytes">{{ toHex(big) }}</code></dd>
      <dt>bits</dt><dd :class="{ long: width > 16 }"><code class="bits">0b{{ groupBits(bitsOf(x, width)) }}</code></dd>
      <dt>bytes, as JAM writes them (2.1)</dt><dd :class="{ long: bytes > 4 }"><code class="bytes">{{ spacedHex([...big].reverse()) }}</code></dd>
    </dl>
    <p class="range">
      {{ width }} bit{{ width === 1 ? "" : "s" }}: 2^{{ width }} = {{ fmt(max + 1n) }} values, 0 to {{ fmt(max) }}.
      8 bits make a byte, so {{ width === 1 ? "it takes" : "they take" }} {{ bytes }} byte{{ bytes === 1 ? "" : "s" }}<template
        v-if="width % 8">, the top {{ 8 * bytes - width }} bit{{ 8 * bytes - width === 1 ? "" : "s" }} left 0</template>.
      Each byte is 2 hex digits, so {{ 2 * bytes }} in all.
    </p>
    <div class="controls" role="group" aria-label="size">
      <button class="small" :disabled="width === 1" @click="resize(width - 1)">− 1 bit</button>
      <button class="small" :disabled="width === MAX_BITS" @click="resize(width + 1)">+ 1 bit</button>
      <button v-for="n in SIZES" :key="n" class="small" :class="{ chosen: width === 8 * n }" @click="resize(8 * n)">
        {{ n }} byte{{ n === 1 ? "" : "s" }}
      </button>
    </div>
    <div class="legend">
      <span class="unit-tag bits">bits</span> tap one to flip it
      <span class="unit-tag bytes">bytes</span> 8 bits each, written as 2 hex digits
    </div>
    <div class="byte-row">
      <div v-for="(b, j) in big" :key="bytes - 1 - j" class="byte-box">
        <div class="bit-row">
          <button v-for="bit in bitsOfByte(j)" :key="bit.k" class="bit unit-bit" :class="{ on: bit.on, unused: !bit.used }"
            :disabled="!bit.used" :aria-pressed="bit.on"
            :aria-label="bit.used ? `bit ${bit.k}, the ${bit.place}s bit of byte ${bytes - 1 - j}` : `not one of the ${width} bits`"
            @click="flip(bit.k)">
            <span class="digit">{{ bit.on ? 1 : 0 }}</span><span class="place">{{ bit.place }}</span>
          </button>
        </div>
        <div class="hex unit-byte">{{ spacedHex([b]) }}</div>
        <div class="weight">{{ b }} × {{ fmt(256n ** BigInt(bytes - 1 - j)) }}</div>
      </div>
    </div>
    <p class="line">
      {{ sum.length ? sum.map(({ b, weight }) => `${b} × ${fmt(weight)}`).join(" + ") : "0" }} = {{ fmt(x) }}
    </p>
    <div class="controls">
      <button class="small" @click="set(x + 1n)">+ 1</button>
      <button class="small" @click="set(x - 1n)">− 1</button>
      <button class="small" @click="set(0n)">0</button>
      <button class="small" @click="set(max)">all ones</button>
    </div>
    <div class="controls type">
      <label>type a number <input v-model="text" spellcheck="false" autocomplete="off" placeholder="300, 0x12c or 0b100101100" /></label>
    </div>
    <p v-if="text.trim() && !typed" class="error">A whole number, as JavaScript writes one: 300, 0x12c (hex) or 0b100101100 (bits).</p>
    <p v-else-if="tooBig" class="error">That needs {{ bitLength(typed!.x) }} bits; this holds up to {{ MAX_BITS }}.</p>
    <p v-else-if="ways.length" class="line">
      <template v-for="(w, n) in ways" :key="w.base">{{ n ? "; " : "" }}<code :class="{ bytes: w.base === 'hex', bits: w.base === 'bits' }">{{ w.written }}</code>
        {{ n ? "would be" : "is" }} {{ fmt(w.x) }}</template>.
      The prefix says which: no prefix is decimal, 0x hex, 0b bits.
    </p>
    <p v-else-if="typed" class="line">{{ typed.base === "hex" ? "0x: hex" : "0b: bits" }}, so {{ fmt(typed.x) }}.</p>
    <ul class="goals">
      <li v-for="g in PLAYGROUND_GOALS" :key="g.say" :class="{ done: reached.has(`${g.bits}/${g.x}`) }">
        {{ reached.has(`${g.bits}/${g.x}`) ? "✓" : "○" }} <UnitText :text="g.say" />
      </li>
    </ul>
  </div>
</template>

<style scoped>
/* a phone: each answer under its label, so a u64 has the whole width */
@media (max-width: 640px) {
  .bits-and-bytes .answers { grid-template-columns: 1fr; }
  .bits-and-bytes .answers dd { margin-bottom: 4px; }
}
.range { font-size: 14px; color: var(--vp-c-text-2); margin: 0 0 12px; line-height: 1.5; }
.controls { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; margin: 8px 0; font-family: var(--vp-font-family-mono); }
.controls button.small { min-height: 32px; }
.controls button.small:disabled { opacity: 0.4; cursor: default; }
.controls.type label { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; font-size: 14px; }
.controls.type input {
  width: 26ch; max-width: 100%; padding: 4px 8px; border: 1px solid var(--vp-c-divider); border-radius: 6px;
  font-family: inherit; font-size: 15px;
}
.legend { font-size: 13px; color: var(--vp-c-text-2); margin: 12px 0 6px; line-height: 2; }
.legend .unit-tag + .unit-tag, .legend .unit-tag:not(:first-child) { margin-left: 12px; }
.byte-row { display: flex; flex-wrap: wrap; gap: 8px; }
.byte-box { padding: 6px; border: 2px solid var(--unit-bytes); border-radius: 6px; }
.bit-row { display: flex; gap: 2px; }
.bit {
  display: flex; flex-direction: column; align-items: center; width: 32px; padding: 4px 0 7px;
  border: 1px solid var(--vp-c-divider); border-radius: 4px; background: var(--vp-c-bg-soft);
  font-family: var(--vp-font-family-mono); cursor: pointer;
}
.bit:hover:not(:disabled) { border-color: var(--unit-bits); }
.bit.on { background: var(--unit-bits-soft); border-color: var(--unit-bits); }
.bit.unused { border-style: dashed; background: none; cursor: default; opacity: 0.45; }
.digit { font-size: 18px; font-weight: 600; line-height: 1.2; }
.bit:not(.on) .digit { color: var(--vp-c-text-3); }
.place { font-size: 10px; color: var(--vp-c-text-2); }
.hex {
  margin-top: 6px; padding: 2px 0 6px; text-align: center; border-radius: 4px; background: var(--unit-bytes-soft);
  color: var(--unit-bytes); font-family: var(--vp-font-family-mono); font-size: 20px; font-weight: 600;
}
.weight { margin-top: 2px; text-align: center; font-family: var(--vp-font-family-mono); font-size: 11px; color: var(--vp-c-text-2); }
.line { font-family: var(--vp-font-family-mono); font-size: 14px; margin: 8px 0; line-height: 1.8; }
.error { color: var(--vp-c-danger-1); font-size: 14px; }
.goals { list-style: none; padding: 0; margin: 12px 0 0; font-size: 14px; color: var(--vp-c-text-2); }
.goals li.done { color: var(--vp-c-green-1); }
</style>
