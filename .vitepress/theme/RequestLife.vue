<!-- Lesson 16.9: one request's life. Move the slot, then solicit, provide, forget or query:
     the history before and after, the answer, the gas and the footprint. Calls add up until
     you start again. Computed in request-life.ts. -->
<script setup lang="ts">
import { ref } from "vue";
import type { Op, Result } from "./request-life.ts";
import { apply, D, GAS, historyText, KINDS, START, Z } from "./request-life.ts";

const state = ref({ ...START });
const t = ref(7);
const last = ref<{ op: Op; before: string; t: number; r: Result } | null>(null);
function call(op: Op) {
  const before = historyText(state.value.history);
  const r = apply(state.value, op, t.value);
  state.value = r.state;
  last.value = { op, before, t: t.value, r };
}
const reset = () => { state.value = { ...START }; t.value = 7; last.value = null; };
const big = (x: bigint) => x.toLocaleString("en-US");
const SLOTS = [3, 7, 9, 40, 42, 50];
const OPS: Op[] = ["solicit", "provide", "forget", "query"];
</script>

<template>
  <div class="widget request-life">
    <div class="readout" aria-live="polite">
      <div class="tile"><span class="tile-label">the request's history</span><span class="tile-value">{{ historyText(state.history) }}</span></div>
      <div class="tile"><span class="tile-label">φ₇ answer</span><span class="tile-value">{{ last ? last.r.answer : "—" }}</span></div>
      <div class="tile"><span class="tile-label">items · bytes</span><span class="tile-value">{{ state.items }} · {{ state.bytes }}</span></div>
      <div class="tile"><span class="tile-label">gas</span><span class="tile-value">{{ last ? GAS[last.op].toLocaleString("en-US") : "—" }}</span></div>
    </div>
    <p class="line">
      <template v-if="!last">A request for a {{ Z }}-byte preimage, on the tests' account: 2 items, 50 bytes, a balance of 1,000. D = {{ D }} on tiny. Pick a slot, then a call.</template>
      <template v-else>
        At slot {{ last.t }}, {{ last.op }}: {{ last.before }} → {{ historyText(state.history) }}, {{ last.r.answer }}.
        <template v-if="last.op === 'query' && last.r.r7 !== undefined && last.r.answer === 'OK'">φ₇ = {{ big(last.r.r7) }} (the count + 2^32 × the first slot), φ₈ = {{ big(last.r.r8!) }} (the second + 2^32 × the third).</template>
        <template v-else-if="last.op === 'forget' && last.r.answer === 'HUH' && state.history?.length === 2">It was forgotten at {{ state.history[1] }}, and that's not more than {{ D }} slots before {{ last.t }}: {{ state.history[1] }} isn't below {{ last.t }} − {{ D }} = {{ last.t - D }}.</template>
        <template v-else-if="last.op === 'solicit' && last.r.answer === 'OK' && last.before === 'no request'">A new request takes deposit: 2 items, and 81 + {{ Z }} bytes.</template>
      </template>
    </p>
    <div class="controls">
      <span class="muted">slot t</span>
      <button v-for="s in SLOTS" :key="s" class="small" :class="{ chosen: t === s }" :aria-pressed="t === s" @click="t = s">{{ s }}</button>
    </div>
    <div class="controls">
      <button v-for="op in OPS" :key="op" class="small go" @click="call(op)">{{ op }}</button>
      <button class="small" @click="reset">start again</button>
    </div>
    <table class="kinds">
      <tbody>
        <tr v-for="(row, k) in KINDS" :key="row[0]" :class="{ here: state.history?.length === k }">
          <td class="mono">{{ row[0] }}</td><td>{{ row[1] }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.tile .tile-value { min-width: 6ch; font-size: 18px; white-space: nowrap; }
.request-life .readout { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); }
.line { margin: 8px 0; font-size: 14px; line-height: 1.6; min-height: 6.4em; }
.controls { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin: 0 0 6px; }
.controls button.small { min-height: 32px; }
.go { border-color: var(--vp-c-brand-1); color: var(--vp-c-brand-1); font-weight: 600; }
.muted { font-size: 12px; color: var(--vp-c-text-2); }
.kinds { display: table; width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 6px; }
.kinds td { padding: 4px 8px; border: 1px solid var(--vp-c-divider); }
.kinds tr.here td { background: var(--vp-c-brand-soft); font-weight: 600; }
.mono { font-family: var(--vp-font-family-mono); }
</style>
