<!-- Lesson 9.1: a Merkle mountain belt, appended to one item at a time. The new item is
     carried up from place 0, merging with every peak it meets, until it rests in an empty
     place: adding 1 in binary. Items are numbered, not hashed, so a peak reads as the items
     under it. Step by step shows the carry one place at a time. -->
<script setup lang="ts">
import { computed, ref } from "vue";
import { appendSteps, beltOf, beltPartway, itemsIn, label, mergeMountains, peaksIn } from "./belt.ts";
import type { Belt, Mountain, Step } from "./belt.ts";

const MOST = 63; // six places, 111111: the row still fits a phone
const START = 5; // the lesson's example: a mountain of 4 and a mountain of 1
const GOALS = [
  { id: "three", say: "make the belt need 3 peaks" },
  { id: "carry", say: "watch a carry go 3 places" },
  { id: "four", say: "make a new mountain of 4" },
];

const belt = ref<Belt<Mountain>>(beltOf(START));
const stepping = ref(false);
/** The append under way in step-by-step mode: its steps, and how many are taken. */
const pending = ref<{ before: Belt<Mountain>; steps: Step<Mountain>[]; after: Belt<Mountain>; taken: number } | null>(null);
/** The last append's steps, for the log, and the count it started from. */
const last = ref<{ from: number; steps: Step<Mountain>[] } | null>(null);
const reached = ref(new Set<string>());

const n = computed(() => itemsIn(belt.value));
const width = computed(() => Math.max(1, belt.value.length));
const binary = (x: number) => x.toString(2).padStart(width.value, "0");
const shown = computed(() => (pending.value ? beltPartway(pending.value.before, pending.value.steps, pending.value.taken) : belt.value));
const carry = computed(() => {
  const p = pending.value;
  return p && p.taken < p.steps.length ? p.steps[p.taken] : null;
});
const places = computed(() => Math.max(shown.value.length, carry.value ? carry.value.place + 1 : 0));
const log = computed(() => (pending.value ? pending.value.steps.slice(0, pending.value.taken) : last.value?.steps ?? []));
const merges = (steps: Step<Mountain>[]) => steps.filter((s) => s.action === "merge").length;

function finish(steps: Step<Mountain>[], after: Belt<Mountain>) {
  last.value = { from: n.value, steps };
  belt.value = after;
  pending.value = null;
  // a goal counts when the reader's append brings it about
  const rest = steps[steps.length - 1];
  const mark = (id: string) => { reached.value = new Set([...reached.value, id]); };
  if (peaksIn(after) === 3) mark("three");
  if (merges(steps) >= 3) mark("carry");
  if (rest.place === 2) mark("four");
}
function append() {
  if (n.value >= MOST || pending.value) return;
  const item = { first: n.value + 1, last: n.value + 1 };
  const { steps, belt: after } = appendSteps(belt.value, item, mergeMountains);
  if (stepping.value) pending.value = { before: belt.value, steps, after, taken: 0 };
  else finish(steps, after);
}
function next() {
  const p = pending.value;
  if (!p) return;
  p.taken++;
  if (p.taken === p.steps.length) finish(p.steps, p.after);
}
function toggleStepping() {
  stepping.value = !stepping.value;
  const p = pending.value;
  if (!stepping.value && p) finish(p.steps, p.after);
}
function reset() {
  belt.value = [];
  pending.value = null;
  last.value = null;
}
const size = (place: number) => 2 ** place;
const said = (s: Step<Mountain>) =>
  s.action === "merge"
    ? `place ${s.place} holds ${label(s.peak)}: merge. H(${label(s.peak)} ⌢ ${label(s.carried)}) = ${label(s.merged)}, carried on; place ${s.place} empties.`
    : s.newPlace
      ? `past the last place: rest. ${label(s.carried)} is a new, biggest mountain in place ${s.place}.`
      : `place ${s.place} is empty: rest. ${label(s.carried)} stays there.`;
</script>

<template>
  <div class="widget mountain-belt">
    <div class="readout" aria-live="polite">
      <div class="tile"><span class="tile-label">items n</span><span class="tile-value">{{ n }}</span></div>
      <div class="tile"><span class="tile-label">peaks</span><span class="tile-value">{{ peaksIn(belt) }}</span></div>
      <div class="tile"><span class="tile-label">n in binary</span><span class="tile-value">{{ n.toString(2) }}</span></div>
    </div>
    <p class="range">
      Place i holds the peak of a mountain of 2^i items, or ∅. Appending carries the new item up from place 0: a peak
      there merges with it, H(peak ⌢ carried), and the carry moves on; an empty place, and it rests. Items are numbered
      here, not hashed: 1–4 stands for the hash of the mountain over items 1 to 4.
    </p>
    <div class="belt" :style="{ gridTemplateColumns: `repeat(${places}, minmax(0, 1fr))` }">
      <template v-for="i in places" :key="`c${i}`">
        <span class="carry" :style="{ gridColumn: i, gridRow: 1 }">
          <template v-if="carry && carry.place === i - 1">↓ {{ label(carry.carried) }}</template>
        </span>
      </template>
      <div v-for="i in places" :key="i" class="place" :style="{ gridColumn: i, gridRow: 2 }"
        :class="{ held: shown[i - 1], here: carry && carry.place === i - 1 }">
        <span class="name"><span class="word">place </span>{{ i - 1 }}</span>
        <span class="peak">{{ shown[i - 1] ? label(shown[i - 1]!) : "∅" }}</span>
        <span class="name">of {{ size(i - 1) }}</span>
        <span class="bit">{{ shown[i - 1] ? 1 : 0 }}</span>
      </div>
    </div>
    <p v-if="!places" class="line">An empty belt: no places yet, n = 0.</p>
    <p v-else class="line">
      {{ n }} in binary is <b>{{ n.toString(2) }}</b>. Read the places from the right: the peaks are its 1s.
    </p>
    <div class="controls">
      <button class="small" :disabled="n >= MOST || !!pending" @click="append">append item {{ n + 1 }}</button>
      <button class="small" :aria-pressed="stepping" :class="{ chosen: stepping }" @click="toggleStepping">step by step</button>
      <button v-if="stepping" class="small" :disabled="!pending" @click="next">next step</button>
      <button class="small" @click="reset">empty the belt</button>
    </div>
    <div v-if="pending || last" class="log">
      <p class="sum">
        <template v-if="pending">appending item {{ n + 1 }}: carrying {{ carry ? label(carry.carried) : "" }}</template>
        <template v-else-if="last">
          appended item {{ last.from + 1 }}: {{ binary(last.from) }} + 1 = {{ binary(n) }},
          {{ merges(last.steps) }} merge{{ merges(last.steps) === 1 ? "" : "s" }}
        </template>
      </p>
      <ol>
        <li v-for="s in log" :key="s.place" :class="s.action">{{ said(s) }}</li>
      </ol>
    </div>
    <p v-if="n >= MOST" class="line">63 items fill six places: 111111. Empty the belt to start again.</p>
    <ul class="goals">
      <li v-for="g in GOALS" :key="g.id" :class="{ done: reached.has(g.id) }">{{ reached.has(g.id) ? "✓" : "○" }} {{ g.say }}</li>
    </ul>
  </div>
</template>

<style scoped>
.range { font-size: 14px; color: var(--vp-c-text-2); margin: 0 0 12px; line-height: 1.5; }
.belt { display: grid; gap: 4px; max-width: 100%; }
.carry { min-height: 22px; text-align: center; font-family: var(--vp-font-family-mono); font-size: 13px; color: var(--bit-mark-line); font-weight: 600; }
.place {
  display: flex; flex-direction: column; align-items: center; min-width: 0; padding: 6px 2px;
  border: 1px solid var(--vp-c-divider); border-radius: 6px; background: var(--vp-c-bg-soft);
  font-family: var(--vp-font-family-mono);
}
.place.held { background: var(--bit-low); border-color: var(--bit-low-line); }
.place.here { border-color: var(--bit-mark-line); box-shadow: 0 0 0 2px var(--bit-mark-line); }
.name { font-size: 12px; color: var(--vp-c-text-2); white-space: nowrap; }
.peak { font-size: 16px; font-weight: 600; white-space: nowrap; }
.place:not(.held) .peak { color: var(--vp-c-text-3); }
.bit { font-size: 18px; font-weight: 600; }
.place:not(.held) .bit { color: var(--vp-c-text-3); }
.line { font-size: 14px; margin: 8px 0; }
.controls { display: flex; gap: 6px; flex-wrap: wrap; }
.controls button { min-height: 32px; }
.controls button:disabled { opacity: 0.5; cursor: default; }
.sum { font-family: var(--vp-font-family-mono); font-size: 14px; margin: 12px 0 4px; }
.log ol { margin: 0; padding-left: 20px; font-size: 14px; line-height: 1.5; }
.goals { list-style: none; padding: 0; margin: 12px 0 0; font-size: 14px; color: var(--vp-c-text-2); }
.goals li.done { color: var(--vp-c-green-1); }
@media (max-width: 640px) {
  .peak { font-size: 12px; }
  .word { display: none; }
  .name { font-size: 11px; }
  .place { padding: 4px 1px; }
}
</style>
