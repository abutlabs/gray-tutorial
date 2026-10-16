<!-- Lesson 16.2: fetch copying part of an item. Pick the item, where it goes (φ₇), from which
     byte (φ₈) and how many (φ₉): the item's bytes with the copied window lit, what landed in
     memory, φ₇ after, and the gas. Computed in fetch-copy.ts. -->
<script setup lang="ts">
import { computed, ref } from "vue";
import { BUDGET, fetchItem, ITEMS, PAGE, show } from "./fetch-copy.ts";

const kind = ref(1);
const o = ref(PAGE);
const from = ref(30);
const z = ref(10);
const item = computed(() => ITEMS.find((i) => i.kind === kind.value)!);
const r = computed(() => fetchItem(kind.value, o.value, BigInt(from.value), BigInt(z.value)));
const hx = (b: number) => b.toString(16).padStart(2, "0");
const lit = (k: number) => k >= r.value.f && k < r.value.f + r.value.l && r.value.exit !== "panic";
const PRESETS = [
  { kind: 1, o: PAGE, from: 30, z: 10, says: "entropy from byte 30, 10 wanted" },
  { kind: 0, o: PAGE, from: 0, z: 122, says: "all the constants" },
  { kind: 0, o: PAGE, from: 0, z: 0, says: "0 bytes: just the length" },
  { kind: 7, o: PAGE, from: 0, z: 10, says: "item 7" },
  { kind: 0, o: 0x50000, from: 0, z: 122, says: "to 0x50000, no page" },
];
const pick = (p: (typeof PRESETS)[number]) => { kind.value = p.kind; o.value = p.o; from.value = p.from; z.value = p.z; };
const setNum = (which: "from" | "z", v: string) => { const n = Number(v); if (Number.isInteger(n) && n >= 0) (which === "from" ? from : z).value = n; };
</script>

<template>
  <div class="widget fetch-copy">
    <div class="readout" aria-live="polite">
      <div class="tile"><span class="tile-label">f, l</span><span class="tile-value">{{ r.exit === "halt" && item.bytes ? `${r.f}, ${r.l}` : "—" }}</span></div>
      <div class="tile"><span class="tile-label">φ₇ after</span><span class="tile-value">{{ r.exit === "panic" ? "—" : show(r.r7) }}</span></div>
      <div class="tile"><span class="tile-label">gas left</span><span class="tile-value">{{ r.gas.toLocaleString("en-US") }}</span></div>
      <div class="tile" :class="{ bad: r.exit !== 'halt' }"><span class="tile-label">exit</span><span class="tile-value">{{ r.exit }}</span></div>
    </div>
    <p class="line">
      <template v-if="r.exit === 'panic'">No writable page at 0x{{ o.toString(16) }}: the host can't put the bytes there, and the machine panics.</template>
      <template v-else-if="!item.bytes">Accumulation has no item {{ kind }}: φ₇ = NONE. The asking still cost gas.</template>
      <template v-else>f = min(φ₈, |v|) = {{ r.f }}, l = min(φ₉, |v| − f) = {{ r.l }}: {{ r.l }} byte{{ r.l === 1 ? "" : "s" }} land at 0x{{ o.toString(16) }}, and φ₇ = |v| = {{ item.bytes.length }}, the whole length, so a program can ask for 0 bytes first and learn the size.</template>
    </p>
    <div class="controls">
      <button v-for="p in PRESETS" :key="p.says" class="small" :class="{ chosen: kind === p.kind && o === p.o && from === p.from && z === p.z }" @click="pick(p)">{{ p.says }}</button>
    </div>
    <div class="controls">
      <label class="num">φ₈ from <input type="number" min="0" :value="from" aria-label="from" @change="setNum('from', ($event.target as HTMLInputElement).value)" /></label>
      <label class="num">φ₉ length <input type="number" min="0" :value="z" aria-label="length" @change="setNum('z', ($event.target as HTMLInputElement).value)" /></label>
      <span class="muted">budget {{ BUDGET.toLocaleString("en-US") }}, the block 100</span>
    </div>
    <p class="row-says">item {{ item.says }}{{ item.bytes ? `, ${item.bytes.length} bytes` : "" }}</p>
    <div v-if="item.bytes" class="strip" aria-label="the item's bytes">
      <span v-for="(b, k) in item.bytes" :key="k" class="cell" :class="{ lit: lit(k) }">{{ hx(b) }}</span>
    </div>
    <p v-else class="none">nothing</p>
    <p class="row-says">memory at 0x{{ o.toString(16) }}, after</p>
    <div class="strip">
      <span v-for="k in 12" :key="k" class="cell" :class="{ lit: k - 1 < r.landed.length }">{{ r.exit === "panic" ? "··" : k - 1 < r.landed.length ? hx(r.landed[k - 1]) : "00" }}</span>
      <span class="muted">…</span>
    </div>
  </div>
</template>

<style scoped>
.tile .tile-value { min-width: 6ch; font-size: 20px; }
.tile.bad { border-color: var(--changed-line); background: var(--changed); }
.line { margin: 8px 0; font-size: 14px; line-height: 1.6; min-height: 4.8em; }
.controls { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin: 0 0 6px; }
.controls button.small { min-height: 32px; }
.num { display: inline-flex; align-items: center; gap: 4px; font-size: 13px; color: var(--vp-c-text-2); }
.num input { width: 7ch; min-height: 32px; padding: 0 6px; border: 1px solid var(--vp-c-divider); border-radius: 4px; background: var(--vp-c-bg); color: var(--vp-c-text-1); font-family: var(--vp-font-family-mono); }
.muted { font-size: 12px; color: var(--vp-c-text-2); }
.row-says { margin: 8px 0 4px; font-size: 12px; color: var(--vp-c-text-2); }
.strip { display: flex; flex-wrap: wrap; gap: 2px; font-family: var(--vp-font-family-mono); font-size: 11px; }
.cell { min-width: 1.9em; text-align: center; padding: 2px 0; border: 1px solid var(--vp-c-divider); border-radius: 2px; color: var(--vp-c-text-3); }
.cell.lit { background: var(--bit-top); color: var(--vp-c-text-1); border-color: var(--bit-top-line); font-weight: 700; }
.none { font-size: 13px; color: var(--vp-c-text-3); }
</style>
