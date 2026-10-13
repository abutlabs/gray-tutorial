<!-- Lesson 2.2: any x and its compact encoding ℰ(x), bit by bit, in the diagram's colours:
     the marker, x's top bits in the first byte, and its low bytes after it. -->
<script setup lang="ts">
import { computed, ref } from "vue";
import ByteCells from "./ByteCells.vue";
import { byteGroups, compact, MAX, strip, toHex } from "./compact.ts";

const PRESETS = ["0", "127", "128", "300", "16383", "16384", MAX.toString()];

const text = ref("300");
const x = computed(() => (/^\d+$/.test(text.value.trim()) && BigInt(text.value) <= MAX ? BigInt(text.value) : null));
const c = computed(() => (x.value === null ? null : compact(x.value)));

const why = computed(() => {
  if (!c.value) return "";
  const { l } = c.value;
  const more = `${l} more byte${l === 1 ? "" : "s"}`;
  if (l === 0) return "Below 128 (2^7): one byte. The marker 0, then x's 7 bits.";
  if (l === 8) return "At least 2^56: the marker is eight ones and no zero, then all 64 bits of x in 8 more bytes, lowest byte first.";
  const marker = `${"1".repeat(l)}0`;
  const top = 7 - l === 0 ? "no room for any of x's bits" : `then x's top ${7 - l} bits`;
  return `At least 2^${7 * l} and below 2^${7 * (l + 1)}: ${more}. The marker ${marker}, ${top}; x's low ${8 * l} bits follow, lowest byte first.`;
});

function step(by: bigint) {
  if (x.value === null) return;
  const next = x.value + by;
  if (next >= 0n && next <= MAX) text.value = next.toString();
}
</script>

<template>
  <div class="widget compact-natural">
    <div class="controls">
      <label>x = <input v-model="text" inputmode="numeric" spellcheck="false" aria-label="x" /></label>
      <button class="small" @click="step(-1n)">− 1</button>
      <button class="small" @click="step(1n)">+ 1</button>
      <span class="presets">
        <button v-for="p in PRESETS" :key="p" class="small" :class="{ chosen: p === text }" @click="text = p">
          {{ p === MAX.toString() ? "2^64 − 1" : p }}
        </button>
      </span>
    </div>
    <p v-if="!c" class="error">x is a whole number from 0 to 2^64 − 1.</p>
    <template v-else>
      <div class="readout" aria-live="polite">
        <div class="tile"><span class="tile-label">bytes</span><span class="tile-value">{{ c.bytes.length }}</span></div>
        <div class="tile"><span class="tile-label">ℰ(x)</span><span class="tile-value">{{ toHex(c.bytes) }}</span></div>
      </div>
      <p class="why">{{ why }}</p>
      <div class="label">x in bits</div>
      <ByteCells :groups="strip(c)" />
      <div class="label">ℰ(x)</div>
      <ByteCells :groups="byteGroups(c)" boxed />
    </template>
  </div>
</template>

<style scoped>
.controls { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; margin-bottom: 12px; font-family: var(--vp-font-family-mono); }
.controls input {
  width: 22ch; padding: 2px 8px; border: 1px solid var(--vp-c-divider); border-radius: 6px;
  font-family: inherit; font-size: 15px;
}
.presets { display: flex; gap: 6px; flex-wrap: wrap; }
.why { font-size: 14px; margin: 12px 0; }
.error { color: var(--vp-c-danger-1); }
.label { font-size: 13px; color: var(--vp-c-text-2); margin-top: 8px; }
</style>
