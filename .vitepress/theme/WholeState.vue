<!-- Lesson 19.2: the whole state, part by part. Tap a component, or the account: what it is,
     the Part that built it and its size in that state; the strip below is all 171 entries,
     the tapped part lit. Data in whole-state.ts. -->
<script setup lang="ts">
import { computed, ref } from "vue";
import { ACCOUNT_ENTRIES, parts, TOTAL } from "./whole-state.ts";

const picked = ref<number | "record" | "entries">(14);
const p = computed(() => (typeof picked.value === "number" ? parts[picked.value - 1] : null));
const GOALS = [
  { id: "ready", say: "find the ready queue", hit: () => picked.value === 14 },
  { id: "small", say: "find the smallest component", hit: () => picked.value === 16 },
  { id: "record", say: "find service 0's record", hit: () => picked.value === "record" },
];
const reached = ref(new Set<string>());
const pick = (x: number | "record" | "entries") => { picked.value = x; reached.value = new Set([...reached.value, ...GOALS.filter((g) => g.hit()).map((g) => g.id)]); };
const cellLit = (k: number) => (k < 16 ? picked.value === k + 1 : k === 16 ? picked.value === "record" : picked.value === "entries");
</script>

<template>
  <div class="widget whole-state">
    <div class="readout" aria-live="polite">
      <div class="tile wide"><span class="tile-label">{{ p ? `C(${p.i}) ${p.letter}` : picked === "record" ? "C(255, 0)" : "C(0, …) × 154" }}</span><span class="tile-value small">{{ p ? p.says : picked === "record" ? "service 0's record" : "everything service 0 keeps" }}</span></div>
      <div class="tile"><span class="tile-label">size · built in</span><span class="tile-value small">{{ p ? `${p.size.toLocaleString("en-US")} bytes · Part ${p.part}` : picked === "record" ? "89 bytes · Part 14" : `${ACCOUNT_ENTRIES} entries · Part 19` }}</span></div>
    </div>
    <p class="line">The state before storage block 50: sixteen components, each under its own key, and one service, 0, with its record and an entry for each thing it keeps. 16 + 1 + {{ ACCOUNT_ENTRIES }} = {{ TOTAL }} entries, and nothing else.</p>
    <div class="chips">
      <button v-for="c in parts" :key="c.i" class="small" :class="{ chosen: picked === c.i }" :aria-pressed="picked === c.i" @click="pick(c.i)">C({{ c.i }}) {{ c.letter }}</button>
      <button class="small acct" :class="{ chosen: picked === 'record' }" @click="pick('record')">service 0's record</button>
      <button class="small acct" :class="{ chosen: picked === 'entries' }" @click="pick('entries')">its {{ ACCOUNT_ENTRIES }} entries</button>
    </div>
    <p class="row-says">all {{ TOTAL }} entries</p>
    <div class="strip" aria-label="the state's entries">
      <span v-for="k in TOTAL" :key="k" class="cell" :class="[k - 1 < 16 ? 'comp' : k - 1 === 16 ? 'rec' : 'item', { lit: cellLit(k - 1) }]"></span>
    </div>
    <ul class="goals"><li v-for="g in GOALS" :key="g.id" :class="{ done: reached.has(g.id) }">{{ reached.has(g.id) ? "✓" : "○" }} {{ g.say }}</li></ul>
  </div>
</template>

<style scoped>
.whole-state .readout { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); }
.tile { min-width: 0; }
.tile .tile-value.small { font-size: 15px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.line { margin: 8px 0; font-size: 14px; line-height: 1.6; }
.chips { display: flex; flex-wrap: wrap; gap: 4px; }
.chips button.small { min-height: 32px; font-family: var(--vp-font-family-mono); font-size: 12px; }
.acct { border-style: dashed; }
.row-says { margin: 8px 0 4px; font-size: 12px; color: var(--vp-c-text-2); }
.strip { display: flex; flex-wrap: wrap; gap: 1px; }
.cell { width: 8px; height: 14px; border-radius: 1px; opacity: 0.45; }
.cell.comp { background: var(--bit-top-line); }
.cell.rec { background: var(--bit-mark-line); }
.cell.item { background: var(--bit-low-line); }
.cell.lit { opacity: 1; outline: 2px solid var(--vp-c-brand-1); }
.goals { list-style: none; padding: 0; margin: 10px 0 0; font-size: 14px; color: var(--vp-c-text-2); }
.goals li.done { color: var(--vp-c-green-1); }
</style>
