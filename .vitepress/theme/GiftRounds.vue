<!-- Lesson 17.4: the gift's block, round by round. Step: round 1 runs service 0 and sends a
     transfer; round 2 puts the money into service 1's balance, then runs it with the
     transfer as its input; nothing is sent, so the rounds stop. Toggle service 1's code away
     and the money still arrives. Computed in gift-rounds.ts. -->
<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { phases } from "./gift-rounds.ts";

const hasCode = ref(true);
const at = ref(0);
watch(hasCode, () => { at.value = 0; });
const all = computed(() => phases(hasCode.value));
const p = computed(() => all.value[at.value]);
const stat = (id: number) => { const s = p.value.stats[id]; return s ? `(${s.count}, ${s.transfers}, ${s.gas.toLocaleString("en-US")})` : "—"; };
</script>

<template>
  <div class="widget gift-rounds">
    <div class="readout" aria-live="polite">
      <div class="tile"><span class="tile-label">round</span><span class="tile-value">{{ p.round === 0 ? "—" : p.round === 3 ? "stop" : p.round }}</span></div>
      <div class="tile"><span class="tile-label">service 1's balance</span><span class="tile-value">{{ p.balance1.toLocaleString("en-US") }}</span></div>
      <div class="tile"><span class="tile-label">S(0) = (N, T, G)</span><span class="tile-value">{{ stat(0) }}</span></div>
      <div class="tile"><span class="tile-label">S(1)</span><span class="tile-value">{{ stat(1) }}</span></div>
    </div>
    <p class="line">{{ p.says }}</p>
    <div class="controls">
      <button class="small go" :disabled="at === all.length - 1" @click="at++">next ▶</button>
      <button class="small" :disabled="at === 0" @click="at = 0">start again</button>
      <button class="small" :class="{ chosen: !hasCode }" :aria-pressed="!hasCode" @click="hasCode = !hasCode">service 1 has no code</button>
    </div>
    <p class="row-says">sent this round</p>
    <p class="mono">{{ p.sent || "—" }}</p>
  </div>
</template>

<style scoped>
.gift-rounds .readout { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); }
.tile .tile-value { font-size: 17px; white-space: nowrap; }
.line { margin: 8px 0; font-size: 14px; line-height: 1.6; min-height: 6.4em; }
.controls { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin: 0 0 6px; }
.controls button.small { min-height: 32px; }
.go { border-color: var(--vp-c-brand-1); color: var(--vp-c-brand-1); font-weight: 600; }
.row-says { margin: 8px 0 2px; font-size: 12px; color: var(--vp-c-text-2); }
.mono { margin: 0; font-family: var(--vp-font-family-mono); font-size: 13px; }
</style>
