<!-- A bitfield of C cores, one byte box each eight: bits written as binary is, highest on
     the left, so core 0, the lowest bit, sits at the right end of the first byte. Click a
     core to flip it; bits past the last core are unused and stay 0. -->
<script setup lang="ts">
import { bitAt, flip } from "./bitfield.ts";
import { toHex } from "./bytes.ts";

const props = defineProps<{ cores: number; compact?: boolean; inline?: boolean }>(); // inline: each byte's note beside it, for one-line rows
const bitfield = defineModel<number[]>({ required: true });

/** Byte b's cores, as its bits are written: bit 7 first, bit 0 last. */
const coresOf = (b: number) => [7, 6, 5, 4, 3, 2, 1, 0].map((bit) => 8 * b + bit);
const toggle = (c: number) => { if (c < props.cores) bitfield.value = flip(bitfield.value, c); };
</script>

<template>
  <div class="bitfield" :class="{ compact, inline }">
    <div v-for="(byte, b) in bitfield" :key="b" class="group">
      <div class="byte">
        <button v-for="c in coresOf(b)" :key="c" class="bit"
          :class="{ on: c < cores && bitAt(bitfield, c), unused: c >= cores }" :disabled="c >= cores"
          :aria-pressed="bitAt(bitfield, c)" :aria-label="c < cores ? `core ${c}` : `unused bit`" @click="toggle(c)">
          <span class="digit">{{ bitAt(bitfield, c) ? 1 : 0 }}</span>
          <span class="core">{{ c < cores ? c : "·" }}</span>
        </button>
      </div>
      <div class="note">byte {{ b }}: {{ toHex([byte]) }}</div>
    </div>
  </div>
</template>

<style scoped>
.bitfield { display: flex; flex-wrap: wrap; gap: 10px; margin: 4px 0; }
.byte { display: flex; outline: 2px solid var(--vp-c-text-1); border-radius: 3px; }
.bit {
  display: flex; flex-direction: column; align-items: center; width: 28px; padding: 2px 0;
  border: 1px solid var(--bit-low-line); margin-right: -1px; font-family: var(--vp-font-family-mono);
  background: var(--vp-c-bg-soft); cursor: pointer;
}
.compact .bit { width: 26px; } /* a finger's width on a phone, and 8 still fit */
.bit.on { background: var(--bit-low); }
.bit.unused { border-color: var(--vp-c-divider); cursor: default; opacity: 0.5; }
.bit:not(.unused):hover { border-color: var(--vp-c-brand-1); }
.digit { font-size: 16px; font-weight: 600; }
.bit:not(.on) .digit { color: var(--vp-c-text-3); }
.core { font-size: 10px; color: var(--vp-c-text-2); }
.inline .group { display: flex; align-items: center; gap: 8px; }
.inline .note { margin-top: 0; }
.note { font-size: 12px; color: var(--vp-c-text-2); margin-top: 4px; font-family: var(--vp-font-family-mono); }
</style>
