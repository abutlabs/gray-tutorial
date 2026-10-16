<!-- Lesson 17.5: assign, with service 0 holding every privilege. Pick the caller, the core
     and the next assigner; assign: φ₇ by name, χ_A before and after, the gas. Calls add up
     until you start again. Computed in assign-core.ts. -->
<script setup lang="ts">
import { ref } from "vue";
import type { Result } from "./assign-core.ts";
import { assign, NOBODY, START } from "./assign-core.ts";

const state = ref({ assign: [...START.assign], queues: [...START.queues] });
const caller = ref(0);
const core = ref(0);
const next = ref(1);
const last = ref<Result | null>(null);
const before = ref<number[]>([...START.assign]);
function go() { before.value = [...state.value.assign]; const r = assign(state.value, caller.value, core.value, next.value); state.value = r.state; last.value = r; }
const reset = () => { state.value = { assign: [...START.assign], queues: [...START.queues] }; last.value = null; before.value = [...START.assign]; };
const show = (x: number) => (x === NOBODY ? "2^32" : String(x));
</script>

<template>
  <div class="widget assign-core">
    <div class="readout" aria-live="polite">
      <div class="tile" :class="{ bad: last && last.answer !== 'OK' }"><span class="tile-label">φ₇</span><span class="tile-value">{{ last ? last.answer : "—" }}</span></div>
      <div class="tile"><span class="tile-label">χ_A before → after</span><span class="tile-value">[{{ before.join(", ") }}] → [{{ state.assign.join(", ") }}]</span></div>
      <div class="tile"><span class="tile-label">gas</span><span class="tile-value">{{ last ? "1,818" : "—" }}</span></div>
    </div>
    <p class="line">{{ last ? `${last.answer}: ${last.why}.` : "Service 0 holds every privilege: it assigns both of tiny's cores. Pick who calls, which core, and who's next." }}</p>
    <div class="controls">
      <span class="muted">caller</span>
      <button v-for="c in [0, 1, 5]" :key="`c${c}`" class="small" :class="{ chosen: caller === c }" :aria-pressed="caller === c" @click="caller = c">service {{ c }}</button>
    </div>
    <div class="controls">
      <span class="muted">core φ₇</span>
      <button v-for="c in [0, 1, 2]" :key="`k${c}`" class="small" :class="{ chosen: core === c }" :aria-pressed="core === c" @click="core = c">{{ c }}</button>
      <span class="muted">next assigner φ₉</span>
      <button v-for="n in [1, 0, NOBODY]" :key="`n${n}`" class="small" :class="{ chosen: next === n }" :aria-pressed="next === n" @click="next = n">{{ show(n) }}</button>
    </div>
    <div class="controls">
      <button class="small go" @click="go">assign ▶</button>
      <button class="small" @click="reset">start again</button>
    </div>
    <div class="cores">
      <p v-for="(a, k) in state.assign" :key="k" class="core" :class="{ set: state.queues[k] }">core {{ k }}: assigner service {{ a }} · {{ state.queues[k] ? "a new 80-hash queue" : "its old queue" }}</p>
    </div>
  </div>
</template>

<style scoped>
.assign-core .readout { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); }
.tile .tile-value { font-size: 18px; white-space: nowrap; }
.tile.bad { border-color: var(--changed-line); background: var(--changed); }
.line { margin: 8px 0; font-size: 14px; line-height: 1.6; min-height: 3.2em; }
.controls { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin: 0 0 6px; }
.controls button.small { min-height: 32px; }
.go { border-color: var(--vp-c-brand-1); color: var(--vp-c-brand-1); font-weight: 600; }
.muted { font-size: 12px; color: var(--vp-c-text-2); }
.cores { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
.core { margin: 0; padding: 4px 8px; border: 1px solid var(--vp-c-divider); border-radius: 4px; font-size: 13px; }
.core.set { background: var(--bit-low); }
</style>
