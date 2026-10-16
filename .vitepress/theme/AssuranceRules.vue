<!-- Lesson 11.3: edit a tiny block's assurances, each one's anchor, index, bits and
     signature, or their order, and the readout names the first rule broken, in the order
     the code checks them, or "accepted". Computed in assurance-rules.ts. -->
<script setup lang="ts">
import { computed, ref } from "vue";
import { assuranceError, ENGAGED, RULES, START, TWO_ONE_SIX, VALIDATORS, type Assurance } from "./assurance-rules.ts";

const list = ref<Assurance[]>(START.map((a) => ({ ...a, bits: [...a.bits] })));
const result = computed(() => assuranceError(list.value));
const load = (from: Assurance[]) => { list.value = from.map((a) => ({ ...a, bits: [...a.bits] })); };
const move = (i: number, by: number) => { const j = i + by; if (j < 0 || j >= list.value.length) return; const l = [...list.value]; [l[i], l[j]] = [l[j], l[i]]; list.value = l; };
const bump = (a: Assurance, by: number) => { a.index = Math.max(0, Math.min(VALIDATORS, a.index + by)); list.value = [...list.value]; };
const flipBit = (a: Assurance, c: number) => { a.bits[c] = !a.bits[c]; list.value = [...list.value]; };
const touch = () => { list.value = [...list.value]; };
</script>

<template>
  <div class="widget assurance-rules">
    <div class="readout" aria-live="polite">
      <div class="tile wide" :class="{ wrong: result }"><span class="tile-label">the block is</span><span class="tile-value">{{ result ? result.error : "accepted" }}</span></div>
      <div class="tile"><span class="tile-label">rule</span><span class="tile-value">{{ result ? result.n : "all 5" }}</span></div>
      <div class="tile"><span class="tile-label">|κ|</span><span class="tile-value">{{ VALIDATORS }}</span></div>
    </div>
    <p class="line">
      <template v-if="result">Rule {{ result.n }}: {{ result.says }}. Named first because the rules are checked in this order; the vector <code>{{ result.vector }}</code> shows it.</template>
      <template v-else>Every rule holds: anchored on the parent, real validators in order, bits only on core 0 (the engaged one), each signed. Break something.</template>
    </p>
    <div class="controls">
      <button class="small" @click="load(START)">validators 0, 1, 2</button>
      <button class="small" @click="load(TWO_ONE_SIX)">validators 2, 1, 6 (the question)</button>
    </div>
    <ol class="rules">
      <li v-for="r in RULES" :key="r.n" :class="{ broken: result?.n === r.n, skipped: result && result.n < r.n }"><b>{{ r.n }}.</b> {{ r.says }} <code>{{ r.error }}</code></li>
    </ol>
    <ol class="list" aria-label="the block's assurances, in its order">
      <li v-for="(a, i) in list" :key="i" class="assurance">
        <span class="n">{{ i + 1 }}</span>
        <span class="field">validator <button class="small" aria-label="lower index" @click="bump(a, -1)">−</button><b>{{ a.index }}</b><button class="small" aria-label="higher index" @click="bump(a, 1)">+</button></span>
        <button class="small" :class="{ chosen: !a.onParent }" :aria-pressed="!a.onParent" @click="a.onParent = !a.onParent; touch()">{{ a.onParent ? "anchor: the parent" : "anchor: two back" }}</button>
        <span class="field">bits <button v-for="(on, c) in ENGAGED" :key="c" class="small bit" :class="{ chosen: a.bits[c], empty: !on }" :aria-pressed="a.bits[c]" :title="on ? `core ${c}: a report pending` : `core ${c}: nothing on it`" @click="flipBit(a, c)">core {{ c }}: {{ a.bits[c] ? 1 : 0 }}</button></span>
        <button class="small" :class="{ chosen: !a.signed }" :aria-pressed="!a.signed" @click="a.signed = !a.signed; touch()">{{ a.signed ? "signed" : "bad signature" }}</button>
        <button class="small" :disabled="i === 0" aria-label="move up" @click="move(i, -1)">▲</button>
        <button class="small" :disabled="i === list.length - 1" aria-label="move down" @click="move(i, 1)">▼</button>
      </li>
    </ol>
  </div>
</template>

<style scoped>
.tile .tile-value { min-width: 4ch; }
.tile.wide .tile-value { min-width: 18ch; font-size: 18px; }
/* a refusal is a change nobody asked for: red (custom.css) */
.tile.wrong { background: var(--changed); border-color: var(--changed-line); }
.line { margin: 8px 0; font-size: 14px; line-height: 1.6; min-height: 4.8em; }
.controls { display: flex; flex-wrap: wrap; gap: 6px; margin: 0 0 8px; }
.controls button.small { min-height: 32px; }
.rules { margin: 0 0 8px; padding: 0; list-style: none; font-size: 13px; line-height: 1.7; }
.rules li.broken { color: var(--changed-line); font-weight: 600; }
.rules li.skipped { color: var(--vp-c-text-3); }
.rules code { font-size: 12px; }
.list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 4px; }
.assurance { display: flex; flex-wrap: wrap; align-items: center; gap: 4px; padding: 4px 6px; border: 1px solid var(--vp-c-divider); border-radius: 4px; background: var(--vp-c-bg-soft); font-size: 13px; }
.assurance .n { color: var(--vp-c-text-3); min-width: 1.2em; }
.assurance button.small { min-height: 32px; min-width: 32px; }
.field { display: inline-flex; align-items: center; gap: 4px; font-size: 12px; color: var(--vp-c-text-2); }
.field b { color: var(--vp-c-text-1); min-width: 1.2em; text-align: center; }
.bit.empty { border-style: dashed; }
</style>
