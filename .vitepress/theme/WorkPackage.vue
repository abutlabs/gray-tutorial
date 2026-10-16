<!-- Lesson 3.1: the tiny work_package vector as a parcel: a permission slip stapled to the
     front, a postmark saying how the chain looked, and the jobs inside. Tap a part to see
     what it's for, its real value and where its bytes are; the strip under the parcel is
     the same package as the bytes hold it, in Appendix C's order, each part as wide as its
     bytes. Everything is computed in work-package.ts from the vector's values. -->
<script setup lang="ts">
import { computed, ref } from "vue";
import { bytesOf, chipRows, compartmentOf, COMPARTMENTS, GOALS, hexOf, labelOf, PACKAGE, partAt, saysOf, valueOf, WIRE } from "./work-package.ts";

const TOTAL = PACKAGE.bytes.length;
const selected = ref(""); // the whole package, until a tap
const reached = ref(new Set<string>());

const node = computed(() => (selected.value ? partAt(selected.value) : PACKAGE.root));
const where = computed(() => (selected.value ? compartmentOf(selected.value) : null));
/** The selected part and every part around it: a chip in the chain shows as open. */
const inChain = (path: string) => selected.value === path || selected.value.startsWith(`${path}.`) || selected.value.startsWith(`${path}[`);

function choose(path: string) {
  selected.value = path;
  reached.value = new Set([...reached.value, ...GOALS.filter((g) => g.reached(path)).map((g) => g.id)]);
}
</script>

<template>
  <div class="widget work-package">
    <div class="readout" aria-live="polite">
      <div class="title">
        <span class="where" :class="where?.id">{{ where ? where.name : "The whole package" }}</span>
        <b>{{ selected || "work_package" }}</b>
      </div>
      <p class="says">
        <template v-if="selected"><UnitText :text="saysOf(node)" /></template>
        <template v-else>A parcel for one of JAM's cores, from the tiny test vector. Tap any part of it.</template>
      </p>
      <p class="value"><UnitText :text="valueOf(node)" /></p>
      <p class="at"><UnitText :text="`${bytesOf(node)}: ${hexOf(node)}`" /></p>
    </div>

    <div class="parcel" aria-label="the work-package's parts">
      <section v-for="c in COMPARTMENTS" :key="c.id" class="compartment" :class="c.id">
        <p class="label"><b>{{ c.name }}</b> {{ c.says }}</p>
        <div v-for="(row, r) in chipRows(c.id, selected)" :key="r" class="chips" :class="{ inner: r > 0 }">
          <button v-for="p in row" :key="p" class="small" :class="{ chosen: selected === p, open: selected !== p && inChain(p) }"
            :aria-pressed="selected === p" @click="choose(p)">{{ labelOf(p) }}</button>
        </div>
      </section>
    </div>

    <p class="wire-says">The same package as the bytes hold it, each part as wide as its bytes: {{ TOTAL }} in all.</p>
    <div class="wire" role="group" aria-label="the package's bytes, in Appendix C's order">
      <button v-for="w in WIRE" :key="w.path" class="seg" :class="[w.compartment, { on: inChain(w.path) }]" :style="{ flexGrow: w.bytes }"
        :aria-label="`${w.path}: ${w.bytes} bytes`" @click="choose(w.path)">{{ w.bytes }}</button>
    </div>
    <p class="wire-order">
      <template v-for="(w, k) in WIRE" :key="w.path">{{ k ? " → " : "" }}<span :class="w.compartment">{{ w.path }}</span></template>
    </p>

    <ul class="goals">
      <li v-for="g in GOALS" :key="g.id" :class="{ done: reached.has(g.id) }">{{ reached.has(g.id) ? "✓" : "○" }} {{ g.say }}</li>
    </ul>
  </div>
</template>

<style scoped>
/* the shared .widget .readout is a row of tiles; this one is a card of lines that never resizes */
.work-package .readout { display: block; min-height: 150px; }
.title { display: flex; flex-wrap: wrap; align-items: baseline; gap: 2px 10px; font-size: 16px; overflow-wrap: anywhere; }
.where { font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em; color: var(--vp-c-text-2); }
.says { margin: 6px 0; line-height: 1.5; }
.value, .at { margin: 4px 0 0; font-family: var(--vp-font-family-mono); font-size: 14px; overflow-wrap: anywhere; }
.at { font-size: 13px; color: var(--vp-c-text-2); }
.parcel { border: 2px solid var(--vp-c-text-3); border-radius: 6px; padding: 8px; display: flex; flex-direction: column; gap: 8px; margin: 8px 0 12px; }
.compartment { border-radius: 4px; padding: 6px 8px 8px; }
.compartment.slip, .wire .slip, .wire-order .slip { background: var(--vp-c-success-soft); }
.compartment.postmark, .wire .postmark, .wire-order .postmark { background: var(--vp-c-default-soft); }
.compartment.jobs, .wire .jobs, .wire-order .jobs { background: var(--vp-c-brand-soft); }
/* the slip is stapled on: a dashed edge */
.compartment.slip { border: 1px dashed var(--vp-c-text-3); }
.label { margin: 0 0 6px; font-size: 13px; line-height: 1.4; color: var(--vp-c-text-2); }
.label b { color: var(--vp-c-text-1); margin-right: 4px; }
.chips { display: flex; flex-wrap: wrap; gap: 4px; }
.chips.inner { margin-top: 6px; padding-left: 12px; border-left: 2px solid var(--vp-c-divider); }
.chips button.small { min-height: 32px; font-family: var(--vp-font-family-mono); font-size: 13px; background: var(--vp-c-bg); }
.chips button.small.chosen { font-weight: 700; }
.chips button.small.open { border-color: var(--vp-c-brand-1); }
.wire-says { margin: 0 0 4px; font-size: 13px; color: var(--vp-c-text-2); }
.wire { display: flex; gap: 2px; }
.seg { min-width: 2.6em; min-height: 36px; padding: 0 2px; border: 1px solid var(--vp-c-divider); border-radius: 3px; font-family: var(--vp-font-family-mono); font-size: 12px; color: var(--vp-c-text-1); cursor: pointer; opacity: 0.7; }
.seg.on { opacity: 1; border: 2px solid var(--vp-c-brand-1); font-weight: 700; }
.wire-order { margin: 4px 0 0; font-family: var(--vp-font-family-mono); font-size: 12px; line-height: 1.7; overflow-wrap: anywhere; }
.wire-order span { padding: 0 3px; border-radius: 3px; }
.goals { list-style: none; padding: 0; margin: 12px 0 0; font-size: 14px; color: var(--vp-c-text-2); }
.goals li.done { color: var(--vp-c-green-1); }
@media (max-width: 640px) {
  .widget.work-package { padding: 12px; }
  .work-package .readout { min-height: 190px; }
}
</style>
