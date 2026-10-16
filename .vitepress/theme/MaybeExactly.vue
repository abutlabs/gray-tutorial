<!-- Lesson 4.5: the codec's last two shapes, byte by byte. Flip an option between nothing
     and a value you type and watch 00 become 01 then the value; switch the lesson's list
     between seq and seqN and watch the count appear and vanish in front of the same six
     bytes. Tap any byte for its job. Computed in maybe-exactly.ts. -->
<script setup lang="ts">
import { computed, ref } from "vue";
import { dump, ITEMS, listCells, optionCells, U32_MAX, type Cell } from "./maybe-exactly.ts";

const present = ref(true);
const typed = ref("7");
const exactly = ref(false);
const picked = ref<{ row: "option" | "list"; i: number }>({ row: "option", i: 0 });

const value = computed(() => { const x = /^\d+$/.test(typed.value.trim()) ? BigInt(typed.value.trim()) : null; return x !== null && x <= U32_MAX ? x : null; });
const option = computed(() => optionCells(present.value ? value.value ?? 0n : null));
const list = computed(() => listCells(exactly.value));
const cell = computed<Cell>(() => (picked.value.row === "option" ? option.value : list.value)[picked.value.i] ?? option.value[0]);
const hex = (b: number) => b.toString(16).padStart(2, "0");
const pick = (row: "option" | "list", i: number) => { picked.value = { row, i }; };
</script>

<template>
  <div class="widget maybe-exactly">
    <div class="readout" aria-live="polite">
      <div class="tile"><span class="tile-label">byte</span><span class="tile-value bytes">{{ hex(cell.byte) }}</span></div>
      <div class="tile"><span class="tile-label">its job</span><span class="tile-value">{{ cell.job }}</span></div>
      <div class="tile wide"><span class="tile-label">which is</span><span class="tile-value">{{ cell.says }}</span></div>
    </div>

    <p class="row-says"><code>option(u32)</code>: ¿x, a value that may be missing. {{ option.length }} byte{{ option.length === 1 ? "" : "s" }}: <code class="bytes">{{ dump(option.map((c) => c.byte)) }}</code></p>
    <div class="controls">
      <button class="small" :class="{ chosen: !present }" :aria-pressed="!present" @click="present = false">nothing</button>
      <button class="small" :class="{ chosen: present }" :aria-pressed="present" @click="present = true">a value</button>
      <label class="typed">u32 <input v-model="typed" type="text" inputmode="numeric" :disabled="!present" aria-label="the value" /></label>
      <span v-if="present && value === null" class="muted">a whole number up to {{ U32_MAX.toLocaleString("en-US") }}; 0 for now</span>
    </div>
    <div class="strip" aria-label="the option's bytes">
      <button v-for="(c, i) in option" :key="`o${i}`" class="cell unit-byte" :class="[c.job, { on: picked.row === 'option' && picked.i === i }]" @click="pick('option', i)">{{ hex(c.byte) }}</button>
    </div>

    <p class="row-says">The list {{ ITEMS.join(", ") }} as u16s, {{ exactly ? "⟦T⟧ₙ: exactly three, no count" : "↕: any length, its count first" }}. {{ list.length }} bytes: <code class="bytes">{{ dump(list.map((c) => c.byte)) }}</code></p>
    <div class="controls">
      <button class="small" :class="{ chosen: !exactly }" :aria-pressed="!exactly" @click="exactly = false">seq(u16)</button>
      <button class="small" :class="{ chosen: exactly }" :aria-pressed="exactly" @click="exactly = true">seqN(u16, 3)</button>
    </div>
    <div class="strip" aria-label="the list's bytes">
      <button v-for="(c, i) in list" :key="`l${i}`" class="cell unit-byte" :class="[c.job, { on: picked.row === 'list' && picked.i === i }]" @click="pick('list', i)">{{ hex(c.byte) }}</button>
    </div>
    <p class="legend"><span class="key tag">tag</span> and <span class="key count">count</span> are structure: they tell the decoder how to read what follows. <span class="key value">value</span> and <span class="key item">item</span> are the data.</p>
  </div>
</template>

<style scoped>
.tile .tile-value { min-width: 5ch; }
.tile.wide .tile-value { font-size: 15px; min-width: 24ch; }
.row-says { margin: 10px 0 6px; font-size: 14px; line-height: 1.6; }
.controls { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin: 0 0 6px; }
.controls button.small { min-height: 32px; font-family: var(--vp-font-family-mono); }
.typed { display: flex; align-items: center; gap: 6px; font-size: 13px; color: var(--vp-c-text-2); }
.typed input { width: 12ch; min-height: 32px; padding: 0 8px; border: 1px solid var(--vp-c-divider); border-radius: 4px; background: var(--vp-c-bg); color: var(--vp-c-text-1); font-family: var(--vp-font-family-mono); font-size: 14px; }
.muted { font-size: 12px; color: var(--vp-c-text-3); }
.strip { display: flex; flex-wrap: wrap; gap: 3px; font-family: var(--vp-font-family-mono); font-size: 14px; }
.cell { min-width: 2.6em; min-height: 32px; padding: 4px; border: 1px solid; border-radius: 3px; cursor: pointer; opacity: 0.75; font: inherit; color: var(--vp-c-text-1); }
.cell.on { opacity: 1; font-weight: 700; border-width: 2px; }
/* a tag and a count are structure, amber; the rest is data (custom.css) */
.tag, .count { background: var(--bit-mark); border-color: var(--bit-mark-line); }
.tag { border-style: dashed; }
.value { background: var(--bit-top); border-color: var(--bit-top-line); }
.item { background: var(--bit-low); border-color: var(--bit-low-line); }
.legend { margin: 10px 0 0; font-size: 13px; color: var(--vp-c-text-2); line-height: 1.8; }
.key { display: inline-block; padding: 0 6px; border: 1px solid; border-radius: 3px; font-size: 12px; color: var(--vp-c-text-1); }
</style>
