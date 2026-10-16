<!-- Lesson 10.4: the seven verdict rules, in the order the code checks them. Start from a
     block's two passing verdicts and break one thing: the readout names the first rule
     broken under the vectors' name, and the vector that shows it. Computed in
     verdict-rules.ts. -->
<script setup lang="ts">
import { computed, ref } from "vue";
import { BREAKS, EPOCH, judgesOf, PASSING, RULES, TINY, twoThirdsPlusOne, verdictError, type Break } from "./verdict-rules.ts";

const chosen = ref<Break | null>(null);
const verdicts = computed(() => (chosen.value ? chosen.value.apply(PASSING) : PASSING));
const judges = computed(() => chosen.value?.judges ?? TINY);
const result = computed(() => verdictError(verdicts.value, judges.value));
const pick = (b: Break) => { chosen.value = chosen.value?.id === b.id ? null : b; };
</script>

<template>
  <div class="widget verdict-rules">
    <div class="readout" aria-live="polite">
      <div class="tile wide" :class="{ wrong: result }"><span class="tile-label">the verdicts</span><span class="tile-value">{{ result ? result.error : "pass" }}</span></div>
      <div class="tile"><span class="tile-label">rule</span><span class="tile-value">{{ result ? result.n : "all 7" }}</span></div>
      <div class="tile"><span class="tile-label">judges, κ · λ</span><span class="tile-value">{{ judges.kappa }} · {{ judges.lambda }}</span></div>
      <div class="tile"><span class="tile-label">votes needed</span><span class="tile-value">{{ verdicts.map((v) => twoThirdsPlusOne(judgesOf(v, judges, EPOCH))).join(", ") }}</span></div>
    </div>
    <p class="line">
      <template v-if="result">Rule {{ result.n }}: {{ result.says }}. The whole block is refused. The vector that shows it: <code>{{ result.vector }}</code>.</template>
      <template v-else>Two verdicts on tiny, sorted by report hash, each with 5 of 6 judges' signed votes in order, one all valid and one none: every rule holds. Break one thing.</template>
    </p>
    <div class="controls" role="group" aria-label="break one thing">
      <button v-for="b in BREAKS" :key="b.id" class="small" :class="{ chosen: chosen?.id === b.id }" :aria-pressed="chosen?.id === b.id" @click="pick(b)">{{ b.says }}</button>
    </div>
    <ol class="rules">
      <li v-for="r in RULES" :key="r.n" :class="{ broken: result?.n === r.n, skipped: result && result.n < r.n }"><b>{{ r.n }}.</b> {{ r.says }} <code>{{ r.error }}</code></li>
    </ol>
    <div class="verdicts">
      <div v-for="v in verdicts" :key="v.target" class="verdict">
        <div class="head"><code class="hash">{{ v.target }}</code> <span class="muted">age {{ v.age }}{{ v.judgedBefore ? ", judged before" : "" }}</span></div>
        <div class="votes"><span v-for="(j, i) in v.votes" :key="i" class="vote" :class="{ valid: j.valid, unsigned: !j.signed }" :title="`judge ${j.index}: ${j.valid ? 'valid' : 'invalid'}${j.signed ? '' : ', unsigned'}`">{{ j.index }}{{ j.valid ? "✓" : "✗" }}</span></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tile .tile-value { min-width: 5ch; }
.tile.wide .tile-value { min-width: 18ch; font-size: 18px; }
/* a refusal is a change nobody asked for: red (custom.css) */
.tile.wrong { background: var(--changed); border-color: var(--changed-line); }
.line { margin: 8px 0; font-size: 14px; line-height: 1.6; min-height: 4.8em; }
.controls { display: flex; flex-wrap: wrap; gap: 6px; margin: 0 0 8px; }
.controls button.small { min-height: 32px; }
.rules { margin: 0 0 8px; padding-left: 0; list-style: none; font-size: 13px; line-height: 1.7; }
.rules li.broken { color: var(--changed-line); font-weight: 600; }
.rules li.skipped { color: var(--vp-c-text-3); }
.rules code { font-size: 12px; }
.verdicts { display: flex; flex-wrap: wrap; gap: 8px; }
.verdict { flex: 1 1 200px; padding: 6px 8px; border: 1px solid var(--vp-c-divider); border-radius: 6px; background: var(--vp-c-bg-soft); }
.head { font-size: 12px; margin-bottom: 4px; }
.muted { color: var(--vp-c-text-2); }
.votes { display: flex; flex-wrap: wrap; gap: 3px; font-family: var(--vp-font-family-mono); font-size: 12px; }
.vote { min-width: 2.4em; padding: 4px 2px; text-align: center; border: 1px solid var(--vp-c-divider); border-radius: 3px; background: var(--changed); }
.vote.valid { background: var(--bit-low); }
.vote.unsigned { border: 2px dashed var(--changed-line); }
</style>
