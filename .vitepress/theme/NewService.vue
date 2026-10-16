<!-- Lesson 17.8: new, from the tests' service 0. Set the code's length and what's asked;
     new: the new service's balance and id, service 0's balance after, and the run's next
     free id, or the refusal. Calls add up until you start again. Computed in new-service.ts. -->
<script setup lang="ts">
import { computed, ref } from "vue";
import type { Result } from "./new-service.ts";
import { create, newBalance, SELF_MINIMUM, start } from "./new-service.ts";

const state = ref(start());
const length = ref(20);
const gratis = ref(false);
const registrar = ref(false);
const wanted = ref(5);
const last = ref<Result | null>(null);
function go() { const r = create(state.value, { length: length.value, gratis: gratis.value, registrar: registrar.value, wanted: wanted.value }); state.value = r.state; last.value = r; }
const reset = () => { state.value = start(); last.value = null; };
const takeNext = () => { state.value = { ...state.value, taken: new Set([...state.value.taken, state.value.next]) }; };
const cost = computed(() => newBalance(length.value));
const fmt = (n: number) => n.toLocaleString("en-US");
</script>

<template>
  <div class="widget new-service">
    <div class="readout" aria-live="polite">
      <div class="tile" :class="{ bad: last && !/^\d+$/.test(last.answer) }"><span class="tile-label">φ₇, the new id</span><span class="tile-value">{{ last ? (/^\d+$/.test(last.answer) ? fmt(Number(last.answer)) : last.answer) : "—" }}</span></div>
      <div class="tile"><span class="tile-label">it needs</span><span class="tile-value">{{ fmt(cost) }}</span></div>
      <div class="tile"><span class="tile-label">service 0 has</span><span class="tile-value">{{ fmt(state.balance) }}</span></div>
      <div class="tile"><span class="tile-label">next free id</span><span class="tile-value">{{ fmt(state.next) }}</span></div>
    </div>
    <p class="line">{{ last ? `${last.answer}: ${last.why}` : `A new service keeps one request for its own code: 2 items and 81 + ${length} bytes, so it needs 100 + 2 × 10 + ${81 + length} = ${fmt(cost)}, paid by service 0, which must keep ${SELF_MINIMUM}.` }}</p>
    <div class="controls">
      <span class="muted">code length</span>
      <button v-for="n in [20, 100, 900]" :key="n" class="small" :class="{ chosen: length === n }" :aria-pressed="length === n" @click="length = n">{{ n }}</button>
      <button class="small" :class="{ chosen: gratis }" :aria-pressed="gratis" @click="gratis = !gratis">ask for gratis storage</button>
    </div>
    <div class="controls">
      <button class="small" :class="{ chosen: registrar }" :aria-pressed="registrar" @click="registrar = !registrar">service 0 is the registrar, asking for id</button>
      <button v-for="w in [5, 0]" :key="w" class="small" :class="{ chosen: wanted === w }" :disabled="!registrar" @click="wanted = w">{{ w }}</button>
    </div>
    <div class="controls">
      <button class="small go" @click="go">new ▶</button>
      <button class="small" @click="takeNext">mark {{ fmt(state.next) }} taken</button>
      <button class="small" @click="reset">start again</button>
    </div>
  </div>
</template>

<style scoped>
.new-service .readout { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); }
.tile .tile-value { font-size: 18px; white-space: nowrap; }
.tile.bad { border-color: var(--changed-line); background: var(--changed); }
.line { margin: 8px 0; font-size: 14px; line-height: 1.6; min-height: 4.8em; }
.controls { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin: 0 0 6px; }
.controls button.small { min-height: 32px; }
.go { border-color: var(--vp-c-brand-1); color: var(--vp-c-brand-1); font-weight: 600; }
.muted { font-size: 12px; color: var(--vp-c-text-2); }
</style>
