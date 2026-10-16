<!-- Lesson 10.5: set the report's verdict and a fault's vote and watch rule 6's three terms
     agree or not; add a culprit, or drop the fault from a good verdict, and see which name
     the block is refused under, or that a bad verdict with no culprit is accepted.
     Computed in fault-rule.ts. -->
<script setup lang="ts">
import { computed, ref } from "vue";
import { BAD_WITHOUT_CULPRITS, offenseError, terms, VERDICTS, VOTES, type Trial, type Vote } from "./fault-rule.ts";

const trial = ref<Trial>({ verdict: "bad", fault: "valid", culprit: false });
const result = computed(() => offenseError(trial.value));
const t = computed(() => (trial.value.fault ? terms(trial.value.verdict, trial.value.fault) : null));
const setFault = (v: Vote | null) => { trial.value = { ...trial.value, fault: v }; };
const yes = (b: boolean) => (b ? "true" : "false");
</script>

<template>
  <div class="widget fault-rule">
    <div class="readout" aria-live="polite">
      <div class="tile wide" :class="{ wrong: result }"><span class="tile-label">the block is</span><span class="tile-value">{{ result ? result.error : "accepted" }}</span></div>
      <div class="tile"><span class="tile-label">r ∈ ψ′_B</span><span class="tile-value">{{ t ? yes(t.inBad) : "–" }}</span></div>
      <div class="tile"><span class="tile-label">r ∉ ψ′_G</span><span class="tile-value">{{ t ? yes(t.notGood) : "–" }}</span></div>
      <div class="tile"><span class="tile-label">v, voted valid</span><span class="tile-value">{{ t ? yes(t.v) : "–" }}</span></div>
    </div>
    <p class="line">
      <template v-if="result">Refused: {{ result.error === "fault_verdict_wrong" ? "the three terms don't all agree, so the fault didn't vote against the verdict" : result.error === "culprits_verdict_not_bad" ? "a culprit needs a report judged bad" : "a good verdict proves whoever started the trial wrong, so at least one fault must name the report" }}. The vector: <code>{{ result.vector }}</code>.</template>
      <template v-else-if="trial.verdict === 'bad' && !trial.culprit && !trial.fault">Accepted with no offender named: a bad verdict needs no culprit in the same block, as <code>{{ BAD_WITHOUT_CULPRITS }}</code> shows. Culprits can come later.</template>
      <template v-else>Accepted{{ t ? ": all three terms agree, so the fault voted against the verdict" : "" }}{{ trial.culprit ? "; the culprit vouched for a bad report" : "" }}.</template>
    </p>
    <div class="controls">
      <span class="muted">the report was judged</span>
      <button v-for="v in VERDICTS" :key="v" class="small" :class="{ chosen: trial.verdict === v }" :aria-pressed="trial.verdict === v" @click="trial = { ...trial, verdict: v }">{{ v }}</button>
    </div>
    <div class="controls">
      <span class="muted">a fault voted</span>
      <button v-for="v in VOTES" :key="v" class="small" :class="{ chosen: trial.fault === v }" :aria-pressed="trial.fault === v" @click="setFault(v)">{{ v }}</button>
      <button class="small" :class="{ chosen: trial.fault === null }" :aria-pressed="trial.fault === null" @click="setFault(null)">no fault named</button>
    </div>
    <div class="controls">
      <span class="muted">a culprit</span>
      <button class="small" :class="{ chosen: trial.culprit }" :aria-pressed="trial.culprit" @click="trial = { ...trial, culprit: !trial.culprit }">{{ trial.culprit ? "named, guaranteed the report" : "none named" }}</button>
    </div>
    <p class="legend">Rule 6: r ∈ ψ′_B ⇔ r ∉ ψ′_G ⇔ v, all true together or all false together. A wonky report makes the first false and the second true, so no vote can agree.</p>
  </div>
</template>

<style scoped>
.tile .tile-value { min-width: 5ch; }
.tile.wide .tile-value { min-width: 18ch; font-size: 18px; }
/* a refusal is a change nobody asked for: red (custom.css) */
.tile.wrong { background: var(--changed); border-color: var(--changed-line); }
.line { margin: 8px 0; font-size: 14px; line-height: 1.6; min-height: 4.8em; }
.controls { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin: 0 0 6px; }
.controls button.small { min-height: 32px; }
.muted { font-size: 12px; color: var(--vp-c-text-2); min-width: 9em; }
.legend { margin: 8px 0 0; font-size: 13px; color: var(--vp-c-text-2); line-height: 1.6; }
</style>
