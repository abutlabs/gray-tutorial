<!-- Lesson 15.8: Y lays out memory. Pick a program or set its sizes; the address space is
     listed bottom to top, each section with its addresses, pages and access, and the gaps
     between with their sizes. Tap a row to touch its first byte. Computed in y-layout.ts. -->
<script setup lang="ts">
import { computed, ref } from "vue";
import { hex, layout, pages, PRESETS, size, touch } from "./y-layout.ts";
import type { Row, Sizes } from "./y-layout.ts";

const sizes = ref<Sizes>({ ...PRESETS[0].sizes });
const out = computed(() => layout(sizes.value));
const chosen = ref<Row | null>(null);
const pick = (s: Sizes) => { sizes.value = { ...s }; chosen.value = null; };
const FIELDS: { key: keyof Sizes; label: string; max: number }[] = [
  { key: "o", label: "|o|", max: 2 ** 24 },
  { key: "w", label: "|w|", max: 2 ** 24 },
  { key: "z", label: "z pages", max: 4096 },
  { key: "s", label: "s", max: 2 ** 24 },
  { key: "a", label: "|a|", max: 2 ** 24 },
];
const setField = (k: keyof Sizes, v: number) => { if (Number.isInteger(v) && v >= 0) { sizes.value = { ...sizes.value, [k]: v }; chosen.value = null; } };
const same = (a: Sizes, b: Sizes) => (Object.keys(a) as (keyof Sizes)[]).every((k) => a[k] === b[k]);
</script>

<template>
  <div class="widget y-layout">
    <div class="readout" aria-live="polite">
      <div class="tile"><span class="tile-label">r0, the halt address</span><span class="tile-value hash">{{ hex(out.registers.r0) }}</span></div>
      <div class="tile"><span class="tile-label">r1, the stack's top</span><span class="tile-value hash">{{ hex(out.registers.r1) }}</span></div>
      <div class="tile"><span class="tile-label">r7, the arguments</span><span class="tile-value hash">{{ hex(out.registers.r7) }}</span></div>
      <div class="tile"><span class="tile-label">r8, their length</span><span class="tile-value hash">{{ out.registers.r8.toLocaleString("en-US") }}</span></div>
    </div>
    <p class="line">
      <template v-if="chosen"><b>{{ chosen.name }}</b>, {{ hex(chosen.from) }} to {{ hex(chosen.to - 1) }}: {{ chosen.says }}. Touch {{ hex(chosen.from) }}: {{ touch(out.rows, chosen.from) }}.</template>
      <template v-else>Tap a row to touch its first byte. Sections end on whole pages; the empty zones between them are why a program that runs off one section hits nothing.</template>
    </p>
    <div class="controls">
      <button v-for="p in PRESETS" :key="p.name" class="small" :class="{ chosen: same(sizes, p.sizes) }" @click="pick(p.sizes)">{{ p.name }}</button>
    </div>
    <div class="controls">
      <label v-for="f in FIELDS" :key="f.key" class="num">{{ f.label }}
        <input type="number" min="0" :max="f.max" :value="sizes[f.key]" :aria-label="f.label" @change="setField(f.key, Number(($event.target as HTMLInputElement).value))" />
      </label>
    </div>
    <ol class="ladder" aria-label="the address space, from 0 up">
      <li v-for="r in out.rows" :key="r.from">
        <button class="row" :class="[r.access ?? (r.from === 0 ? 'panic' : 'gap'), { chosen: chosen?.from === r.from }]" @click="chosen = r">
          <span class="name">{{ r.name }}</span>
          <span class="range">{{ hex(r.from) }} – {{ hex(r.to - 1) }}</span>
          <span class="what">{{ r.access ? `${r.access} · ${pages(r)} page${pages(r) === 1 ? "" : "s"}` : size(r.to - r.from) }}</span>
        </button>
      </li>
    </ol>
    <p class="legend">Not to scale: the sections are a few pages; the gap in the middle is nearly 4 GiB.</p>
  </div>
</template>

<style scoped>
.tile .tile-value { font-size: 15px; min-width: 10ch; }
.line { margin: 8px 0; font-size: 14px; line-height: 1.6; min-height: 4.8em; }
.controls { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin: 0 0 6px; }
.controls button.small { min-height: 32px; }
.num { display: inline-flex; align-items: center; gap: 4px; font-size: 13px; color: var(--vp-c-text-2); font-family: var(--vp-font-family-mono); }
.num input { width: 9ch; min-height: 32px; padding: 0 6px; border: 1px solid var(--vp-c-divider); border-radius: 4px; background: var(--vp-c-bg); color: var(--vp-c-text-1); font-family: var(--vp-font-family-mono); font-size: 13px; }
.ladder { list-style: none; margin: 8px 0 0; padding: 0; display: flex; flex-direction: column; gap: 3px; }
.row { display: grid; grid-template-columns: minmax(8em, 1.2fr) minmax(12em, 1.5fr) 1fr; gap: 2px 10px; width: 100%; min-height: 32px; padding: 5px 8px; border: 1px solid var(--vp-c-divider); border-radius: 4px; text-align: left; font-size: 13px; color: var(--vp-c-text-1); cursor: pointer; }
.row .range { font-family: var(--vp-font-family-mono); font-size: 12px; color: var(--vp-c-text-2); }
.row .what { font-family: var(--vp-font-family-mono); font-size: 12px; }
.row.R { background: var(--bit-top); }
.row.W { background: var(--bit-low); }
.row.gap { background: var(--vp-c-bg-soft); border-style: dashed; color: var(--vp-c-text-2); }
.row.panic { background: var(--changed); }
.row.chosen { border: 2px solid var(--vp-c-brand-1); }
.legend { margin: 8px 0 0; font-size: 12px; color: var(--vp-c-text-2); }
@media (max-width: 640px) {
  .row { grid-template-columns: 1fr auto; }
  .row .range { grid-column: 1 / -1; grid-row: 2; }
}
</style>
