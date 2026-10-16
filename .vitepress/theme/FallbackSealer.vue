<!-- Lesson 8.3: F, one slot at a time. Tap a slot: η′₂ with the slot number on the end, its
     hash, the first four bytes read as a number, that number mod 6, and the validator it
     seats. The twelve slots and each validator's share fill in below. Computed in
     fallback-sealer.ts. -->
<script setup lang="ts">
import { computed, ref } from "vue";
import { DRAWS, KAPPA, TALLY } from "./fallback-sealer.ts";

const slot = ref(0);
const d = computed(() => DRAWS[slot.value]);
const hx = (b: number) => b.toString(16).padStart(2, "0");
const short = (bytes: number[]) => `${bytes.slice(0, 4).map(hx).join(" ")} … ${bytes.slice(-4).map(hx).join(" ")}`;
const fmt = (n: number) => n.toLocaleString("en-US");
</script>

<template>
  <div class="widget fallback-sealer">
    <div class="readout" aria-live="polite">
      <div class="tile"><span class="tile-label">slot</span><span class="tile-value">{{ d.slot }}</span></div>
      <div class="tile wide"><span class="tile-label">first four bytes, as a number</span><span class="tile-value small">{{ fmt(d.number) }}</span></div>
      <div class="tile"><span class="tile-label">mod {{ KAPPA.length }}</span><span class="tile-value">{{ d.validator }}</span></div>
      <div class="tile"><span class="tile-label">sealer</span><span class="tile-value">v{{ d.validator }}</span></div>
    </div>
    <ol class="steps">
      <li><span class="what">η′₂ ⌢ ℰ₄({{ d.slot }})</span><code>{{ d.input.slice(0, 4).map(hx).join(" ") }} … {{ d.input.slice(28, 32).map(hx).join(" ") }} <b>{{ d.input.slice(32).map(hx).join(" ") }}</b></code><span class="note">the epoch's randomness, then the slot number in 4 bytes</span></li>
      <li><span class="what">H(…)</span><code><b class="pick">{{ d.first4.map(hx).join(" ") }}</b> {{ d.hash.slice(4, 8).map(hx).join(" ") }} … {{ d.hash.slice(-3).map(hx).join(" ") }}</code><span class="note">blake2b: a fresh, fair-looking draw for every slot</span></li>
      <li><span class="what">ℰ₄⁻¹(first four)</span><code>{{ fmt(d.number) }}</code><span class="note">read least significant byte first: 0x{{ [...d.first4].reverse().map(hx).join("") }}</span></li>
      <li><span class="what">mod {{ KAPPA.length }}</span><code>{{ fmt(d.number) }} = {{ fmt(Math.floor(d.number / KAPPA.length)) }} × {{ KAPPA.length }} + <b>{{ d.validator }}</b></code><span class="note">counted round κ′, the new active validators</span></li>
      <li><span class="what">κ′[{{ d.validator }}]</span><code>{{ d.key.slice(0, 10) }}…</code><span class="note">that validator's Bandersnatch key seals slot {{ d.slot }}</span></li>
    </ol>
    <p class="row-says">the epoch's twelve slots: tap one</p>
    <div class="slots" role="group" aria-label="slots">
      <button v-for="s in DRAWS" :key="s.slot" class="slot" :class="{ chosen: slot === s.slot }" :aria-pressed="slot === s.slot" @click="slot = s.slot">
        <small>slot {{ s.slot }}</small><b>v{{ s.validator }}</b>
      </button>
    </div>
    <p class="row-says">each validator's share: every slot is a fresh draw, so nobody is promised a turn</p>
    <div class="tally">
      <span v-for="(n, v) in TALLY" :key="v" class="share" :class="{ hit: v === d.validator }">v{{ v }}: {{ n }}</span>
    </div>
  </div>
</template>

<style scoped>
.tile .tile-value { min-width: 3ch; }
.tile.wide .tile-value.small { min-width: 13ch; font-size: 20px; }
.steps { list-style: none; margin: 8px 0; padding: 0; display: flex; flex-direction: column; gap: 4px; }
.steps li { display: grid; grid-template-columns: 11.5em 1fr; gap: 0 8px; padding: 4px 6px; border: 1px solid var(--vp-c-divider); border-radius: 4px; font-size: 13px; }
.steps .what { font-family: var(--vp-font-family-mono); color: var(--vp-c-text-2); }
.steps code { font-size: 13px; overflow-wrap: anywhere; background: none; padding: 0; }
.steps .note { grid-column: 2; font-size: 12px; color: var(--vp-c-text-3); }
.steps b { color: var(--vp-c-brand-1); }
.steps b.pick { background: var(--bit-top); color: var(--vp-c-text-1); border-radius: 2px; padding: 0 2px; }
.row-says { margin: 8px 0 4px; font-size: 12px; color: var(--vp-c-text-2); }
.slots { display: grid; grid-template-columns: repeat(auto-fill, minmax(64px, 1fr)); gap: 4px; }
.slot { display: flex; flex-direction: column; align-items: center; min-height: 40px; padding: 2px; border: 1px solid var(--vp-c-divider); border-radius: 4px; background: var(--vp-c-bg); font-family: var(--vp-font-family-mono); cursor: pointer; color: var(--vp-c-text-1); }
.slot small { font-size: 10px; color: var(--vp-c-text-3); }
.slot.chosen { border: 2px solid var(--vp-c-brand-1); background: var(--vp-c-brand-soft); }
.tally { display: flex; flex-wrap: wrap; gap: 6px; font-family: var(--vp-font-family-mono); font-size: 13px; }
.share { padding: 2px 8px; border: 1px solid var(--vp-c-divider); border-radius: 10px; }
.share.hit { border-color: var(--vp-c-brand-1); background: var(--vp-c-brand-soft); }
@media (max-width: 640px) {
  .steps li { grid-template-columns: 1fr; }
  .steps .note { grid-column: 1; }
}
</style>
