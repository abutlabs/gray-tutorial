<!-- Lesson 15.4: r2 stored at 0x20000, lowest byte first, then loaded back in any width,
     signed or unsigned: tap a load to see which cells it reads and what lands in the
     register, as hex and as a signed number. Computed in store-load.ts. -->
<script setup lang="ts">
import { computed, ref } from "vue";
import { asSigned, BASE, CELLS, hex, hex64, load, LOADS, R2 } from "./store-load.ts";

const stored = ref(false);
const pick = ref(LOADS[1]);
const value = computed(() => load(pick.value));
const read = (k: number) => stored.value && k < pick.value.width;
</script>

<template>
  <div class="widget store-load">
    <div class="readout" aria-live="polite">
      <div class="tile wide"><span class="tile-label">r2</span><span class="tile-value hash">{{ hex64(R2) }}</span></div>
      <div class="tile"><span class="tile-label">{{ pick.name }}</span><span class="tile-value">{{ pick.width }} byte{{ pick.width === 1 ? "" : "s" }}, {{ pick.signed ? "signed" : "unsigned" }}</span></div>
      <div class="tile wide" :class="{ turn: stored }"><span class="tile-label">the register after the load</span><span class="tile-value hash">{{ stored ? hex64(value) : "–" }}</span></div>
      <div class="tile"><span class="tile-label">as a signed number</span><span class="tile-value">{{ stored ? asSigned(value).toLocaleString("en-US") : "–" }}</span></div>
    </div>
    <p class="line">
      <template v-if="!stored">Store r2 at 0x20000 first: the register goes to memory lowest byte first, so the byte at 0x20000 is 0x80, and 0x11 lands last, at 0x20007.</template>
      <template v-else-if="pick.signed">Reads {{ pick.width }} byte{{ pick.width === 1 ? "" : "s" }} from 0x20000, little-endian, then sign-extends: the top bit is {{ (value >> 63n) === 1n ? "1, so the bytes above fill with ff: " + asSigned(value).toLocaleString("en-US") : "0, so the bytes above stay 00: " + asSigned(value).toLocaleString("en-US") }}.</template>
      <template v-else>Reads {{ pick.width }} byte{{ pick.width === 1 ? "" : "s" }} from 0x20000, little-endian, unsigned: the bytes above stay 00. {{ pick.width === 1 ? "0x80 is 128, not −128: that's what the i in load_ind_i8 changes." : "" }}</template>
    </p>
    <div class="controls">
      <button class="small go" :disabled="stored" @click="stored = true">store_ind_u64 r2 at 0x20000 ▶</button>
      <button class="small" :disabled="!stored" @click="stored = false">reset the page</button>
    </div>
    <p class="row-says">the page at 0x20000, byte by byte</p>
    <div class="strip" aria-label="eight bytes of memory">
      <span v-for="(c, k) in CELLS" :key="k" class="cell unit-byte" :class="{ read: read(k) }"><span class="off">{{ (BASE + k).toString(16) }}</span>{{ stored ? hex(c) : "00" }}</span>
    </div>
    <div class="controls">
      <button v-for="l in LOADS" :key="l.name" class="small" :class="{ chosen: pick === l }" :aria-pressed="pick === l" :disabled="!stored" @click="pick = l">{{ l.name }}</button>
    </div>
  </div>
</template>

<style scoped>
.tile .tile-value { min-width: 6ch; font-size: 15px; }
.tile.wide .tile-value { min-width: 19ch; }
.tile.turn { border-color: var(--vp-c-brand-1); background: var(--vp-c-brand-soft); }
.line { margin: 8px 0; font-size: 14px; line-height: 1.6; min-height: 4.8em; }
.controls { display: flex; flex-wrap: wrap; gap: 6px; margin: 0 0 6px; }
.controls button.small { min-height: 32px; font-family: var(--vp-font-family-mono); }
.go { border-color: var(--vp-c-brand-1); color: var(--vp-c-brand-1); font-weight: 600; }
.row-says { margin: 8px 0 4px; font-size: 12px; color: var(--vp-c-text-2); }
.strip { display: flex; flex-wrap: wrap; gap: 3px; margin: 0 0 8px; font-family: var(--vp-font-family-mono); font-size: 14px; }
.cell { position: relative; min-width: 3.4em; padding: 14px 4px 4px; text-align: center; border: 1px solid var(--vp-c-divider); border-radius: 3px; background: var(--vp-c-bg-soft); opacity: 0.7; }
.cell .off { position: absolute; top: 1px; left: 0; right: 0; font-size: 9px; color: var(--vp-c-text-3); }
.cell.read { opacity: 1; border: 2px solid var(--vp-c-brand-1); background: var(--vp-c-brand-soft); font-weight: 700; }
</style>
