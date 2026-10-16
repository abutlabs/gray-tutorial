<!-- Lesson 20.2: the lookup anchor's window. Set the block's slot, the anchor's, whether its
     hash is one the target keeps, and whether ancestry is on: the answer, and the window of
     the last L = 24 slots with β's 8 marked. Computed in anchor-window.ts. -->
<script setup lang="ts">
import { computed, ref } from "vue";
import { anchorError, BETA, L } from "./anchor-window.ts";

const slot = ref(100);
const anchor = ref(90);
const known = ref(true);
const ancestry = ref(true);
const error = computed(() => anchorError(slot.value, anchor.value, known.value, ancestry.value));
const cells = computed(() => Array.from({ length: L + 6 }, (_, k) => slot.value - (L + 5) + k));
</script>

<template>
  <div class="widget anchor-window">
    <div class="readout" aria-live="polite">
      <div class="tile"><span class="tile-label">the anchor's age</span><span class="tile-value">{{ slot - anchor }} slots</span></div>
      <div class="tile" :class="{ bad: error }"><span class="tile-label">the report</span><span class="tile-value">{{ error ?? "accepted" }}</span></div>
    </div>
    <p class="line">
      <template v-if="error === 'lookup_anchor_too_old'">{{ anchor }} is before {{ slot }} − {{ L }} = {{ slot - L }}: more than L slots old.</template>
      <template v-else-if="error">Recent enough, but its hash and slot aren't among the last {{ L }} blocks the target keeps.</template>
      <template v-else-if="!ancestry">Recent enough. Without the ancestry feature, the protocol skips the second check.</template>
      <template v-else>Recent enough, and one of the last {{ L }} blocks the target keeps. β alone couldn't say: it remembers only {{ BETA }}.</template>
    </p>
    <div class="controls">
      <span class="muted">the anchor's slot</span>
      <button v-for="a in [98, 90, 80, 76, 75]" :key="a" class="small" :class="{ chosen: anchor === a }" @click="anchor = a">{{ a }}</button>
    </div>
    <div class="controls">
      <button class="small" :class="{ chosen: known }" :aria-pressed="known" @click="known = !known">its hash is one the target keeps</button>
      <button class="small" :class="{ chosen: ancestry }" :aria-pressed="ancestry" @click="ancestry = !ancestry">ancestry feature on</button>
    </div>
    <p class="row-says">slots up to the block's, {{ slot }}: the last {{ L }} in the window, β's {{ BETA }} darker</p>
    <div class="strip">
      <span v-for="c in cells" :key="c" class="cell" :class="{ win: c >= slot - L && c < slot, beta: c >= slot - BETA && c < slot, block: c === slot, anchor: c === anchor }" :title="String(c)">{{ c === anchor ? "A" : c === slot ? "B" : "" }}</span>
    </div>
  </div>
</template>

<style scoped>
.anchor-window .readout { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); }
.tile .tile-value { font-size: 17px; white-space: nowrap; }
.tile.bad { border-color: var(--changed-line); background: var(--changed); }
.line { margin: 8px 0; font-size: 14px; line-height: 1.6; min-height: 4.8em; }
.controls { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin: 0 0 6px; }
.controls button.small { min-height: 32px; }
.muted { font-size: 12px; color: var(--vp-c-text-2); }
.row-says { margin: 8px 0 4px; font-size: 12px; color: var(--vp-c-text-2); }
.strip { display: flex; flex-wrap: wrap; gap: 2px; }
.cell { width: 9px; height: 22px; border-radius: 2px; background: var(--vp-c-bg-soft); border: 1px solid var(--vp-c-divider); font-size: 9px; line-height: 20px; text-align: center; font-weight: 700; }
.cell.win { background: var(--bit-low); }
.cell.beta { background: var(--bit-low-line); }
.cell.block { background: var(--vp-c-brand-1); color: white; }
.cell.anchor { outline: 2px solid var(--changed-line); }
</style>
