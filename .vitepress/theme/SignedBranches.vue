<!-- Lesson 15.6: the same bits, two readings. Set r0 and r1 (or flip either's sign bit) and
     see each register read unsigned and signed, and every branch's comparison, unsigned
     beside signed, lit where it jumps. Computed in signed-branches.ts. -->
<script setup lang="ts">
import { computed, ref } from "vue";
import { COMPARISONS, flipSign, fmt, hex64, parse, PRESETS, ROWS, signed, WITH_REGISTERS } from "./signed-branches.ts";

const r = ref<[bigint, bigint]>([PRESETS[0].r0, PRESETS[0].r1]);
const typed = ref<[string, string]>(["-1", "1"]);
const set = (k: 0 | 1) => { const v = parse(typed.value[k]); if (v !== null) r.value = k ? [r.value[0], v] : [v, r.value[1]]; };
const pick = (p: typeof PRESETS[number]) => { r.value = [p.r0, p.r1]; typed.value = [signed(p.r0).toString(), signed(p.r1).toString()]; };
const flip = (k: 0 | 1) => { const v = flipSign(r.value[k]); r.value = k ? [r.value[0], v] : [v, r.value[1]]; typed.value[k] = signed(v).toString(); };
const jumps = (c: string) => COMPARISONS[c](r.value[0], r.value[1]);
const disagree = computed(() => ROWS.filter((row) => row.twins.length === 2 && jumps(row.twins[0]) !== jumps(row.twins[1])).map((row) => row.op));
</script>

<template>
  <div class="widget signed-branches">
    <div class="readout" aria-live="polite">
      <div v-for="k in [0, 1] as const" :key="k" class="tile">
        <span class="tile-label">r{{ k }}, unsigned and signed</span>
        <span class="tile-value two">{{ fmt(r[k]) }}</span>
        <span class="tile-value two">{{ fmt(signed(r[k])) }}</span>
      </div>
      <div class="tile"><span class="tile-label">twins that disagree</span><span class="tile-value">{{ disagree.length }} of 4</span></div>
    </div>
    <p class="line">
      <template v-if="disagree.length">Same bits, opposite answers: {{ disagree.join(", ") }} {{ disagree.length === 1 ? "jumps" : "jump" }} one way unsigned and the other signed, because the readings put r0 and r1 in different orders.</template>
      <template v-else>Here the two readings agree on the order, so every twin gives the same answer. Flip a sign bit to split them.</template>
    </p>
    <div class="controls">
      <label v-for="k in [0, 1] as const" :key="k" class="num">r{{ k }} <input v-model="typed[k]" type="text" spellcheck="false" :aria-label="`r${k}`" @change="set(k)" @keyup.enter="set(k)" /></label>
      <button class="small" @click="flip(0)">flip r0's sign bit</button>
      <button class="small" @click="flip(1)">flip r1's sign bit</button>
    </div>
    <div class="controls">
      <button v-for="p in PRESETS" :key="p.says" class="small" :class="{ chosen: r[0] === p.r0 && r[1] === p.r1 }" @click="pick(p)">{{ p.says }}</button>
    </div>
    <p class="hexes"><span>r0 {{ hex64(r[0]) }}</span><span>r1 {{ hex64(r[1]) }}</span></p>
    <table class="grid">
      <thead><tr><th>branch_…</th><th>unsigned _u</th><th>signed _s</th></tr></thead>
      <tbody>
        <tr v-for="row in ROWS" :key="row.op">
          <th>{{ row.op }} <span class="muted">r0 {{ row.sign }} r1</span></th>
          <td v-for="c in row.twins" :key="c" :colspan="row.twins.length === 1 ? 2 : 1" :class="{ jumps: jumps(c) }">
            {{ jumps(c) ? "jumps" : "falls through" }}<span v-if="!WITH_REGISTERS.has(c)" class="muted"> · imm only</span>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
/* fixed columns, nothing wraps: the readout keeps one height whatever the registers hold */
.signed-branches .readout { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); }
.tile .tile-value { font-size: 20px; white-space: nowrap; }
.tile .tile-value.two { font-size: 14px; line-height: 1.45; }
.line { margin: 8px 0; font-size: 14px; line-height: 1.6; min-height: 4.8em; }
.controls { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin: 0 0 6px; }
.controls button.small { min-height: 32px; }
.num { display: inline-flex; align-items: center; gap: 4px; font-size: 13px; color: var(--vp-c-text-2); }
.num input { width: 14ch; min-height: 32px; padding: 0 6px; border: 1px solid var(--vp-c-divider); border-radius: 4px; background: var(--vp-c-bg); color: var(--vp-c-text-1); font-family: var(--vp-font-family-mono); font-size: 13px; }
.hexes { display: flex; flex-wrap: wrap; gap: 4px 14px; margin: 4px 0; font-family: var(--vp-font-family-mono); font-size: 12px; color: var(--vp-c-text-2); }
.grid { width: 100%; border-collapse: collapse; font-size: 13px; display: table; margin: 6px 0 0; }
.grid th, .grid td { padding: 5px 8px; border: 1px solid var(--vp-c-divider); text-align: left; }
.grid td { font-family: var(--vp-font-family-mono); color: var(--vp-c-text-2); }
.grid td.jumps { background: var(--bit-low); color: var(--vp-c-text-1); font-weight: 700; }
.muted { font-size: 11px; font-weight: 400; color: var(--vp-c-text-3); }
</style>
