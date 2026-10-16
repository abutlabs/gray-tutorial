<!-- Lesson 10.2: one trial's offenders. Tap a report or an offender: culprit or fault, the
     message its evidence signs, and its place in the offenders mark against its place in
     ψ_O. A toggle makes the second culprit's guarantee a forgery, as in the lesson's
     bad-signatures vector. Computed in offenders.ts. -->
<script setup lang="ts">
import { computed, ref } from "vue";
import { because, FORGED_SECOND_CULPRIT, message, OFFENDERS, offendersMark, recordOffenders, REPORTS } from "./offenders.ts";

const picked = ref(0);
const forged = ref(false);
const o = computed(() => OFFENDERS[picked.value]);
const real = computed(() => !(forged.value && picked.value === 1));
const mark = offendersMark(OFFENDERS);
const psi = recordOffenders([], OFFENDERS);
const report = computed(() => REPORTS.find((r) => r.hash === o.value.report)!);
</script>

<template>
  <div class="widget offenders">
    <div class="readout" aria-live="polite">
      <div class="tile"><span class="tile-label">{{ o.key }}</span><span class="tile-value">{{ o.kind }}</span></div>
      <div class="tile wide"><span class="tile-label">its evidence signs</span><span class="tile-value msg">{{ message(o) }}</span></div>
      <div class="tile" :class="{ wrong: !real }"><span class="tile-label">really theirs</span><span class="tile-value">{{ real ? "true" : "false" }}</span></div>
      <div class="tile"><span class="tile-label">in the mark · in ψ_O</span><span class="tile-value">{{ mark.indexOf(o.key) + 1 }} · {{ psi.indexOf(o.key) + 1 }}</span></div>
    </div>
    <p class="line">
      <template v-if="!real">A forgery: the signature doesn't check out on that message, as in <code>progress_with_bad_signatures-2</code>. The block is refused.</template>
      <template v-else>{{ because(o) }}. Report {{ o.report }} was judged {{ report.verdict }}.</template>
    </p>
    <p class="row-says">the block's two reports</p>
    <div class="row">
      <span v-for="r in REPORTS" :key="r.hash" class="chip" :class="[r.verdict, { on: r.hash === o.report }]">{{ r.hash }} · {{ r.verdict }}</span>
    </div>
    <p class="row-says">the offenders, in the block's order: the offenders mark</p>
    <div class="row" role="group" aria-label="the offenders">
      <button v-for="(x, i) in OFFENDERS" :key="x.key" class="small chip" :class="[x.kind, { on: i === picked, bad: forged && i === 1 }]" :aria-pressed="i === picked" @click="picked = i">{{ i + 1 }}. {{ x.key }} · {{ x.kind }}</button>
    </div>
    <p class="row-says">the same keys in ψ_O, a sorted set</p>
    <div class="row">
      <span v-for="k in psi" :key="k" class="chip" :class="{ on: k === o.key }">{{ k }}</span>
    </div>
    <div class="controls">
      <button class="small" :class="{ chosen: forged }" :aria-pressed="forged" @click="forged = !forged">{{ forged ? "the guarantee is real again" : "forge the second culprit's guarantee" }}</button>
    </div>
  </div>
</template>

<style scoped>
.tile .tile-value { min-width: 6ch; }
.tile.wide .tile-value { min-width: 20ch; }
.tile .tile-value.msg { font-size: 15px; }
/* a forgery is a change nobody asked for: red (custom.css) */
.tile.wrong { background: var(--changed); border-color: var(--changed-line); }
.line { margin: 8px 0; font-size: 14px; line-height: 1.6; min-height: 4.8em; }
.row-says { margin: 8px 0 4px; font-size: 12px; color: var(--vp-c-text-2); }
.row { display: flex; flex-wrap: wrap; gap: 4px; }
.chip { display: inline-block; min-height: 32px; line-height: 30px; padding: 0 8px; border: 1px solid var(--vp-c-divider); border-radius: 999px; background: var(--vp-c-bg-soft); font-family: var(--vp-font-family-mono); font-size: 12px; color: var(--vp-c-text-1); }
button.chip { cursor: pointer; }
.chip.on { border: 2px solid var(--vp-c-brand-1); font-weight: 700; }
.chip.bad { background: var(--changed); border-color: var(--changed-line); }
.chip.good { background: var(--bit-low); }
.chip.culprit { background: var(--bit-mark); }
.chip.fault { background: var(--bit-top); }
.controls { display: flex; flex-wrap: wrap; gap: 6px; margin: 10px 0 0; }
.controls button.small { min-height: 32px; }
</style>
