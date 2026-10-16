<!-- Lesson 0.4: a moment on JAM's clock, and the slot it falls in. Pick a moment or nudge it
     by a millisecond, a second or an hour; the readout shows the UTC time, the milliseconds
     since the era, the division, and the slot rounded down beside what rounding to nearest
     would say, the lesson's planted bug. Everything is computed in slot-clock.ts. -->
<script setup lang="ts">
import { computed, ref } from "vue";
import { divisionOf, fractionOf, MOMENTS, roundedSlot, SLOT_SECONDS, slotAt, slotsAround, STEPS, utcOf } from "./slot-clock.ts";

const ms = ref(0);
const slot = computed(() => slotAt(ms.value));
const rounded = computed(() => roundedSlot(ms.value));
const bug = computed(() => rounded.value !== slot.value);
const slots = computed(() => slotsAround(ms.value));
const chosen = computed(() => MOMENTS.find((m) => m.ms === ms.value)?.name);

const nudge = (by: number) => { ms.value = Math.max(0, ms.value + by); };
const begins = (s: number) => utcOf(s * SLOT_SECONDS * 1000).slice(11, 19);
</script>

<template>
  <div class="widget slot-clock">
    <div class="readout" aria-live="polite">
      <div class="tile"><span class="tile-label">UTC</span><span class="tile-value time">{{ utcOf(ms) }}</span></div>
      <div class="tile"><span class="tile-label">ms since the era</span><span class="tile-value">{{ ms.toLocaleString("en-US") }}</span></div>
      <div class="tile"><span class="tile-label">slot, rounded down</span><span class="tile-value">{{ slot.toLocaleString("en-US") }}</span></div>
      <div class="tile" :class="{ wrong: bug }"><span class="tile-label">Math.round would say</span><span class="tile-value">{{ rounded.toLocaleString("en-US") }}</span></div>
    </div>
    <p class="line">
      <code>{{ divisionOf(ms) }}</code>, and a slot counts the <em>whole</em> slots gone by, so it rounds down to {{ slot.toLocaleString("en-US") }}.
      <span v-if="bug" class="bug">Rounding to nearest says {{ rounded.toLocaleString("en-US") }}: the bug this lesson hunts.</span>
      <span v-else>Here both roundings agree, so the bug hides.</span>
    </p>
    <div class="controls" role="group" aria-label="a moment">
      <button v-for="m in MOMENTS" :key="m.name" class="small" :class="{ chosen: chosen === m.name }" :aria-pressed="chosen === m.name" @click="ms = m.ms">{{ m.name }}</button>
    </div>
    <div class="controls" role="group" aria-label="nudge the clock">
      <button v-for="s in STEPS" :key="s.label" class="small" :disabled="ms + s.ms < 0" @click="nudge(s.ms)">{{ s.label }}</button>
    </div>
    <ol class="slots" aria-label="the slots around this moment">
      <li v-for="s in slots" :key="s" class="slot" :class="{ now: s === slot }">
        <span class="n">slot {{ s.toLocaleString("en-US") }}</span>
        <span class="begins">{{ begins(s) }}</span>
        <span v-if="s === slot" class="marker" :style="{ left: `${fractionOf(ms) * 100}%` }" aria-hidden="true"></span>
      </li>
    </ol>
    <p class="legend">Each box is one slot, {{ SLOT_SECONDS }} seconds, labelled with the second it begins. The marker is this moment inside its slot.</p>
  </div>
</template>

<style scoped>
.tile .tile-value { min-width: 7ch; }
.tile .tile-value.time { font-size: 18px; min-width: 23ch; }
/* what rounding to nearest gets wrong is red, as a tap's change is elsewhere (custom.css) */
.tile.wrong { background: var(--changed); border-color: var(--changed-line); }
.tile.wrong .tile-value { color: var(--changed-line); }
.line { margin: 8px 0; font-size: 14px; line-height: 1.6; min-height: 3.2em; }
.bug { color: var(--changed-line); }
.controls { display: flex; flex-wrap: wrap; gap: 6px; margin: 0 0 8px; }
.controls button.small { min-height: 32px; }
.slots { list-style: none; display: flex; gap: 4px; padding: 0; margin: 12px 0 4px; }
.slot {
  position: relative; flex: 1 1 0; min-width: 0; min-height: 44px; padding: 4px 6px;
  border: 1px solid var(--vp-c-divider); border-radius: 4px; background: var(--vp-c-bg-soft);
  font-family: var(--vp-font-family-mono); font-size: 12px; line-height: 1.4; overflow: hidden;
}
.slot .n, .slot .begins { display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.slot .begins { color: var(--vp-c-text-2); }
.slot.now { border-color: var(--vp-c-brand-1); border-width: 2px; }
.marker { position: absolute; top: 0; bottom: 0; width: 2px; background: var(--vp-c-brand-1); }
.legend { margin: 0; font-size: 13px; color: var(--vp-c-text-2); }
@media (max-width: 640px) {
  .slots { flex-wrap: wrap; }
  .slot { flex: 1 1 30%; }
  .tile .tile-value.time { font-size: 15px; min-width: 0; }
}
</style>
