<!-- Lesson 9.2: β_H as the run lists it before block 50, then "block 50 arrives", 51, 52:
     the newest entry's blank filled in, the block joining with zeros, the oldest dropping
     off, and the belt counting up one. All from the trace's own β. Computed in
     recent-blocks.ts. -->
<script setup lang="ts">
import { computed, ref } from "vue";
import { beltCount, drawBelt, recordBlock, STEPS, ZERO_ROOT } from "./recent-blocks.ts";

const k = ref(0); // which block is next to arrive
const applied = ref(false);
const step = computed(() => STEPS[k.value]);
const after = computed(() => recordBlock(k.value));
const shown = computed(() => (applied.value ? after.value.history : step.value.before.history));
const belt = computed(() => (applied.value && STEPS[k.value + 1] ? STEPS[k.value + 1].before.belt : step.value.before.belt));
const canNext = computed(() => applied.value && k.value + 1 < STEPS.length - 1);
const arrive = () => { applied.value = true; };
const next = () => { if (canNext.value) { k.value++; applied.value = false; } };
const reset = () => { k.value = 0; applied.value = false; };
const isNew = (slot: number) => applied.value && slot === step.value.block.slot;
const isFilled = (slot: number) => applied.value && slot === after.value.filled;
</script>

<template>
  <div class="widget recent-blocks">
    <div class="readout" aria-live="polite">
      <div class="tile"><span class="tile-label">β_H holds slots</span><span class="tile-value">{{ shown[0].slot }}–{{ shown.at(-1)!.slot }}</span></div>
      <div class="tile"><span class="tile-label">{{ applied ? `block ${step.block.slot} filled in` : `block ${step.block.slot} brings H_R` }}</span><span class="tile-value hash">{{ step.block.parent_state_root }}</span></div>
      <div class="tile"><span class="tile-label">dropped</span><span class="tile-value">{{ applied ? (after.dropped === null ? "none" : `slot ${after.dropped}`) : "–" }}</span></div>
      <div class="tile"><span class="tile-label">the belt counts</span><span class="tile-value">{{ beltCount(belt) }}</span></div>
    </div>
    <p class="line">
      <template v-if="!applied">Eight blocks, and only the newest, slot {{ step.before.history.at(-1)!.slot }}, still waiting for its state root. Block {{ step.block.slot }} arrives, bringing <code>parent_state_root</code> = {{ step.block.parent_state_root }}.</template>
      <template v-else>Three steps: slot {{ after.filled }}'s blank is filled with the new block's <code>parent_state_root</code>; block {{ step.block.slot }} joins with a zero state root and the belt's new super-peak; slot {{ after.dropped }} is forgotten. The belt is one longer: {{ beltCount(belt) }}.</template>
    </p>
    <div class="controls">
      <button class="small go" :disabled="applied" @click="arrive">block {{ step.block.slot }} arrives ▶</button>
      <button class="small" :disabled="!canNext" @click="next">next block</button>
      <button class="small" :disabled="k === 0 && !applied" @click="reset">back to slot 49</button>
    </div>
    <table class="beta">
      <thead><tr><th>slot</th><th>header</th><th>state root</th><th>reported</th></tr></thead>
      <tbody>
        <tr v-for="b in shown" :key="b.slot" :class="{ fresh: isNew(b.slot), filled: isFilled(b.slot) }">
          <td>{{ b.slot }}</td><td class="hash">{{ b.header_hash }}</td><td class="hash" :class="{ zero: b.state_root === ZERO_ROOT }">{{ b.state_root }}</td><td>{{ b.reported }}</td>
        </tr>
      </tbody>
    </table>
    <p class="belt">the belt: <code>{{ drawBelt(belt) }}</code> <span class="muted">read backwards, {{ beltCount(belt).toString(2) }} in binary</span></p>
  </div>
</template>

<style scoped>
.tile .tile-value { min-width: 6ch; }
.tile .tile-value.hash { font-size: 16px; }
.line { margin: 8px 0; font-size: 14px; line-height: 1.6; min-height: 4.8em; }
.controls { display: flex; flex-wrap: wrap; gap: 6px; margin: 0 0 8px; }
.controls button.small { min-height: 32px; }
.go { border-color: var(--vp-c-brand-1); color: var(--vp-c-brand-1); font-weight: 600; }
.beta { margin: 0; font-size: 13px; }
.beta th, .beta td { padding: 2px 8px; }
.beta td.hash { font-family: var(--vp-font-family-mono); font-size: 12px; }
.beta td.zero { color: var(--vp-c-text-3); }
.beta tr.fresh td { background: var(--vp-c-brand-soft); }
.beta tr.filled td.hash:nth-child(3) { background: var(--bit-mark); font-weight: 700; }
.belt { margin: 8px 0 0; font-size: 13px; }
.muted { color: var(--vp-c-text-2); font-size: 12px; }
@media (max-width: 640px) { .beta th, .beta td { padding: 2px 4px; } }
</style>
