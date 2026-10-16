<!-- Lesson 12.3: guarantees onto the cores. Step the block's guarantees in: each report
     takes its core, registered at the block's slot, and the reported packages list keeps
     itself sorted by hash, whatever order the guarantees came in. Computed in onto-cores.ts. -->
<script setup lang="ts">
import { computed, ref } from "vue";
import { GUARANTEES, placeReports, reportedPackages, SLOT } from "./onto-cores.ts";

const placed = ref(0);
const cores = computed(() => placeReports(placed.value));
const reported = computed(() => reportedPackages(placed.value));
const short = (h: string) => `${h.slice(0, 10)}…`;
const arrival = (pkg: string) => GUARANTEES.findIndex((g) => g.pkg === pkg);
</script>

<template>
  <div class="widget onto-cores">
    <div class="readout" aria-live="polite">
      <div class="tile"><span class="tile-label">guarantees placed</span><span class="tile-value">{{ placed }} of {{ GUARANTEES.length }}</span></div>
      <div class="tile"><span class="tile-label">cores holding a report</span><span class="tile-value">{{ cores.filter(Boolean).length }} of {{ cores.length }}</span></div>
      <div class="tile"><span class="tile-label">first reported</span><span class="tile-value small">{{ reported[0] ? short(reported[0].pkg) : "—" }}</span></div>
    </div>
    <p class="line">
      <template v-if="placed === 0">Two guarantees in the block, at slot {{ SLOT }}, both cores free. Step them in.</template>
      <template v-else-if="placed === 1">Core {{ GUARANTEES[0].core }} takes package {{ short(GUARANTEES[0].pkg) }}, registered at slot {{ SLOT }}, the block's slot.</template>
      <template v-else>Core 1's package came second but is reported first: {{ short(GUARANTEES[1].pkg) }} sorts before {{ short(GUARANTEES[0].pkg) }}. A dictionary is kept in key order.</template>
    </p>
    <div class="controls">
      <button class="small go" :disabled="placed === GUARANTEES.length" @click="placed++">place the next guarantee ▶</button>
      <button class="small" :disabled="placed === 0" @click="placed = 0">start again</button>
    </div>
    <div class="panels">
      <section class="panel">
        <p class="row-says">the guarantees, in the block's order</p>
        <p v-for="(g, i) in GUARANTEES" :key="g.pkg" class="row" :class="{ done: i < placed, next: i === placed }">#{{ i }} for core {{ g.core }} · package <span class="mono">{{ short(g.pkg) }}</span></p>
      </section>
      <section class="panel">
        <p class="row-says">ρ′, the cores</p>
        <p v-for="(c, i) in cores" :key="i" class="row" :class="{ held: c }">core {{ i }}: {{ c ? `package ${short(c.pkg)} since ${c.since}` : "free" }}</p>
      </section>
      <section class="panel">
        <p class="row-says">the reported packages, sorted by hash</p>
        <p v-for="r in reported" :key="r.pkg" class="row held"><span class="mono">{{ short(r.pkg) }}</span> exports root <span class="mono">{{ short(r.exportsRoot) }}</span> <span class="muted">came #{{ arrival(r.pkg) }}</span></p>
        <p v-if="!reported.length" class="row muted">none yet</p>
      </section>
    </div>
  </div>
</template>

<style scoped>
.tile .tile-value { min-width: 6ch; font-size: 20px; }
.tile .tile-value.small { min-width: 11ch; font-size: 16px; }
.line { margin: 8px 0; font-size: 14px; line-height: 1.6; min-height: 3.2em; }
.controls { display: flex; flex-wrap: wrap; gap: 6px; margin: 0 0 8px; }
.controls button.small { min-height: 32px; }
.go { border-color: var(--vp-c-brand-1); color: var(--vp-c-brand-1); font-weight: 600; }
.panels { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 8px; }
.panel { padding: 6px 8px; border: 1px solid var(--vp-c-divider); border-radius: 6px; background: var(--vp-c-bg-soft); }
.row-says { margin: 0 0 4px; font-size: 12px; color: var(--vp-c-text-2); }
.row { margin: 2px 0; padding: 3px 6px; border-radius: 4px; font-size: 13px; border: 1px solid transparent; }
.row.done { opacity: 0.55; }
.row.next { border-color: var(--vp-c-brand-1); }
.row.held { background: var(--bit-low); }
.mono { font-family: var(--vp-font-family-mono); }
.muted { font-size: 12px; color: var(--vp-c-text-3); }
</style>
