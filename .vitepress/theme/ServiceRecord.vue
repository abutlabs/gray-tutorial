<!-- Lesson 14.2: service 0's real 89-byte record as a strip, each field as wide as its
     bytes. Tap a field for its name, its Gray Paper letter, its bytes and its value; the
     goals tick as you find the code hash, the two 2^64 − 1 values and a 4-byte field.
     Encoded in service-record.ts. -->
<script setup lang="ts">
import { computed, ref } from "vue";
import { spaced } from "./codec-map.ts";
import { FIELDS, GOALS, LETTER, RECORD, RECORD_BYTES, SAYS, valueOf } from "./service-record.ts";

const picked = ref("code_hash");
const reached = ref(new Set<string>());
const field = computed(() => FIELDS.find((f) => f.path === picked.value)!);
const hex = computed(() => { const b = RECORD.bytes.slice(field.value.start, field.value.end); return b.length <= 8 ? spaced(b) : `${spaced(b.slice(0, 4))} … ${spaced(b.slice(-2))}`; });
const choose = (path: string) => { picked.value = path; reached.value = new Set([...reached.value, ...GOALS.filter((g) => g.reached(path)).map((g) => g.id)]); };
</script>

<template>
  <div class="widget service-record">
    <div class="readout" aria-live="polite">
      <div class="tile"><span class="tile-label">{{ LETTER[field.path] }} · {{ field.path }}</span><span class="tile-value">bytes {{ field.start }}–{{ field.end - 1 }}</span></div>
      <div class="tile wide"><span class="tile-label">value</span><span class="tile-value small">{{ valueOf(field) }}</span></div>
      <div class="tile wide"><span class="tile-label">its {{ field.end - field.start }} byte{{ field.end - field.start === 1 ? "" : "s" }}</span><span class="tile-value bytes">{{ hex }}</span></div>
    </div>
    <p class="line">{{ SAYS[field.path] }}. The record is {{ RECORD_BYTES }} bytes under C(255, 0): every field a fixed width, in the Gray Paper's order, as service 0 holds it before block 1 of the fallback trace.</p>
    <div class="strip" role="group" aria-label="the record's fields, each as wide as its bytes">
      <button v-for="f in FIELDS" :key="f.path" class="seg" :class="{ on: f.path === picked, wide: f.end - f.start >= 8 }" :style="{ flexGrow: Math.max(3, f.end - f.start) }" :aria-pressed="f.path === picked" :title="f.path" @click="choose(f.path)"><span>{{ f.end - f.start >= 8 ? LETTER[f.path] : "" }}</span></button>
    </div>
    <div class="controls">
      <button v-for="f in FIELDS" :key="f.path" class="small" :class="{ chosen: f.path === picked }" :aria-pressed="f.path === picked" @click="choose(f.path)">{{ f.path }}</button>
    </div>
    <ul class="goals">
      <li v-for="g in GOALS" :key="g.id" :class="{ done: reached.has(g.id) }">{{ reached.has(g.id) ? "✓" : "○" }} {{ g.say }}</li>
    </ul>
  </div>
</template>

<style scoped>
.tile .tile-value { min-width: 9ch; font-size: 16px; }
.tile.wide .tile-value { min-width: 18ch; }
.tile .tile-value.small { font-size: 14px; }
.line { margin: 8px 0; font-size: 14px; line-height: 1.6; min-height: 4.8em; }
.strip { display: flex; gap: 1px; margin: 0 0 8px; }
.seg { flex: 1 1 0; min-width: 0; min-height: 32px; border: 1px solid var(--vp-c-divider); border-radius: 2px; background: var(--bit-top); font-size: 12px; color: var(--vp-c-text-1); cursor: pointer; opacity: 0.7; overflow: hidden; }
.seg.wide { background: var(--bit-low); }
.seg.on { opacity: 1; border: 2px solid var(--vp-c-brand-1); font-weight: 700; }
.controls { display: flex; flex-wrap: wrap; gap: 4px; }
.controls button.small { min-height: 32px; font-family: var(--vp-font-family-mono); font-size: 12px; }
.goals { list-style: none; padding: 0; margin: 10px 0 0; font-size: 13px; color: var(--vp-c-text-2); }
.goals li.done { color: var(--vp-c-green-1); }
</style>
