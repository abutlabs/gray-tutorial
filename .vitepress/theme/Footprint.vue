<!-- Lesson 14.2: a service's footprint and minimum balance. Add or remove requests and
     storage entries, set the balance and the free allowance, and the readout shows items,
     octets, a_t written out term by term, and whether the balance covers it. Computed in
     footprint.ts. -->
<script setup lang="ts">
import { computed, ref } from "vue";
import { footprint, minimumBalance, PER_ENTRY, PER_REQUEST, PRESETS, type Entry, type Request } from "./footprint.ts";

const storage = ref<Entry[]>([]);
const requests = ref<Request[]>([{ length: 159_322 }, { length: 50 }]);
const balance = ref<bigint>(200_000n);
const gratis = ref<bigint>(0n);
const fp = computed(() => footprint(storage.value, requests.value));
const min = computed(() => minimumBalance(fp.value.items, fp.value.bytes, gratis.value));
const covered = computed(() => balance.value >= min.value.owed);
const fmt = (n: bigint | number) => n.toLocaleString("en-US");
const load = (p: typeof PRESETS[number]) => { storage.value = p.storage.map((e) => ({ ...e })); requests.value = p.requests.map((r) => ({ ...r })); balance.value = p.balance; gratis.value = p.gratis; };
const big = (e: Event): bigint => { const t = (e.target as HTMLInputElement).value.replace(/[^\d]/g, ""); return t ? BigInt(t) : 0n; };
</script>

<template>
  <div class="widget footprint">
    <div class="readout" aria-live="polite">
      <div class="tile"><span class="tile-label">items, i</span><span class="tile-value">{{ fp.items }}</span></div>
      <div class="tile"><span class="tile-label">octets, o</span><span class="tile-value">{{ fmt(fp.bytes) }}</span></div>
      <div class="tile"><span class="tile-label">a_t, the minimum</span><span class="tile-value">{{ fmt(min.owed) }}</span></div>
      <div class="tile" :class="{ wrong: !covered }"><span class="tile-label">balance covers it</span><span class="tile-value">{{ covered ? "yes" : "no" }}</span></div>
    </div>
    <p class="line">
      items = 2 × {{ requests.length }} request{{ requests.length === 1 ? "" : "s" }} + {{ storage.length }} entr{{ storage.length === 1 ? "y" : "ies" }} = {{ fp.items }};
      octets = {{ requests.map((r) => `(${PER_REQUEST} + ${fmt(r.length)})`).concat(storage.map((e) => `(${PER_ENTRY} + ${e.key} + ${e.value})`)).join(" + ") || "0" }} = {{ fmt(fp.bytes) }};
      a_t = max(0, {{ min.terms }}).
    </p>
    <div class="controls">
      <button v-for="p in PRESETS" :key="p.name" class="small" @click="load(p)">{{ p.name }}</button>
    </div>
    <div class="controls">
      <label class="num">balance <input :value="balance.toString()" type="text" inputmode="numeric" aria-label="the balance" @input="balance = big($event)" /></label>
      <label class="num">gratis, f <input :value="gratis.toString()" type="text" inputmode="numeric" aria-label="the free allowance" @input="gratis = big($event)" /></label>
    </div>
    <p class="row-says">requests, each {{ PER_REQUEST }} octets plus its data</p>
    <div class="row">
      <label v-for="(r, i) in requests" :key="i" class="num">length <input v-model.number="r.length" type="number" min="0" aria-label="the request's length" /><button class="small" aria-label="remove" @click="requests.splice(i, 1)">✕</button></label>
      <button class="small" @click="requests.push({ length: 100 })">+ request</button>
    </div>
    <p class="row-says">storage entries, each {{ PER_ENTRY }} octets plus key and value</p>
    <div class="row">
      <label v-for="(e, i) in storage" :key="i" class="num">key <input v-model.number="e.key" type="number" min="0" aria-label="the key's length" /> value <input v-model.number="e.value" type="number" min="0" aria-label="the value's length" /><button class="small" aria-label="remove" @click="storage.splice(i, 1)">✕</button></label>
      <button class="small" @click="storage.push({ key: 4, value: 12 })">+ entry</button>
    </div>
  </div>
</template>

<style scoped>
.tile .tile-value { min-width: 5ch; }
/* a balance that doesn't cover the deposit: red (custom.css) */
.tile.wrong { background: var(--changed); border-color: var(--changed-line); }
.line { margin: 8px 0; font-size: 14px; line-height: 1.6; min-height: 4.8em; overflow-wrap: anywhere; }
.controls { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin: 0 0 6px; }
.controls button.small, .row button.small { min-height: 32px; }
.row-says { margin: 8px 0 4px; font-size: 12px; color: var(--vp-c-text-2); }
.row { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
.num { display: inline-flex; align-items: center; gap: 4px; font-size: 13px; color: var(--vp-c-text-2); }
.num input { width: 9ch; min-height: 32px; padding: 0 6px; border: 1px solid var(--vp-c-divider); border-radius: 4px; background: var(--vp-c-bg); color: var(--vp-c-text-1); font-family: var(--vp-font-family-mono); font-size: 13px; }
.controls .num input { width: 22ch; }
</style>
