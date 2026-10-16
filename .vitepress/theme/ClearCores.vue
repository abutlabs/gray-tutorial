<!-- Lesson 10.3: the cores before and after the verdicts. Each core holds a pending report,
     named by its hash; set how the votes on it went and see ρ†: bad or wonky empties the
     core, good leaves it be. Starts as the run's vector has it. Computed in clear-cores.ts. -->
<script setup lang="ts">
import { computed, ref } from "vue";
import type { Outcome } from "./clear-cores.ts";
import { clearJudged, CORES, outcomeOf, VERDICTS, VOTES } from "./clear-cores.ts";

type Choice = Outcome | "none";
// as the vector has it: each core's report, and the verdict that names it
const choice = ref<Choice[]>(CORES.map((c) => { const v = VERDICTS.find((x) => x.target === c.hash); return v ? outcomeOf(v.valid) : "none"; }));
const after = computed(() => clearJudged(CORES.flatMap((c, i) => (choice.value[i] === "none" ? [] : [{ target: c.hash, outcome: choice.value[i] as Outcome }]))));
const kept = computed(() => after.value.filter((x) => x !== null).length);
const OPTIONS: { value: Choice; label: string }[] = [
  { value: "good", label: `good: ${VOTES.good} of 5 valid` },
  { value: "wonky", label: `wonky: ${VOTES.wonky} of 5` },
  { value: "bad", label: `bad: ${VOTES.bad} of 5` },
  { value: "none", label: "no verdict" },
];
const set = (i: number, c: Choice) => { const next = [...choice.value]; next[i] = c; choice.value = next; };
</script>

<template>
  <div class="widget clear-cores">
    <div class="readout" aria-live="polite">
      <div v-for="(c, i) in CORES" :key="c.core" class="tile" :class="{ gone: after[i] === null }">
        <span class="tile-label">core {{ c.core }} after</span><span class="tile-value">{{ after[i] === null ? "empty" : "keeps it" }}</span>
      </div>
      <div class="tile"><span class="tile-label">cores keeping a report</span><span class="tile-value">{{ kept }} of {{ CORES.length }}</span></div>
    </div>
    <p class="line">A verdict names its report by hash, H(ℰ(report)), so hash each core's report and compare. Bad or wonky, the report leaves its core; good, it stays. The disputes vector judges core 0's report bad and core 1's good.</p>
    <div class="cores">
      <section v-for="(c, i) in CORES" :key="c.core" class="core">
        <p class="head"><b>core {{ c.core }}</b> <span class="muted">pending since slot {{ c.since }}</span></p>
        <p class="mono">report hash {{ c.hash.slice(0, 12) }}…</p>
        <p class="mono muted">package {{ c.pkg.slice(0, 12) }}…</p>
        <div class="opts" role="group" :aria-label="`the verdict on core ${c.core}'s report`">
          <button v-for="o in OPTIONS" :key="o.value" class="small" :class="{ chosen: choice[i] === o.value }" :aria-pressed="choice[i] === o.value" @click="set(i, o.value)">{{ o.label }}</button>
        </div>
        <p class="after" :class="{ gone: after[i] === null }">ρ†: {{ after[i] === null ? `emptied, the report judged ${choice[i]}` : choice[i] === "good" ? "keeps its report: judged good" : "keeps its report: not on trial" }}</p>
      </section>
    </div>
  </div>
</template>

<style scoped>
.tile .tile-value { min-width: 7ch; font-size: 20px; }
.tile.gone { border-color: var(--changed-line); background: var(--changed); }
.line { margin: 8px 0; font-size: 14px; line-height: 1.6; }
.cores { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 8px; }
.core { padding: 8px; border: 1px solid var(--vp-c-divider); border-radius: 6px; background: var(--vp-c-bg-soft); }
.core p { margin: 2px 0; font-size: 13px; }
.head { font-size: 14px; }
.mono { font-family: var(--vp-font-family-mono); }
.muted { color: var(--vp-c-text-2); font-size: 12px; }
.opts { display: flex; flex-wrap: wrap; gap: 4px; margin: 6px 0; }
.opts button.small { min-height: 32px; }
.after { padding: 4px 6px; border-radius: 4px; background: var(--bit-low); }
.after.gone { background: var(--changed); color: var(--changed-line); font-weight: 600; }
</style>
