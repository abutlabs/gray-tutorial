<!-- Lesson 16.5: write, step by step, on the tests' made-up account. Pick a key, a value's
     length (0 deletes) and the balance; write: the gas, the account as it would be after,
     a_t against the balance, then committed or FULL, and φ₇. Writes add up until you start
     again. Computed in write-store.ts. -->
<script setup lang="ts">
import { ref } from "vue";
import type { Write } from "./write-store.ts";
import { START, write } from "./write-store.ts";

const account = ref({ ...START, storage: { ...START.storage } });
const key = ref("last");
const length = ref(3);
const last = ref<Write | null>(null);
function go() {
  const w = write({ ...account.value }, key.value, length.value);
  last.value = w;
  account.value = w.after;
}
const reset = () => { account.value = { ...START, storage: {} }; last.value = null; };
const setBalance = (b: number) => { account.value = { ...account.value, balance: b }; };
</script>

<template>
  <div class="widget write-store">
    <div class="readout" aria-live="polite">
      <div class="tile"><span class="tile-label">items · bytes</span><span class="tile-value">{{ account.items }} · {{ account.bytes }}</span></div>
      <div class="tile"><span class="tile-label">a_t after · balance</span><span class="tile-value">{{ last ? last.aT.toLocaleString("en-US") : "—" }} · {{ account.balance.toLocaleString("en-US") }}</span></div>
      <div class="tile" :class="{ bad: last?.full }"><span class="tile-label">φ₇</span><span class="tile-value">{{ last ? last.r7 : "—" }}</span></div>
      <div class="tile"><span class="tile-label">gas charged</span><span class="tile-value">{{ last ? last.gas.toLocaleString("en-US") : "—" }}</span></div>
    </div>
    <ol v-if="last" class="steps">
      <li>Charge first: 2,442 + ⌈3,358 × {{ key.length }} / 1,024⌉ + ⌈216 × {{ length }} / 1,024⌉ = {{ last.gas.toLocaleString("en-US") }}.</li>
      <li>"{{ key }}" held {{ last.old === null ? "nothing" : `${last.old} bytes` }}; {{ length === 0 ? "an empty value deletes it" : `the new value is ${length} bytes` }}.</li>
      <li>After: a_t = 100 + 10 × items + bytes = {{ last.aT.toLocaleString("en-US") }}{{ last.full ? ` > the balance, ${account.balance.toLocaleString("en-US")}` : ` ≤ ${account.balance.toLocaleString("en-US")}` }}.</li>
      <li>{{ last.full ? "FULL, 2^64 − 5: nothing written, the account as it was." : `Committed. φ₇ = ${last.old === null ? "NONE: nothing was there" : `${last.old}, the old value's length`}.` }}</li>
    </ol>
    <p v-else class="line">The tests' account: 2 items in 50 bytes, a balance of 1,000, so a_t = 100 + 10 × 2 + 50 = 170. Each key it stores costs 1 item and 34 + |key| + |value| bytes.</p>
    <div class="controls">
      <span class="muted">key</span>
      <button v-for="k in ['last', 'count']" :key="k" class="small" :class="{ chosen: key === k }" @click="key = k">"{{ k }}"</button>
      <span class="muted">value</span>
      <button v-for="n in [3, 0, 1000]" :key="n" class="small" :class="{ chosen: length === n }" @click="length = n">{{ n === 0 ? "empty: delete" : `${n} bytes` }}</button>
      <span class="muted">balance</span>
      <button v-for="b in [1000, 2000]" :key="b" class="small" :class="{ chosen: account.balance === b }" @click="setBalance(b)">{{ b.toLocaleString("en-US") }}</button>
    </div>
    <div class="controls">
      <button class="small go" @click="go">write ▶</button>
      <button class="small" @click="reset">start again</button>
    </div>
    <p class="row-says">its storage</p>
    <p class="store">{{ Object.keys(account.storage).length ? Object.entries(account.storage).map(([k, v]) => `"${k}" → ${v} bytes`).join(", ") : "empty" }}</p>
  </div>
</template>

<style scoped>
/* fixed columns, nothing wraps: the readout keeps one height whatever is written */
.write-store .readout { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); }
.tile .tile-value { font-size: 16px; white-space: nowrap; }
.tile.bad { border-color: var(--changed-line); background: var(--changed); }
.line, .steps { margin: 8px 0; font-size: 14px; line-height: 1.55; min-height: 7.8em; }
.steps { padding-left: 1.4em; }
.controls { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin: 0 0 6px; }
.controls button.small { min-height: 32px; }
.go { border-color: var(--vp-c-brand-1); color: var(--vp-c-brand-1); font-weight: 600; }
.muted { font-size: 12px; color: var(--vp-c-text-2); }
.row-says { margin: 8px 0 2px; font-size: 12px; color: var(--vp-c-text-2); }
.store { margin: 0; font-family: var(--vp-font-family-mono); font-size: 13px; }
</style>
