<!-- Lesson 2.2's two-byte calculator: x as 14 clickable bits, its top 6 and low 8 coloured
     as in the diagram, and the two bytes of ℰ(x) they make; x and ℰ(x) in the readout. -->
<script setup lang="ts">
import { computed, ref } from "vue";
import BitPlaces from "./BitPlaces.vue";
import ByteCells from "./ByteCells.vue";
import { bitsOf, toHex } from "./bytes.ts";
import { byteGroups, compact, markerOf, type Role } from "./compact.ts";

const ROLES: Role[] = [...Array<Role>(6).fill("top"), ...Array<Role>(8).fill("low")];
const GOALS = [
  { value: 128, say: "make 128: both bytes come out 0x80" },
  { value: 300, say: "make 300: 0x812c" },
  { value: 16383, say: "make 16,383, the most two bytes hold" },
];

const RANGE = "Two bytes: 16 bits make 2^16 = 65,536 values, 0 to 65,535. As a compact natural, the marker 10 takes 2 of them, which leaves 14 bits: 0 to 16,383 (2^14 − 1). Below 128 takes one byte, so two bytes carry 128 to 16,383.";

const x = ref(300);
const c = computed(() => compact(BigInt(x.value)));
const top = computed(() => c.value.bytes[0] - markerOf(1)); // x's top 6 bits, as a number
</script>

<template>
  <BitPlaces v-model="x" :width="14" :roles="ROLES" :presets="[128, 300, 16383]" :goals="GOALS" :range="RANGE">
    <template #readout>
      <div class="tile"><span class="tile-label">x</span><span class="tile-value">{{ x }}</span></div>
      <div class="tile"><span class="tile-label">ℰ(x)</span><span class="tile-value">{{ toHex(c.bytes) }}</span></div>
    </template>
    <p v-if="c.l === 0" class="line">
      Below 128: one byte. Two bytes start at 128.
    </p>
    <template v-else>
      <ByteCells :groups="byteGroups(c)" boxed />
      <p class="line">
        byte 1 = marker <span class="mark">0b10</span> ({{ markerOf(1) }})
        + top bits <span class="top">0b{{ bitsOf(top, 6) }}</span> ({{ top }}) = {{ c.bytes[0] }} = {{ toHex([c.bytes[0]]) }}<br />
        byte 2 = low bits <span class="low">0b{{ bitsOf(c.bytes[1], 8) }}</span> = {{ c.bytes[1] }} = {{ toHex([c.bytes[1]]) }}
      </p>
    </template>
  </BitPlaces>
</template>

<style scoped>
.line { font-family: var(--vp-font-family-mono); font-size: 14px; margin: 8px 0 12px; line-height: 1.9; }
.mark, .top, .low { padding: 1px 4px; border: 1px solid; border-radius: 3px; }
.mark { background: var(--bit-mark); border-color: var(--bit-mark-line); }
.top { background: var(--bit-top); border-color: var(--bit-top-line); }
.low { background: var(--bit-low); border-color: var(--bit-low-line); }
</style>
