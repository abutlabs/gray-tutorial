<!-- Lesson 15.4: touch an address. Pick a load or a store, a width and an address on a map
     with one writable page, one read-only page and nothing else: the readout gives the
     page, its access, and the outcome, bytes read, a fault naming the page's start, or a
     panic below 2^16. Computed in memory-touch.ts. -->
<script setup lang="ts">
import { computed, ref } from "vue";
import { accessAt, hex, PAGE_SIZE, pageOf, PAGES, PANIC_BELOW, PRESETS, touch, WIDTHS } from "./memory-touch.ts";

const address = ref(0x30005);
const write = ref(false);
const width = ref(1);
const typed = ref("0x30005");
const out = computed(() => touch(address.value, width.value, write.value));
const access = computed(() => accessAt(address.value));
const pick = (p: typeof PRESETS[number]) => { address.value = p.address; write.value = p.write; width.value = p.width; typed.value = hex(p.address); };
const parse = () => { const t = typed.value.trim(); const v = /^0x[0-9a-f]+$/i.test(t) ? parseInt(t, 16) : /^\d+$/.test(t) ? Number(t) : NaN; if (!Number.isNaN(v) && v >= 0 && v < 2 ** 32) address.value = v; };
const regions = [
  { name: "below 2^16: nothing may live here", from: 0, to: PANIC_BELOW, kind: "panic" },
  { name: "0x10000: R", from: 0x10000, to: 0x11000, kind: "R" },
  { name: "no page", from: 0x11000, to: 0x20000, kind: "none" },
  { name: "0x20000: W", from: 0x20000, to: 0x21000, kind: "W" },
  { name: "no page, on to 2^32", from: 0x21000, to: 0x40000, kind: "none" },
];
const inRegion = (r: typeof regions[number]) => address.value >= r.from && address.value < r.to;
</script>

<template>
  <div class="widget memory-touch">
    <div class="readout" aria-live="polite">
      <div class="tile"><span class="tile-label">{{ write ? "store" : "load" }} {{ width }} byte{{ width === 1 ? "" : "s" }} at</span><span class="tile-value">{{ hex(address) }}</span></div>
      <div class="tile"><span class="tile-label">page {{ pageOf(address) }} (÷ {{ PAGE_SIZE }})</span><span class="tile-value">{{ access ?? "absent" }}</span></div>
      <div class="tile wide" :class="{ wrong: !out.ok }"><span class="tile-label">outcome</span><span class="tile-value">{{ out.ok ? (write ? "written" : "bytes read") : "panic" in out ? "panic" : `fault at ${hex(out.fault)}` }}</span></div>
    </div>
    <p class="line">
      <template v-if="out.ok">Every byte is on a page the program may {{ write ? "write" : "read" }}, so the {{ write ? "store" : "load" }} goes ahead{{ write ? "" : " (a fresh page reads as zeros)" }}.</template>
      <template v-else-if="'panic' in out">The lowest bad address is below 2^16 = {{ hex(PANIC_BELOW) }}: a near-null pointer is always a crash, and nothing changes.</template>
      <template v-else>The lowest bad address, rounded down to its page: a fault at {{ hex(out.fault) }}, nothing changed, ı still on the instruction, so whoever runs the machine could add the page and go on.</template>
    </p>
    <div class="controls">
      <button class="small" :class="{ chosen: !write }" :aria-pressed="!write" @click="write = false">load</button>
      <button class="small" :class="{ chosen: write }" :aria-pressed="write" @click="write = true">store</button>
      <span class="muted">width</span>
      <button v-for="w in WIDTHS" :key="w" class="small" :class="{ chosen: width === w }" :aria-pressed="width === w" @click="width = w">{{ w }}</button>
      <label class="num">address <input v-model="typed" type="text" spellcheck="false" aria-label="the address" @change="parse" @keyup.enter="parse" /></label>
    </div>
    <div class="controls">
      <button v-for="p in PRESETS" :key="p.says" class="small" :class="{ chosen: address === p.address && write === p.write && width === p.width }" @click="pick(p)">{{ p.says }}</button>
    </div>
    <div class="map" aria-label="the memory map">
      <span v-for="r in regions" :key="r.name" class="region" :class="[r.kind, { here: inRegion(r) }]" :style="{ flexGrow: r.kind === 'panic' ? 4 : r.kind === 'none' ? 3 : 2 }"><span>{{ r.name }}</span></span>
    </div>
    <p class="legend">Pages of {{ PAGE_SIZE.toLocaleString("en-US") }} bytes: {{ PAGES.map((p) => `${hex(p.start)} is ${p.access}`).join(", ") }}; W is readable too. The map isn't to scale.</p>
  </div>
</template>

<style scoped>
.tile .tile-value { min-width: 7ch; }
.tile.wide .tile-value { min-width: 14ch; }
/* a touch that stops the machine is a change nobody asked for: red (custom.css) */
.tile.wrong { background: var(--changed); border-color: var(--changed-line); }
.line { margin: 8px 0; font-size: 14px; line-height: 1.6; min-height: 4.8em; }
.controls { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin: 0 0 6px; }
.controls button.small { min-height: 32px; }
.muted { font-size: 12px; color: var(--vp-c-text-2); }
.num { display: inline-flex; align-items: center; gap: 4px; font-size: 13px; color: var(--vp-c-text-2); }
.num input { width: 10ch; min-height: 32px; padding: 0 6px; border: 1px solid var(--vp-c-divider); border-radius: 4px; background: var(--vp-c-bg); color: var(--vp-c-text-1); font-family: var(--vp-font-family-mono); font-size: 13px; }
.map { display: flex; gap: 2px; margin: 8px 0 0; }
.region { flex: 1 1 0; min-width: 0; min-height: 36px; border: 1px solid var(--vp-c-divider); border-radius: 3px; font-size: 11px; overflow: hidden; opacity: 0.8; }
.region span { display: block; padding: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.region.panic { background: var(--changed); }
.region.R { background: var(--bit-top); }
.region.W { background: var(--bit-low); }
.region.none { background: var(--vp-c-bg-soft); border-style: dashed; }
.region.here { opacity: 1; border: 2px solid var(--vp-c-brand-1); }
.legend { margin: 8px 0 0; font-size: 12px; color: var(--vp-c-text-2); }
</style>
