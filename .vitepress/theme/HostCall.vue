<!-- Lesson 16.1: a host call, start to finish. Pick the call and the budget, then step: the
     block is paid, the machine stops on the ecalli, the host charges and answers in φ₇, the
     machine carries on past the ecalli and the return halts. Computed in host-call.ts. -->
<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { show, steps } from "./host-call.ts";

const CALLS = [{ n: 0, says: "0: gas" }, { n: 99, says: "99: nobody's" }];
const BUDGETS = [1000n, 2000n, 147n];
const call = ref(0);
const budget = ref(1000n);
const at = ref(0);
watch([call, budget], () => { at.value = 0; });
const all = computed(() => steps(call.value, budget.value));
const s = computed(() => all.value[at.value]);
</script>

<template>
  <div class="widget host-call">
    <div class="readout" aria-live="polite">
      <div class="tile"><span class="tile-label">ı</span><span class="tile-value">{{ s.pc }}</span></div>
      <div class="tile"><span class="tile-label">gas</span><span class="tile-value">{{ s.gas.toLocaleString("en-US") }}</span></div>
      <div class="tile"><span class="tile-label">φ₇</span><span class="tile-value">{{ show(s.r7) }}</span></div>
      <div class="tile" :class="{ ok: s.exit === 'halt', bad: s.exit === 'oog' }"><span class="tile-label">exit</span><span class="tile-value">{{ s.exit || "—" }}</span></div>
    </div>
    <p class="line">{{ s.says }}</p>
    <div class="controls">
      <span class="muted">host call</span>
      <button v-for="c in CALLS" :key="c.n" class="small" :class="{ chosen: call === c.n }" :aria-pressed="call === c.n" @click="call = c.n">{{ c.says }}</button>
      <span class="muted">budget</span>
      <button v-for="b in BUDGETS" :key="String(b)" class="small" :class="{ chosen: budget === b }" :aria-pressed="budget === b" @click="budget = b">{{ b.toLocaleString("en-US") }}</button>
    </div>
    <div class="controls">
      <button class="small go" :disabled="at === all.length - 1" @click="at++">step ▶</button>
      <button class="small" :disabled="at === 0" @click="at = 0">start again</button>
      <span class="muted">step {{ at }} of {{ all.length - 1 }}</span>
    </div>
    <ol class="code">
      <li :class="{ here: s.pc === 0 && !s.exit }"><span class="at">0</span><span class="b">0a {{ call.toString(16).padStart(2, "0") }}</span>ecalli {{ call }}</li>
      <li :class="{ here: s.pc === 2 }"><span class="at">2</span><span class="b">32 00</span>jump_ind r0: return</li>
    </ol>
  </div>
</template>

<style scoped>
.tile .tile-value { min-width: 5ch; font-size: 20px; }
.tile.ok { border-color: var(--bit-low-line); background: var(--bit-low); }
.tile.bad { border-color: var(--changed-line); background: var(--changed); }
.line { margin: 8px 0; font-size: 14px; line-height: 1.6; min-height: 3.2em; }
.controls { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin: 0 0 6px; }
.controls button.small { min-height: 32px; }
.go { border-color: var(--vp-c-brand-1); color: var(--vp-c-brand-1); font-weight: 600; }
.muted { font-size: 12px; color: var(--vp-c-text-2); }
.code { list-style: none; margin: 6px 0 0; padding: 0; font-size: 13px; }
.code li { display: grid; grid-template-columns: 2em 4.5em 1fr; padding: 4px 6px; border: 1px solid transparent; border-radius: 4px; }
.code li.here { border-color: var(--vp-c-brand-1); background: var(--vp-c-brand-soft); }
.code .at, .code .b { font-family: var(--vp-font-family-mono); color: var(--vp-c-text-2); }
</style>
