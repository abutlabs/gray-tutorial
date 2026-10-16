<!-- A structure as a parcel (parcel.ts): compartments of tappable parts, a readout saying
     what the tapped part is for, its real value and where its bytes are, and under it the
     same parts as the bytes hold them, in Appendix C's order, each as wide as its bytes.
     WorkPackage, WorkDigest and WorkReport each hand it their model, and may put controls of
     their own under the readout (the controls slot). -->
<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type { Parcel } from "./parcel.ts";

const props = defineProps<{ parcel: Parcel }>();
const selected = ref(""); // the whole, until a tap
const reached = ref(new Set<string>());
watch(() => props.parcel, () => { selected.value = ""; }); // a new model: start from the whole

const node = computed(() => (selected.value ? props.parcel.partAt(selected.value) : props.parcel.partAt("")));
const where = computed(() => (selected.value ? props.parcel.compartmentOf(selected.value) : null));
const total = computed(() => props.parcel.bytes.length);
/** The selected part and every part around it: a chip in the chain shows as open. */
const inChain = (path: string) => selected.value === path || selected.value.startsWith(`${path}.`) || selected.value.startsWith(`${path}[`);

function choose(path: string) {
  selected.value = path;
  reached.value = new Set([...reached.value, ...props.parcel.goals.filter((g) => g.reached(path)).map((g) => g.id)]);
}
</script>

<template>
  <div class="widget parcel-widget">
    <div class="readout" aria-live="polite">
      <div class="title">
        <span class="where">{{ where ? where.name : `The whole ${parcel.name.replace(/_/g, " ")}` }}</span>
        <b>{{ selected || parcel.name }}</b>
      </div>
      <p class="says">
        <template v-if="selected"><UnitText :text="parcel.saysOf(node)" /></template>
        <template v-else>{{ parcel.whole }}</template>
      </p>
      <p class="value"><UnitText :text="parcel.valueOf(node)" /></p>
      <p class="at"><UnitText :text="`${parcel.bytesOf(node)}: ${parcel.hexOf(node)}`" /></p>
    </div>

    <!-- a widget's own controls, under the readout: the digest's two cases -->
    <slot name="controls" />

    <div class="parcel" :aria-label="`the ${parcel.name}'s parts`">
      <section v-for="c in parcel.compartments" :key="c.id" class="compartment" :class="[`tone-${c.tone}`, { stapled: c.stapled }]">
        <p class="label"><b>{{ c.name }}</b> {{ c.says }}</p>
        <div v-for="(row, r) in parcel.chipRows(c.id, selected)" :key="r" class="chips" :class="{ inner: r > 0 }">
          <button v-for="p in row" :key="p" class="small" :class="{ chosen: selected === p, open: selected !== p && inChain(p) }"
            :aria-pressed="selected === p" @click="choose(p)">{{ parcel.labelOf(p) }}</button>
        </div>
      </section>
    </div>

    <p class="wire-says">The same {{ parcel.name.replace(/_/g, " ") }} as the bytes hold it, each part as wide as its bytes: {{ total }} in all.</p>
    <div class="wire" role="group" aria-label="the bytes, in Appendix C's order">
      <button v-for="w in parcel.wire" :key="w.path" class="seg" :class="[`tone-${w.tone}`, { on: inChain(w.path) }]" :style="{ flexGrow: w.bytes }"
        :aria-label="`${w.path}: ${w.bytes} bytes`" @click="choose(w.path)">{{ w.bytes }}</button>
    </div>
    <p class="wire-order">
      <template v-for="(w, k) in parcel.wire" :key="w.path">{{ k ? " → " : "" }}<span :class="`tone-${w.tone}`">{{ w.path }}</span></template>
    </p>

    <ul class="goals">
      <li v-for="g in parcel.goals" :key="g.id" :class="{ done: reached.has(g.id) }">{{ reached.has(g.id) ? "✓" : "○" }} {{ g.say }}</li>
    </ul>
  </div>
</template>

<style scoped>
/* the shared .widget .readout is a row of tiles; this one is a card of lines that never resizes */
.parcel-widget .readout { display: block; min-height: 160px; }
.title { display: flex; flex-wrap: wrap; align-items: baseline; gap: 2px 10px; font-size: 16px; overflow-wrap: anywhere; }
.where { font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em; color: var(--vp-c-text-2); }
.says { margin: 6px 0; line-height: 1.5; }
.value, .at { margin: 4px 0 0; font-family: var(--vp-font-family-mono); font-size: 14px; overflow-wrap: anywhere; }
.at { font-size: 13px; color: var(--vp-c-text-2); }
.parcel { border: 2px solid var(--vp-c-text-3); border-radius: 6px; padding: 8px; display: flex; flex-direction: column; gap: 8px; margin: 8px 0 12px; }
.compartment { border-radius: 4px; padding: 6px 8px 8px; }
.tone-green { background: var(--vp-c-success-soft); }
.tone-grey { background: var(--vp-c-default-soft); }
.tone-brand { background: var(--vp-c-brand-soft); }
.tone-amber { background: var(--vp-c-warning-soft); }
.tone-purple { background: var(--vp-c-important-soft); }
/* a stapled compartment, like the package's slip: a dashed edge */
.compartment.stapled { border: 1px dashed var(--vp-c-text-3); }
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
  .widget.parcel-widget { padding: 12px; }
  .parcel-widget .readout { min-height: 230px; }
}
</style>
