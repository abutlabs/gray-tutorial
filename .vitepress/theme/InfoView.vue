<!-- Lesson 16.4: the 96 bytes info hands out, beside the 89 bytes the state keeps, for the
     tests' made-up account. Tap a field and it lights in both, where it has bytes; a_t is
     only in info's, worked out on the spot. φ₇ picks the account. Computed in info-view.ts. -->
<script setup lang="ts">
import { computed, ref } from "vue";
import { FIELDS, INFO, INFO_PARTS, LETTER, STATE, STATE_PARTS, WHO } from "./info-view.ts";

const field = ref("min_balance");
const who = ref(0);
const found = computed(() => WHO[who.value].found);
const s = computed(() => STATE_PARTS.get(field.value));
const i = computed(() => INFO_PARTS.get(field.value));
const at = (n?: { start: number; end: number }) => (n ? `bytes ${n.start} to ${n.end - 1}` : "not there");
const hx = (b: number) => b.toString(16).padStart(2, "0");
const segs = (root: typeof STATE.root) => root.children.map((n) => ({ path: n.path, bytes: n.end - n.start }));
</script>

<template>
  <div class="widget info-view">
    <div class="readout" aria-live="polite">
      <div class="tile"><span class="tile-label">{{ field }} ({{ LETTER[field] }})</span><span class="tile-value small">{{ i && found ? (i.end - i.start <= 8 ? INFO.bytes.slice(i.start, i.end).map(hx).join(" ") : "09 × 32") : "—" }}</span></div>
      <div class="tile"><span class="tile-label">in the state's 89</span><span class="tile-value small">{{ at(s) }}</span></div>
      <div class="tile"><span class="tile-label">in info's 96</span><span class="tile-value small">{{ found ? at(i) : "NONE" }}</span></div>
    </div>
    <p class="line">
      <template v-if="!found">There's no service 42: φ₇ = NONE, 2^64 − 1. Going in, that number meant "myself"; coming out, "no such service".</template>
      <template v-else-if="field === 'min_balance'">a_t isn't stored anywhere: info works it out on the spot, 100 + 10 × 2 items + 50 bytes = 170, and hands it out at bytes 40 to 47.</template>
      <template v-else-if="field === 'version'">The state's record starts with a version byte; info leaves it out.</template>
      <template v-else-if="field === 'deposit_offset'">f, the gratis storage, comes after the 8-byte o in the state, but after i in info's view.</template>
      <template v-else>The same value in both, at a different place: info has its own order, the Gray Paper's.</template>
    </p>
    <div class="controls">
      <span class="muted">φ₇</span>
      <button v-for="(w, k) in WHO" :key="w.r7" class="small" :class="{ chosen: who === k }" :aria-pressed="who === k" @click="who = k">{{ w.r7 }}: {{ w.says }}</button>
    </div>
    <div class="controls fields">
      <button v-for="f in FIELDS" :key="f" class="small" :class="{ chosen: field === f }" :aria-pressed="field === f" @click="field = f">{{ LETTER[f] }} {{ f }}</button>
    </div>
    <p class="row-says">the state's record, 89 bytes (lesson 14.2)</p>
    <div class="wire"><span v-for="g in segs(STATE.root)" :key="g.path" class="seg" :class="{ on: g.path === field }" :style="{ flexGrow: g.bytes }">{{ LETTER[g.path] }}</span></div>
    <p class="row-says">what info writes, 96 bytes</p>
    <div class="wire" :class="{ gone: !found }"><span v-for="g in segs(INFO.root)" :key="g.path" class="seg" :class="{ on: g.path === field, new: g.path === 'min_balance' }" :style="{ flexGrow: g.bytes }">{{ LETTER[g.path] }}</span></div>
  </div>
</template>

<style scoped>
/* fixed columns, one line each: the readout keeps one height whichever field is tapped */
.info-view .readout { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); }
.tile .tile-label { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.tile .tile-value.small { font-size: 15px; white-space: nowrap; }
.line { margin: 8px 0; font-size: 14px; line-height: 1.6; min-height: 4.8em; }
.controls { display: flex; flex-wrap: wrap; align-items: center; gap: 4px; margin: 0 0 6px; }
.controls button.small { min-height: 32px; font-family: var(--vp-font-family-mono); font-size: 12px; }
.muted { font-size: 12px; color: var(--vp-c-text-2); }
.row-says { margin: 8px 0 4px; font-size: 12px; color: var(--vp-c-text-2); }
.wire { display: flex; gap: 2px; }
.wire.gone { opacity: 0.3; }
.seg { flex-basis: 0; min-width: 1.8em; min-height: 30px; display: flex; align-items: center; justify-content: center; border: 1px solid var(--vp-c-divider); border-radius: 3px; font-family: var(--vp-font-family-mono); font-size: 11px; background: var(--vp-c-bg-soft); }
.seg.new { background: var(--bit-mark); }
.seg.on { border: 2px solid var(--vp-c-brand-1); background: var(--vp-c-brand-soft); font-weight: 700; }
</style>
