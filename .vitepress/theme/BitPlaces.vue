<!-- Bits and what each is worth: click a bit to flip it; the number is the sum of the places
     holding a 1. The total and its hex sit in a readout that never moves. On its own it is
     lesson 2.2's one byte, starting at 127, 01111111; TwoBytes makes it 14 bits wide, with
     its own readout and ℰ(x) in its slots. -->
<script setup lang="ts">
import { computed, ref } from "vue";
import { bitsOf, toHex } from "./bytes.ts";
import type { Role } from "./compact.ts";

const props = withDefaults(defineProps<{
  width?: number;
  presets?: number[];
  goals?: { value: number; say: string }[];
  roles?: Role[]; // colour each place as the diagram does; none: a 1 is just a bit, copper
  range?: string; // what these bits can hold
}>(), {
  width: 8,
  range: "One byte: 8 bits make 2^8 = 256 values, 0 to 255. As the only byte of a compact natural, its first bit is the marker 0, which leaves 7 bits: 0 to 127.",
  presets: () => [127, 0],
  goals: () => [
    { value: 128, say: "add 1 and watch every 1 carry" },
    { value: 5, say: "make 5" },
    { value: 255, say: "make 255, the biggest byte" },
  ],
});
const value = defineModel<number>({ default: 127 });

const places = computed(() => Array.from({ length: props.width }, (_, i) => 2 ** (props.width - 1 - i)));
const bits = computed(() => bitsOf(value.value, props.width));
const sum = computed(() => places.value.filter((p) => value.value & p));
const reached = ref(new Set<number>());

function set(v: number) {
  value.value = Math.min(2 ** props.width - 1, Math.max(0, v));
  reached.value = new Set([...reached.value, value.value]);
}
</script>

<template>
  <div class="widget bit-places">
    <div class="readout" aria-live="polite">
      <slot name="readout">
        <div class="tile"><span class="tile-label">decimal</span><span class="tile-value">{{ value }}</span></div>
        <div class="tile"><span class="tile-label">hex</span><span class="tile-value">{{ toHex([value]) }}</span></div>
      </slot>
    </div>
    <p class="range">{{ range }}</p>
    <div class="row">
      <button v-for="(p, i) in places" :key="p" class="bit unit-bit"
        :class="[roles?.[i] ?? 'plain', { on: bits[i] === '1', split: i > 0 && roles && roles[i] !== roles[i - 1] }]"
        :aria-pressed="bits[i] === '1'" :aria-label="`the ${p}s bit`" @click="set(value ^ p)">
        <span class="digit">{{ bits[i] }}</span>
        <span class="place">{{ p }}</span>
      </button>
    </div>
    <p class="sum">
      <code class="bits">0b{{ bits }}</code> =
      <template v-if="sum.length">{{ sum.join(" + ") }}{{ sum.length > 1 ? ` = ${value}` : "" }}</template>
      <template v-else>0</template>
    </p>
    <slot />
    <div class="controls">
      <button class="small" @click="set(value + 1)">+ 1</button>
      <button class="small" @click="set(value - 1)">− 1</button>
      <button v-for="p in presets" :key="p" class="small" @click="set(p)">{{ p }}</button>
    </div>
    <ul class="goals">
      <li v-for="g in goals" :key="g.value" :class="{ done: reached.has(g.value) }">
        {{ reached.has(g.value) ? "✓" : "○" }} {{ g.say }}<template v-if="reached.has(g.value)">: <code class="bits">0b{{ bitsOf(g.value, width) }}</code></template>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.row { display: flex; gap: 4px; flex-wrap: wrap; }
.bit {
  display: flex; flex-direction: column; align-items: center; min-width: 48px; padding: 6px 4px;
  border: 1px solid var(--vp-c-divider); border-radius: 6px; background: var(--vp-c-bg-soft);
  font-family: var(--vp-font-family-mono); cursor: pointer;
}
.bit:hover { border-color: var(--vp-c-brand-1); }
.bit.split { margin-left: 12px; }
.bit.mark.on { background: var(--bit-mark); border-color: var(--bit-mark-line); }
.bit.plain.on { background: var(--unit-bits-soft); border-color: var(--unit-bits); }
.bit.top { border-color: var(--bit-top-line); }
.bit.top.on { background: var(--bit-top); }
.bit.low { border-color: var(--bit-low-line); }
.bit.low.on { background: var(--bit-low); }
.digit { font-size: 22px; font-weight: 600; }
.bit:not(.on) .digit { color: var(--vp-c-text-3); }
.place { font-size: 12px; color: var(--vp-c-text-2); }
.sum { font-family: var(--vp-font-family-mono); font-size: 15px; margin: 12px 0 8px; }
.range { font-size: 14px; color: var(--vp-c-text-2); margin: 0 0 12px; line-height: 1.5; }
.controls { display: flex; gap: 6px; flex-wrap: wrap; }
.goals { list-style: none; padding: 0; margin: 12px 0 0; font-size: 14px; color: var(--vp-c-text-2); }
.goals li { margin: 2px 0; }
.goals li.done { color: var(--vp-c-green-1); }
</style>
