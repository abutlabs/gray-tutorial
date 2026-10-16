<!-- Lesson 15.1: the lesson's eight-byte blob, tappable: which part each byte is and what
     it says; flip the bitmask's bits and watch which code bytes count as instruction
     starts and whether the jump still lands on one. Below, the real service's layers to
     scale. Computed in blob-layers.ts. -->
<script setup lang="ts">
import { computed, ref } from "vue";
import { BLOB, BLOB_PARTS, CODE_PREIMAGE, flip, landsOnOne, LAYERS, parts, starts } from "./blob-layers.ts";

const k = ref(BLOB[7]);
const picked = ref(7);
const blob = computed(() => [...BLOB.slice(0, 7), k.value]);
const all = computed(() => parts(blob.value));
const part = computed(() => all.value.find((p) => p.from <= picked.value && picked.value < p.to)!);
const codeStarts = computed(() => starts(k.value, 3));
const lands = computed(() => landsOnOne(k.value, BLOB[3], 3));
const hex = (b: number) => b.toString(16).padStart(2, "0");
const fmt = (n: number) => n.toLocaleString("en-US");
const outer = [{ name: "metadata", bytes: LAYERS.metadata }, { name: "o, read-only", bytes: LAYERS.readOnly }, { name: "w", bytes: LAYERS.readWrite }, { name: "the PVM blob", bytes: LAYERS.blob }];
const inner = [{ name: "sizes", bytes: BLOB_PARTS.sizes }, { name: `j: ${fmt(LAYERS.jumpEntries)} × ${BLOB_PARTS.z}`, bytes: BLOB_PARTS.jumpTable }, { name: "c, the code", bytes: BLOB_PARTS.code }, { name: "k, the bitmask", bytes: BLOB_PARTS.bitmask }];
</script>

<template>
  <div class="widget blob-layers">
    <div class="readout" aria-live="polite">
      <div class="tile"><span class="tile-label">byte {{ picked }}</span><span class="tile-value bytes">{{ hex(blob[picked]) }}</span></div>
      <div class="tile"><span class="tile-label">part</span><span class="tile-value">{{ part.name }}</span></div>
      <div class="tile wide"><span class="tile-label">which says</span><span class="tile-value small">{{ part.says }}</span></div>
      <div class="tile" :class="{ wrong: !lands }"><span class="tile-label">the jump lands on one</span><span class="tile-value">{{ lands ? "yes" : "no" }}</span></div>
    </div>
    <p class="line">
      k = <code class="bytes">{{ hex(k) }}</code> = 0b{{ k.toString(2).padStart(8, "0") }}, read from the lowest bit: byte {{ codeStarts.map((s, i) => `${i} ${s ? "yes" : "no"}`).join(", ") }}.
      {{ lands ? `The jump to byte ${BLOB[3]} lands on an instruction start.` : `The jump to byte ${BLOB[3]} lands mid-instruction: a target must start one.` }}
    </p>
    <div class="strip" role="group" aria-label="the eight bytes">
      <button v-for="(b, i) in blob" :key="i" class="cell unit-byte" :class="[`p${all.findIndex((p) => p.from <= i && i < p.to)}`, { on: i === picked }]" :aria-pressed="i === picked" @click="picked = i"><span class="off">{{ i }}</span>{{ hex(b) }}</button>
    </div>
    <div class="controls">
      <span class="muted">the bitmask's bits, one per code byte:</span>
      <button v-for="i in 3" :key="i" class="small" :class="{ chosen: codeStarts[i - 1] }" :aria-pressed="codeStarts[i - 1]" @click="k = flip(k, i - 1)">byte {{ i - 1 }}: {{ codeStarts[i - 1] ? "starts one" : "an argument" }}</button>
      <button class="small" :disabled="k === BLOB[7]" @click="k = BLOB[7]">reset</button>
    </div>
    <p class="row-says">the bootstrap service's code preimage, {{ fmt(CODE_PREIMAGE) }} bytes, to scale</p>
    <div class="bar">
      <span v-for="l in outer" :key="l.name" class="seg" :style="{ flexGrow: Math.max(1, l.bytes / 400) }" :title="`${l.name}: ${fmt(l.bytes)} bytes`"><span>{{ l.bytes > 5000 ? l.name : "" }}</span></span>
    </div>
    <p class="row-says">inside the PVM blob, {{ fmt(LAYERS.blob) }} bytes</p>
    <div class="bar inner">
      <span v-for="l in inner" :key="l.name" class="seg" :style="{ flexGrow: Math.max(1, l.bytes / 400) }" :title="`${l.name}: ${fmt(l.bytes)} bytes`"><span>{{ l.bytes > 5000 ? l.name : "" }}</span></span>
    </div>
    <p class="legend">{{ fmt(LAYERS.code) }} bytes of code need ⌈{{ fmt(LAYERS.code) }} / 8⌉ = {{ fmt(LAYERS.bitmask) }} bytes of bitmask; {{ fmt(LAYERS.jumpEntries) }} jump-table entries of {{ BLOB_PARTS.z }} bytes take {{ fmt(BLOB_PARTS.jumpTable) }}; the metadata, {{ LAYERS.metadata }} bytes, is too thin to see.</p>
  </div>
</template>

<style scoped>
.tile .tile-value { min-width: 4ch; }
.tile.wide .tile-value { min-width: 22ch; }
.tile .tile-value.small { font-size: 14px; }
/* a jump that misses an instruction start is a change nobody asked for: red (custom.css) */
.tile.wrong { background: var(--changed); border-color: var(--changed-line); }
.line { margin: 8px 0; font-size: 14px; line-height: 1.6; min-height: 4.8em; }
.strip { display: flex; flex-wrap: wrap; gap: 3px; margin: 0 0 8px; font-family: var(--vp-font-family-mono); font-size: 14px; }
.cell { position: relative; min-width: 2.6em; padding: 14px 4px 4px; text-align: center; border: 1px solid; border-radius: 3px; font: inherit; color: var(--vp-c-text-1); cursor: pointer; opacity: 0.75; }
.cell .off { position: absolute; top: 1px; left: 0; right: 0; font-size: 10px; color: var(--vp-c-text-3); }
.cell.on { opacity: 1; font-weight: 700; border-width: 2px; }
/* the three sizes are structure, amber; the jump table, the code and the bitmask each a colour */
.p0, .p1, .p2 { background: var(--bit-mark); border-color: var(--bit-mark-line); }
.p3 { background: var(--vp-c-brand-soft); border-color: var(--vp-c-brand-1); }
.p4 { background: var(--bit-top); border-color: var(--bit-top-line); }
.p5 { background: var(--bit-low); border-color: var(--bit-low-line); }
.controls { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin: 0 0 8px; }
.controls button.small { min-height: 32px; }
.muted { font-size: 12px; color: var(--vp-c-text-2); }
.row-says { margin: 8px 0 4px; font-size: 12px; color: var(--vp-c-text-2); }
.bar { display: flex; gap: 1px; }
.seg { flex: 1 1 0; min-width: 0; min-height: 26px; border: 1px solid var(--vp-c-divider); border-radius: 2px; background: var(--bit-top); font-size: 11px; overflow: hidden; }
.seg span { display: block; padding: 5px 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.bar .seg:nth-child(2) { background: var(--bit-low); }
.bar .seg:nth-child(4) { background: var(--vp-c-brand-soft); }
.bar.inner .seg:nth-child(1) { background: var(--bit-mark); }
.bar.inner .seg:nth-child(2) { background: var(--vp-c-brand-soft); }
.bar.inner .seg:nth-child(3) { background: var(--bit-top); }
.bar.inner .seg:nth-child(4) { background: var(--bit-low); }
.legend { margin: 8px 0 0; font-size: 12px; color: var(--vp-c-text-2); line-height: 1.6; }
</style>
