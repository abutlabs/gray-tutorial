<!-- Lesson 2.5: twelve bytes, a slot and a gas amount, read with the fields in the order
     they were written and then swapped. Tap swap and watch gas take the first eight bytes
     and slot the last four, with no error anywhere; tap a field to see its bytes. Below,
     the lesson's list, which unlike a record carries its count. Computed in record-swap.ts. -->
<script setup lang="ts">
import { computed, ref } from "vue";
import { decodeAs, dump, faithful, FIELDS, RECORD_BYTES, SEQ_BYTES, swapped, type Field } from "./record-swap.ts";

const order = ref<Field[]>(FIELDS);
const picked = ref<Field["name"]>("slot");
const reads = computed(() => decodeAs(order.value));
const read = computed(() => reads.value.find((r) => r.field.name === picked.value)!);
const ok = computed(() => faithful(reads.value));
const isSwapped = computed(() => order.value[0].name !== FIELDS[0].name);
const owner = (i: number) => reads.value.find((r) => r.from <= i && i < r.to)!.field.name;
const hex = (b: number) => b.toString(16).padStart(2, "0");
</script>

<template>
  <div class="widget record-swap">
    <div class="readout" aria-live="polite">
      <div class="tile"><span class="tile-label">field</span><span class="tile-value">{{ read.field.name }}: {{ read.field.codec }}</span></div>
      <div class="tile"><span class="tile-label">reads bytes</span><span class="tile-value">{{ read.from }}–{{ read.to - 1 }}</span></div>
      <div class="tile wide" :class="{ wrong: !ok }"><span class="tile-label">value</span><span class="tile-value">{{ read.value.toLocaleString("en-US") }}</span></div>
      <div class="tile" :class="{ wrong: !ok }"><span class="tile-label">the values written</span><span class="tile-value">{{ ok ? "yes" : "no" }}</span></div>
    </div>
    <p class="line">
      <template v-if="ok">A record is its fields' bytes in the fields' order and nothing else: {{ FIELDS[0].name }} takes its {{ FIELDS[0].width }}, then {{ FIELDS[1].name }} its {{ FIELDS[1].width }}. No names, no length, so both sides must agree on the order.</template>
      <template v-else><span class="bug">Same bytes, wrong values.</span> Nothing in the bytes says which field is which, so gas took the first eight and slot the last four, and nobody complained.</template>
    </p>
    <div class="controls" role="group" aria-label="the fields, in the order the codec lists them">
      <button v-for="f in order" :key="f.name" class="small" :class="{ chosen: picked === f.name }" :aria-pressed="picked === f.name" @click="picked = f.name">{{ f.name }}: {{ f.codec }}</button>
      <button class="small swap" :aria-pressed="isSwapped" @click="order = swapped(order)">⇄ swap the fields</button>
    </div>
    <div class="strip" aria-label="the twelve bytes">
      <span v-for="(b, i) in RECORD_BYTES" :key="i" class="cell unit-byte" :class="[owner(i), { on: owner(i) === picked }]"><span class="off">{{ i }}</span>{{ hex(b) }}</span>
    </div>
    <p class="also">A list is different: it can be any length, so it says. <code>seq(u16)</code> writes 1, 2, 3 as</p>
    <div class="strip seq" aria-label="the list's bytes">
      <span v-for="(g, k) in SEQ_BYTES" :key="k" class="group" :class="g.role"><code class="bytes">{{ dump(g.bytes) }}</code><span class="says">{{ g.says }}</span></span>
    </div>
  </div>
</template>

<style scoped>
.tile .tile-value { min-width: 6ch; }
.tile.wide .tile-value { min-width: 16ch; }
/* a field reading the wrong bytes is a change nobody asked for: red (custom.css) */
.tile.wrong { background: var(--changed); border-color: var(--changed-line); }
.bug { color: var(--changed-line); font-weight: 600; }
.line { margin: 8px 0; font-size: 14px; line-height: 1.6; min-height: 4.8em; }
.controls { display: flex; flex-wrap: wrap; gap: 6px; margin: 0 0 8px; }
.controls button.small { min-height: 32px; font-family: var(--vp-font-family-mono); }
.controls button.swap { font-family: inherit; }
.strip { display: flex; flex-wrap: wrap; gap: 3px; margin: 0 0 8px; font-family: var(--vp-font-family-mono); font-size: 14px; }
.cell { position: relative; min-width: 2.6em; padding: 14px 4px 4px; text-align: center; border: 1px solid; border-radius: 3px; opacity: 0.6; }
.cell .off { position: absolute; top: 1px; left: 0; right: 0; font-size: 10px; color: var(--vp-c-text-3); }
.cell.slot { background: var(--bit-top); border-color: var(--bit-top-line); }
.cell.gas { background: var(--bit-low); border-color: var(--bit-low-line); }
.cell.on { opacity: 1; font-weight: 700; }
.also { margin: 12px 0 6px; font-size: 14px; line-height: 1.6; }
.seq { gap: 6px; }
.group { display: flex; flex-direction: column; gap: 2px; padding: 4px 8px; border: 1px solid var(--vp-c-divider); border-radius: 4px; }
/* a count is structure, so amber, as elsewhere (custom.css) */
.group.count { background: var(--bit-mark); border-color: var(--bit-mark-line); }
.group .says { font-family: var(--vp-font-family-base); font-size: 12px; color: var(--vp-c-text-2); }
</style>
