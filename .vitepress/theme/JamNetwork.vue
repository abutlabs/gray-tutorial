<!-- The start page's JAM network: the cores on top, every validator below. Pick a core and
     lines run to its three guarantors; slide the slot and every R slots they move on one
     core; step a work-package through its trip and watch it go from three validators to
     all of them. Tiny or full, with report_prev_rotation-1's real entropy. Computed in
     network-map.ts. -->
<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type { Size } from "./network-map.ts";
import { coresAt, enough, epochOf, guarantorsOf, NETWORKS, rotationOf, TRIP } from "./network-map.ts";

const size = ref<Size>("full");
const net = computed(() => NETWORKS[size.value]);
const slot = ref(NETWORKS.full.slot);
const core = ref(0);
const step = ref(0);
watch(size, (s) => { slot.value = NETWORKS[s].slot; core.value = 0; });

const cores = computed(() => coresAt(size.value, slot.value));
const guarantors = computed(() => guarantorsOf(cores.value, core.value));
const trip = computed(() => TRIP[step.value]);
const everyone = computed(() => trip.value.who === "all");
const epoch = computed(() => epochOf(size.value));
const rotation = computed(() => rotationOf(size.value, slot.value));
const rotations = computed(() => net.value.E / net.value.R);
const fmt = (n: number) => n.toLocaleString("en-US");

// the drawing: cores in a strip of cells on top, validators in a grid below
const W = 340;
const layout = computed(() => {
  const full = size.value === "full";
  const coreCols = full ? 31 : 2, valCols = full ? 33 : 6;
  const coreCell = W / coreCols, valCell = W / valCols;
  const coreH = full ? coreCell : 56; // tiny's two cores: wide, not square
  const coreRows = Math.ceil(net.value.cores / coreCols), valRows = Math.ceil(net.value.validators / valCols);
  const gap = full ? 70 : 90;
  const top = 16, valTop = top + coreRows * coreH + gap;
  return { full, coreCols, valCols, coreCell, coreH, valCell, top, valTop, height: valTop + valRows * valCell + 4 };
});
const coreAt = (c: number) => {
  const l = layout.value;
  return { x: (c % l.coreCols) * l.coreCell, y: l.top + Math.floor(c / l.coreCols) * l.coreH };
};
const valAt = (v: number) => {
  const l = layout.value;
  return { x: (v % l.valCols) * l.valCell, y: l.valTop + Math.floor(v / l.valCols) * l.valCell };
};
const centre = (p: { x: number; y: number }, w: number, h = w) => ({ x: p.x + w / 2, y: p.y + h / 2 });
const lines = computed(() => {
  const from = centre(coreAt(core.value), layout.value.coreCell, layout.value.coreH);
  const to = everyone.value ? cores.value.map((_, v) => v) : guarantors.value;
  return to.map((v) => ({ v, from, to: centre(valAt(v), layout.value.valCell) }));
});
const isGuarantor = (v: number) => cores.value[v] === core.value;

const setCore = (c: number) => { core.value = ((c % net.value.cores) + net.value.cores) % net.value.cores; };
const say = computed(() => trip.value.says(net.value, core.value, guarantors.value));
</script>

<template>
  <div class="widget jam-network">
    <div class="readout" aria-live="polite">
      <div class="tile"><span class="tile-label">slot {{ fmt(slot) }}</span><span class="tile-value">rotation {{ rotation + 1 }} of {{ rotations }}</span></div>
      <div class="tile"><span class="tile-label">core {{ core }} of {{ fmt(net.cores) }}, its guarantors</span><span class="tile-value">{{ guarantors.join(", ") }}</span></div>
      <div class="tile"><span class="tile-label">validators working the package</span><span class="tile-value">{{ everyone ? fmt(net.validators) : 3 }} of {{ fmt(net.validators) }}</span></div>
    </div>
    <p class="line">{{ say }}</p>

    <div class="controls" role="group" aria-label="network">
      <button class="small" :class="{ chosen: size === 'full' }" :aria-pressed="size === 'full'" @click="size = 'full'">full: 1,023 validators, 341 cores</button>
      <button class="small" :class="{ chosen: size === 'tiny' }" :aria-pressed="size === 'tiny'" @click="size = 'tiny'">tiny: 6 and 2</button>
    </div>
    <div class="controls" role="group" aria-label="a work-package's trip">
      <button v-for="(s, i) in TRIP" :key="s.id" class="small" :class="{ chosen: step === i }" :aria-pressed="step === i" @click="step = i">{{ s.title }}</button>
    </div>
    <div class="controls">
      <span class="label">core</span>
      <button class="small step" aria-label="previous core" @click="setCore(core - 1)">−</button>
      <span class="num">{{ core }}</span>
      <button class="small step" aria-label="next core" @click="setCore(core + 1)">+</button>
      <label class="slot">slot <input :key="size" v-model.number="slot" type="range" :min="epoch.first" :max="epoch.last" aria-label="slot" /></label>
    </div>

    <svg class="map" :viewBox="`0 0 ${W} ${layout.height}`" role="img" :aria-label="`${net.cores} cores above ${net.validators} validators; core ${core}'s guarantors are ${guarantors.join(', ')}`">
      <text class="label-text" x="0" :y="layout.top - 5">{{ fmt(net.cores) }} cores</text>
      <text class="label-text" x="0" :y="layout.valTop - 5">{{ fmt(net.validators) }} validators</text>
      <g class="links" :class="{ all: everyone }">
        <line v-for="l in lines" :key="l.v" :x1="l.from.x" :y1="l.from.y" :x2="l.to.x" :y2="l.to.y" />
      </g>
      <rect v-for="c in net.cores" :key="`c${c}`" class="core" :class="{ on: c - 1 === core }"
        :x="coreAt(c - 1).x + 0.5" :y="coreAt(c - 1).y + 0.5" :width="layout.coreCell - 1" :height="layout.coreH - 1" :rx="layout.full ? 1 : 6" @click="setCore(c - 1)" />
      <rect v-for="v in net.validators" :key="`v${v}`" class="validator" :class="{ guarantor: isGuarantor(v - 1), shard: everyone }"
        :x="valAt(v - 1).x + 0.5" :y="valAt(v - 1).y + 0.5" :width="layout.valCell - 1" :height="layout.valCell - 1" :rx="layout.full ? 5 : 20" @click="setCore(cores[v - 1])" />
      <template v-if="!layout.full">
        <text v-for="c in net.cores" :key="`ct${c}`" class="cell-text" :class="{ on: c - 1 === core }" :x="coreAt(c - 1).x + layout.coreCell / 2" :y="coreAt(c - 1).y + layout.coreH / 2 + 5" text-anchor="middle">core {{ c - 1 }}</text>
        <text v-for="v in net.validators" :key="`vt${v}`" class="cell-text" :class="{ on: isGuarantor(v - 1) }" :x="valAt(v - 1).x + layout.valCell / 2" :y="valAt(v - 1).y + layout.valCell / 2 + 5" text-anchor="middle">v{{ v - 1 }}</text>
      </template>
    </svg>
    <p class="note">Every square below is a validator; tap one to see the core it works this rotation. Each works one core at a time, three to a core, and moves on to the next core every {{ net.R }} slots. The seats are dealt with real randomness, η₂ of the reports vector report_prev_rotation-1, and the shards, assurances and accumulation take every validator.</p>
  </div>
</template>

<style scoped>
.jam-network .readout { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); }
.tile { min-width: 0; }
.tile .tile-value { font-size: 15px; white-space: normal; line-height: 1.35; min-height: 1.35em; }
.line { margin: 8px 0; font-size: 14px; line-height: 1.6; min-height: 4.8em; }
.controls { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin: 0 0 8px; }
.controls button.small { min-height: 32px; }
.controls button.step { min-width: 36px; font-size: 16px; }
.label { font-size: 13px; color: var(--vp-c-text-2); }
.num { min-width: 3ch; text-align: center; font-family: var(--vp-font-family-mono); }
.slot { display: inline-flex; align-items: center; gap: 6px; flex: 1 1 180px; font-size: 13px; color: var(--vp-c-text-2); }
.slot input { flex: 1; min-width: 0; height: 32px; }
.map { display: block; width: 100%; max-width: 440px; height: auto; margin: 4px 0 6px; }
.label-text { font-size: 10px; fill: var(--vp-c-text-2); }
.cell-text { font-size: 13px; font-weight: 600; fill: var(--vp-c-text-1); pointer-events: none; font-family: var(--vp-font-family-mono); }
.cell-text.on { fill: var(--vp-c-white); }
.core { fill: var(--vp-c-bg-soft); stroke: var(--vp-c-divider); stroke-width: 0.5; cursor: pointer; }
.core.on { fill: var(--vp-c-brand-1); stroke: var(--vp-c-brand-1); }
.validator { fill: var(--vp-c-bg-soft); stroke: var(--vp-c-divider); stroke-width: 0.5; cursor: pointer; transition: fill 0.25s; }
.validator.shard { fill: var(--bit-low); stroke: var(--bit-low-line); }
.validator.guarantor { fill: var(--vp-c-brand-1); stroke: var(--vp-c-brand-1); }
.links line { stroke: var(--vp-c-brand-1); stroke-width: 1.2; }
.links.all line { stroke: var(--bit-low-line); stroke-width: 0.3; opacity: 0.6; }
.note { margin: 6px 0 0; font-size: 13px; color: var(--vp-c-text-2); line-height: 1.5; }
@media (prefers-reduced-motion: reduce) { .validator { transition: none; } }
</style>
