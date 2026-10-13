<!-- Lesson 1.1: one byte as two hex digits. Click its 8 bits; each half of 4 bits is one
     digit, 0 to 15, written 0-9 then a-f, and the byte is 16 × the first + the second. -->
<script setup lang="ts">
import { computed, ref } from "vue";
import BitPlaces from "./BitPlaces.vue";
import { bitsOf, HEX_DIGITS, nibbles } from "./bytes.ts";
import type { Role } from "./compact.ts";

const ROLES: Role[] = [...Array<Role>(4).fill("top"), ...Array<Role>(4).fill("low")];
const GOALS = [
  { value: 10, say: "make 0x0a: ten is the digit a" },
  { value: 128, say: "make 0x80" },
  { value: 255, say: "make 0xff, the biggest byte" },
];
const RANGE = "One byte: 8 bits, 0 to 255. Each half is 4 bits, 0 to 15: one hex digit. So a byte is always exactly two hex digits, 00 to ff.";

const value = ref(44);
const halves = computed(() => nibbles(value.value));
</script>

<template>
  <BitPlaces v-model="value" :roles="ROLES" :presets="[44, 0]" :goals="GOALS" :range="RANGE">
    <p class="line">
      first half <span class="top">{{ bitsOf(halves.high, 4) }}</span> = {{ halves.high }} → <b>{{ HEX_DIGITS[halves.high] }}</b>,
      second half <span class="low">{{ bitsOf(halves.low, 4) }}</span> = {{ halves.low }} → <b>{{ HEX_DIGITS[halves.low] }}</b><br />
      16 × {{ halves.high }} + {{ halves.low }} = {{ value }}
    </p>
    <div class="digits" aria-hidden="true">
      <span v-for="(d, n) in HEX_DIGITS" :key="d" class="digit"
        :class="{ top: n === halves.high, low: n === halves.low }">
        <b>{{ d }}</b><small>{{ n }}</small>
      </span>
    </div>
  </BitPlaces>
</template>

<style scoped>
.line { font-family: var(--vp-font-family-mono); font-size: 14px; margin: 8px 0; line-height: 1.9; }
.line .top, .line .low { padding: 1px 4px; border: 1px solid; border-radius: 3px; }
.top { background: var(--bit-top); border-color: var(--bit-top-line); }
.low { background: var(--bit-low); border-color: var(--bit-low-line); }
.digits { display: flex; flex-wrap: wrap; gap: 2px; margin: 4px 0 12px; }
.digit {
  display: flex; flex-direction: column; align-items: center; width: 30px; padding: 2px 0;
  border: 1px solid var(--vp-c-divider); border-radius: 4px; font-family: var(--vp-font-family-mono);
}
.digit small { font-size: 11px; color: var(--vp-c-text-2); }
/* both halves the same digit: show both colours */
.digit.top.low { background: linear-gradient(135deg, var(--bit-top) 50%, var(--bit-low) 50%); }
</style>
