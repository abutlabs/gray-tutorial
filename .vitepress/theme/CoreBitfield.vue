<!-- Lesson 4.2: an assurance's bitfield, one bit per core, packed eight to a byte, lowest
     bit first. Pick tiny, 10 or full's 341 cores and click cores on and off. -->
<script setup lang="ts">
import { computed, ref, watch } from "vue";
import BitfieldBytes from "./BitfieldBytes.vue";
import { bitAt, bitfieldOf, bytesFor } from "./bitfield.ts";
import { toHex } from "./bytes.ts";

const SIZES = [{ cores: 2, name: "tiny" }, { cores: 10, name: "" }, { cores: 341, name: "full" }];
const FULL_VECTOR = `0x${"55".repeat(42)}15`; // 4.2's full assurances_extrinsic.bin, every other core
const GOALS = [
  { cores: 10, hex: "0x0001", say: "core 8 alone: the lowest bit of byte 1" },
  { cores: 10, hex: "0xff00", say: "cores 0 to 7: all of byte 0" },
  { cores: 341, hex: FULL_VECTOR, say: "full's vector: 42 bytes of 0x55 and a last 0x15" },
];

const cores = ref(10);
const bitfield = ref(bitfieldOf(10, (c) => c === 0 || c === 2));
const reached = ref(new Set<string>());
const hex = computed(() => toHex(bitfield.value));
const count = computed(() => Array.from({ length: cores.value }, (_, c) => bitAt(bitfield.value, c)).filter(Boolean).length);
const lastBits = computed(() => cores.value - 8 * (bytesFor(cores.value) - 1));

function size(n: number) {
  cores.value = n;
  bitfield.value = bitfieldOf(n, () => false);
}
const fill = (set: (c: number) => boolean) => { bitfield.value = bitfieldOf(cores.value, set); };
// a goal counts once the bitfield has matched it, whichever way the reader got there
watch(hex, (now) => GOALS.forEach((g) => {
  if (g.cores === cores.value && g.hex === now) reached.value = new Set([...reached.value, g.say]);
}));
</script>

<template>
  <div class="widget core-bitfield">
    <dl class="answers" aria-live="polite">
      <dt>cores set</dt><dd>{{ count }} of {{ cores }}</dd>
      <dt>bitfield</dt><dd :class="{ long: hex.length > 14 }">{{ hex }}</dd>
    </dl>
    <p class="range">
      {{ cores }} cores need ⌈{{ cores }}/8⌉ = {{ bytesFor(cores) }} byte{{ bytesFor(cores) === 1 ? "" : "s" }}. The last
      byte uses {{ lastBits }} of its 8 bits; the {{ 8 - lastBits }} past the last core stay 0. Each byte is written as
      binary always is, highest bit on the left, so core 0, the lowest bit, is at the <b>right</b> end of byte 0.
    </p>
    <div class="controls">
      <button v-for="s in SIZES" :key="s.cores" class="small" :class="{ chosen: s.cores === cores }" @click="size(s.cores)">
        {{ s.name ? `${s.name}: ` : "" }}{{ s.cores }} cores
      </button>
      <button class="small" @click="fill(() => false)">none</button>
      <button class="small" @click="fill((c) => c % 2 === 0)">every other core</button>
      <button class="small" @click="fill(() => true)">all</button>
    </div>
    <BitfieldBytes v-model="bitfield" :cores="cores" :compact="cores > 16" />
    <ul class="goals">
      <li v-for="g in GOALS" :key="g.say" :class="{ done: reached.has(g.say) }">
        {{ reached.has(g.say) ? "✓" : "○" }} {{ g.cores }} cores, {{ g.say }}
      </li>
    </ul>
  </div>
</template>

<style scoped>
.range { font-size: 14px; color: var(--vp-c-text-2); margin: 0 0 12px; line-height: 1.5; }
.controls { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 8px; }
.goals { list-style: none; padding: 0; margin: 12px 0 0; font-size: 14px; color: var(--vp-c-text-2); }
.goals li.done { color: var(--vp-c-green-1); }
</style>
