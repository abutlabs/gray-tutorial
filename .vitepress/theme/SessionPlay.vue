<!-- Lesson 20.3: a fuzz session through the fuzzy trace's blocks 36 to 40. Step: each
     message, the target's reply, and the fuzzer's check. Make the target answer a wrong root
     at block 40 and the fuzzer asks GetState and stops. Computed in session-play.ts. -->
<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { play } from "./session-play.ts";

const wrong = ref(false);
const at = ref(0);
watch(wrong, () => { at.value = 0; });
const lines = computed(() => play(wrong.value ? 40 : null));
const shown = computed(() => lines.value.slice(0, at.value));
const last = computed(() => shown.value.at(-1));
</script>

<template>
  <div class="widget session-play">
    <div class="readout" aria-live="polite">
      <div class="tile"><span class="tile-label">answers checked</span><span class="tile-value">{{ shown.length }} of {{ lines.length }}</span></div>
      <div class="tile" :class="{ bad: last && !last.ok }"><span class="tile-label">the last check</span><span class="tile-value">{{ last ? (last.ok ? "passes" : "fails") : "—" }}</span></div>
    </div>
    <p class="line">{{ last ? `${last.sent} → ${last.reply}: ${last.check}.` : "Genesis and blocks 1 to 35 have gone through. Step on from block 36." }}</p>
    <div class="controls">
      <button class="small go" :disabled="at === lines.length" @click="at++">next message ▶</button>
      <button class="small" :disabled="at === 0" @click="at = 0">start again</button>
      <button class="small" :class="{ chosen: wrong }" :aria-pressed="wrong" @click="wrong = !wrong">the target answers block 40 wrong</button>
    </div>
    <ol class="log">
      <li v-for="(l, k) in shown" :key="k" :class="{ bad: !l.ok }"><span class="mono">{{ l.sent }}</span> → <span class="mono">{{ l.reply }}</span> <span class="check">{{ l.check }}</span></li>
    </ol>
  </div>
</template>

<style scoped>
.session-play .readout { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); }
.tile .tile-value { font-size: 18px; white-space: nowrap; }
.tile.bad { border-color: var(--changed-line); background: var(--changed); }
.line { margin: 8px 0; font-size: 14px; line-height: 1.6; min-height: 4.8em; overflow-wrap: anywhere; }
.controls { display: flex; flex-wrap: wrap; gap: 6px; margin: 0 0 6px; }
.controls button.small { min-height: 32px; }
.go { border-color: var(--vp-c-brand-1); color: var(--vp-c-brand-1); font-weight: 600; }
.log { margin: 8px 0 0; padding-left: 1.4em; font-size: 13px; line-height: 1.6; }
.log li { overflow-wrap: anywhere; }
.log li.bad { color: var(--changed-line); }
.mono { font-family: var(--vp-font-family-mono); font-size: 12px; }
.check { color: var(--vp-c-text-2); }
</style>
