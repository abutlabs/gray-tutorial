<!-- Lesson 4.7: a whole block as a strip, the header then the five extrinsic parts in
     Appendix C's order, each as wide as its bytes. Tap a part for its byte range, its items
     and the first and last field the decode trace names; switch to full and watch the
     epoch mark and two juries of 683 dwarf the rest. Computed in block-strip.ts. -->
<script setup lang="ts">
import { computed, ref } from "vue";
import { LAYOUTS, share, WHY_FULL, type Layout, type Part } from "./block-strip.ts";

const layout = ref<Layout>(LAYOUTS[0]);
const picked = ref("header");
const part = computed<Part>(() => layout.value.parts.find((p) => p.name === picked.value)!);
const fmt = (n: number) => n.toLocaleString("en-US");
const size = computed(() => part.value.to - part.value.from);
</script>

<template>
  <div class="widget block-strip">
    <div class="readout" aria-live="polite">
      <div class="tile"><span class="tile-label">part</span><span class="tile-value">{{ part.name }}</span></div>
      <div class="tile"><span class="tile-label">bytes</span><span class="tile-value">{{ fmt(part.from) }}..{{ fmt(part.to) }}</span></div>
      <div class="tile"><span class="tile-label">how many</span><span class="tile-value">{{ fmt(size) }}</span></div>
      <div class="tile"><span class="tile-label">{{ part.items === null ? "fields in the trace" : "items" }}</span><span class="tile-value">{{ fmt(part.items ?? part.fields) }}</span></div>
    </div>
    <p class="line">
      {{ part.says }}.
      The trace's first field here is <code>{{ part.first }}</code>, its last <code>{{ part.last }}</code>{{ part.items === null ? `, ${fmt(part.fields)} fields in all` : "" }}.
      <template v-if="layout.size === 'full' && WHY_FULL[part.name]"> On full, {{ WHY_FULL[part.name] }}.</template>
    </p>
    <div class="controls" role="group" aria-label="which size">
      <button v-for="l in LAYOUTS" :key="l.size" class="small" :class="{ chosen: l.size === layout.size }" :aria-pressed="l.size === layout.size" @click="layout = l">{{ l.size }}: {{ fmt(l.total) }} bytes, {{ fmt(l.fields) }} fields</button>
    </div>
    <div class="strip" role="group" :aria-label="`the ${layout.size} block's parts, each as wide as its bytes`">
      <button v-for="p in layout.parts" :key="p.name" class="seg" :class="[p.name, { on: p.name === picked }]" :style="{ flexGrow: share(p, layout) * 100 }"
        :aria-label="`${p.name}: ${p.to - p.from} bytes`" :aria-pressed="p.name === picked" @click="picked = p.name"><span>{{ p.name }}</span></button>
    </div>
    <p class="order">
      <template v-for="(p, k) in layout.parts" :key="p.name">{{ k ? " → " : "" }}<span :class="p.name">{{ p.name }} <small>{{ fmt(p.to - p.from) }}</small></span></template>
    </p>
  </div>
</template>

<style scoped>
.tile .tile-value { min-width: 7ch; }
.line { margin: 8px 0; font-size: 14px; line-height: 1.6; min-height: 4.8em; overflow-wrap: anywhere; }
.controls { display: flex; flex-wrap: wrap; gap: 6px; margin: 0 0 8px; }
.controls button.small { min-height: 32px; }
.strip { display: flex; gap: 2px; }
.seg { flex: 1 1 0; min-width: 0; min-height: 40px; padding: 0 2px; border: 1px solid var(--vp-c-divider); border-radius: 3px; font-size: 12px; color: var(--vp-c-text-1); cursor: pointer; opacity: 0.75; overflow: hidden; }
.seg span { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.seg.on { opacity: 1; border: 2px solid var(--vp-c-brand-1); font-weight: 700; }
.header { background: var(--vp-c-default-soft); }
.tickets { background: var(--bit-top); }
.preimages { background: var(--bit-low); }
.guarantees { background: var(--vp-c-brand-soft); }
.assurances { background: var(--bit-mark); }
.disputes { background: var(--changed); }
.order { margin: 6px 0 0; font-family: var(--vp-font-family-mono); font-size: 12px; line-height: 1.9; overflow-wrap: anywhere; }
.order span { padding: 0 4px; border-radius: 3px; }
.order small { color: var(--vp-c-text-2); }
</style>
