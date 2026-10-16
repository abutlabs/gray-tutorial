<!-- Lesson 19.4: Υ's steps in order. Break one of the header's four fields, or make a later
     step refuse: where Υ stops, the error it answers, the steps it never reaches, and the
     state's root, unchanged. Computed in import-steps.ts. -->
<script setup lang="ts">
import { computed, ref } from "vue";
import { HEADER_CHECKS, importWith, ROOT_BEFORE, STEPS } from "./import-steps.ts";

const broken = ref<{ header?: number; step?: number }>({});
const r = computed(() => importWith(broken.value));
const state = (k: number) => (r.value.error === null ? "done" : k < r.value.reached ? "done" : k === r.value.reached ? "refused" : "never");
</script>

<template>
  <div class="widget import-steps">
    <div class="readout" aria-live="polite">
      <div class="tile" :class="{ bad: r.error }"><span class="tile-label">Υ answers</span><span class="tile-value">{{ r.error ?? "imported" }}</span></div>
      <div class="tile"><span class="tile-label">the state's root after</span><span class="tile-value">{{ r.error ? `${ROOT_BEFORE}, as before` : "the new state's" }}</span></div>
    </div>
    <p class="line">
      <template v-if="broken.header !== undefined">The header's {{ HEADER_CHECKS[broken.header].field }} {{ HEADER_CHECKS[broken.header].says }}: {{ r.error }}. Nothing after the header runs; the block is refused whole.</template>
      <template v-else-if="broken.step !== undefined">The header checks out, then {{ STEPS[broken.step].name }} refuses: {{ r.error }}. The steps after it never run, and every change the earlier ones made is dropped.</template>
      <template v-else>Nothing broken: every step runs, in order, and the block is imported. Break something.</template>
    </p>
    <div class="controls">
      <span class="muted">break the header's</span>
      <button v-for="(h, k) in HEADER_CHECKS" :key="h.field" class="small" :class="{ chosen: broken.header === k }" @click="broken = { header: k }">{{ h.field }}</button>
    </div>
    <div class="controls">
      <span class="muted">or make refuse</span>
      <button v-for="k in [1, 2, 3, 4]" :key="k" class="small" :class="{ chosen: broken.step === k }" @click="broken = { step: k }">{{ STEPS[k].name }}</button>
      <button class="small" :class="{ chosen: broken.header === undefined && broken.step === undefined }" @click="broken = {}">nothing</button>
    </div>
    <ol class="steps">
      <li v-for="(s, k) in STEPS" :key="s.name" :class="state(k)"><b>{{ s.name }}</b> <span class="muted">{{ s.part }}</span> <span class="what">{{ state(k) === "refused" ? `refuses: ${r.error}` : state(k) === "never" ? "never runs" : "✓" }}</span></li>
    </ol>
  </div>
</template>

<style scoped>
.import-steps .readout { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); }
.tile { min-width: 0; }
.tile .tile-value { font-size: 16px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.tile.bad { border-color: var(--changed-line); background: var(--changed); }
.line { margin: 8px 0; font-size: 14px; line-height: 1.6; min-height: 4.8em; }
.controls { display: flex; flex-wrap: wrap; align-items: center; gap: 4px; margin: 0 0 6px; }
.controls button.small { min-height: 32px; font-family: var(--vp-font-family-mono); font-size: 12px; }
.muted { font-size: 12px; color: var(--vp-c-text-2); }
.steps { list-style: none; margin: 8px 0 0; padding: 0; display: flex; flex-direction: column; gap: 3px; }
.steps li { display: flex; flex-wrap: wrap; gap: 4px 8px; align-items: baseline; padding: 4px 8px; border: 1px solid var(--vp-c-divider); border-radius: 4px; font-size: 13px; }
.steps li.done { background: var(--bit-low); }
.steps li.refused { background: var(--changed); border-color: var(--changed-line); }
.steps li.never { opacity: 0.45; border-style: dashed; }
.what { margin-left: auto; font-family: var(--vp-font-family-mono); font-size: 12px; }
</style>
