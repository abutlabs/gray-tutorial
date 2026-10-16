<!-- Lesson 15.6: a call through the jump table, stepped. Pick the way back the call leaves in
     r0, then step: the call, the function doubling r2, the return through r0 and the jump
     table, and the halt through r1. The table lights the entry each address picks. Computed
     in call-table.ts. -->
<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { HALT_ADDRESS, JUMP_TABLE, MAX_STEPS, PROGRAM, start, step, WAYS_BACK } from "./call-table.ts";

const wayBack = ref(2);
const state = ref(start());
const said = ref("Step to run the call. r1 holds the halt address; r2 holds 21.");
const entry = ref<number | null>(null);
const reset = () => { state.value = start(); entry.value = null; said.value = "Step to run the call. r1 holds the halt address; r2 holds 21."; };
watch(wayBack, reset);

const done = computed(() => state.value.exit !== "continue" || state.value.steps >= MAX_STEPS);
function next() {
  if (done.value) return;
  const r = step(state.value, wayBack.value);
  state.value = r.next;
  entry.value = r.entry ?? null;
  said.value = r.said + (r.next.steps >= MAX_STEPS && r.next.exit === "continue" ? " It never ends: every return lands back in the function. (Gas would stop it: lesson 15.11.)" : "");
}
const show = (x: bigint) => (x === HALT_ADDRESS ? "halt addr" : x.toLocaleString("en-US"));
const hex = (bytes: number[]) => bytes.map((b) => b.toString(16).padStart(2, "0")).join(" ");
</script>

<template>
  <div class="widget call-table">
    <div class="readout" aria-live="polite">
      <div class="tile"><span class="tile-label">ı</span><span class="tile-value">{{ state.pc }}</span></div>
      <div class="tile"><span class="tile-label">r0, the way back</span><span class="tile-value">{{ show(state.r[0]) }}</span></div>
      <div class="tile"><span class="tile-label">r2</span><span class="tile-value">{{ show(state.r[2]) }}</span></div>
      <div class="tile" :class="{ ok: state.exit === 'halt', bad: state.exit === 'panic' }"><span class="tile-label">exit</span><span class="tile-value">{{ state.exit === "continue" ? "—" : state.exit }}</span></div>
    </div>
    <p class="line">{{ said }}</p>
    <div class="controls">
      <span class="muted">the call's ν_X, the way back:</span>
      <button v-for="w in WAYS_BACK" :key="w.value" class="small" :class="{ chosen: wayBack === w.value }" :aria-pressed="wayBack === w.value" @click="wayBack = w.value">{{ w.says }}</button>
    </div>
    <div class="controls">
      <button class="small go" :disabled="done" @click="next">step ▶</button>
      <button class="small" @click="reset">start again</button>
    </div>
    <div class="panels">
      <ol class="code" aria-label="the program">
        <li v-for="l in PROGRAM" :key="l.at" :class="{ here: state.pc === l.at && state.steps < MAX_STEPS }">
          <span class="at">{{ l.at }}</span><span class="code-bytes">{{ hex(l.bytes(wayBack)) }}</span><span class="says">{{ l.says }}</span>
        </li>
      </ol>
      <div class="table" aria-label="the jump table">
        <p class="muted">the jump table</p>
        <div v-for="(to, k) in JUMP_TABLE" :key="k" class="entry" :class="{ lit: entry === k }">
          <span>address {{ (k + 1) * 2 }}</span><span>entry {{ k }}</span><span>→ byte {{ to }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tile .tile-value { min-width: 5ch; font-size: 20px; }
.tile.ok { border-color: var(--bit-low-line); background: var(--bit-low); }
.tile.bad { border-color: var(--changed-line); background: var(--changed); }
.line { margin: 8px 0; font-size: 14px; line-height: 1.6; min-height: 4.8em; }
.controls { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin: 0 0 6px; }
.controls button.small { min-height: 32px; }
.go { border-color: var(--vp-c-brand-1); color: var(--vp-c-brand-1); font-weight: 600; }
.muted { font-size: 12px; color: var(--vp-c-text-2); }
.panels { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 8px; }
.code { flex: 3 1 260px; list-style: none; margin: 0; padding: 0; font-size: 13px; }
.code li { display: grid; grid-template-columns: 2.2em 8.5em 1fr; gap: 6px; padding: 4px 6px; border: 1px solid transparent; border-radius: 4px; }
.code li.here { border-color: var(--vp-c-brand-1); background: var(--vp-c-brand-soft); }
.code .at, .code .code-bytes { font-family: var(--vp-font-family-mono); color: var(--vp-c-text-2); }
.table { flex: 1 1 150px; }
.table .muted { margin: 0 0 4px; }
.entry { display: flex; flex-wrap: wrap; gap: 0 8px; padding: 4px 6px; margin-bottom: 4px; border: 1px solid var(--vp-c-divider); border-radius: 4px; font-family: var(--vp-font-family-mono); font-size: 13px; }
.entry.lit { border: 2px solid var(--vp-c-brand-1); background: var(--vp-c-brand-soft); font-weight: 700; }
@media (max-width: 640px) {
  .code li { grid-template-columns: 2em 1fr; }
  .code .says { grid-column: 2; }
}
</style>
