<!-- Lesson 12.1: who guarantees which core, on tiny. Seats 0 0 0 1 1 1, shuffled by entropy
     (App. F's Fisher-Yates), then everyone moves on one core every R = 4 slots. Slide the
     block's slot through report_prev_rotation-1's epoch and watch M and M* side by side. -->
<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type { Assignment, Entropy } from "./guarantors.ts";
import { assignCores, assignments, BLANK, byCore, E, ETA2, KAPPA, LAMBDA, R, SEVENS, seats, shuffleSteps, turns, V, ZEROS } from "./guarantors.ts";

const FIRST = 12; // the vector's epoch: slots 12 to 23; its block is at 14
const CHOICES: Entropy[] = [ETA2, SEVENS, ZEROS];
const GOALS = [
  { id: "moves", say: "slide until κ′'s validator 0 moves to the other core" },
  { id: "back", say: "see a full rotation come back: everyone on the cores slot 12 gave them" },
  { id: "lambda", say: "find a block whose M* was dealt last epoch, from λ′ and η′₃" },
  { id: "offender", say: "make an offender: tap a guarantor in M to blank its key" },
];
const fmt = (n: number) => n.toLocaleString("en-US");
const sub = (n: number) => String(n).split("").map((d) => "₀₁₂₃₄₅₆₇₈₉"[Number(d)]).join("");

const slot = ref(14);
const eta2 = ref<Entropy>(ETA2);
const offenders = ref<string[]>([]);
const reached = ref(new Set<string>());

const both = computed(() => assignments(slot.value, eta2.value, offenders.value));
const steps = computed(() => shuffleSteps([...Array(V).keys()], eta2.value.numbers)); // seat numbers, to follow each
const shuffled = computed(() => steps.value.map((s) => seats(V)[s.picked]));
const moved = computed(() => both.value.current.cores);
const rotation = computed(() => Math.floor(slot.value / R));

const mark = (id: string) => { reached.value = new Set([...reached.value, id]); };
// a goal counts when the reader's own change brings it about
watch(slot, (now, before) => {
  const [a, b] = [assignCores(eta2.value, now), assignCores(eta2.value, before)];
  if (a[0] !== b[0]) mark("moves");
  if (turns(now) > 0 && a.join() === assignCores(eta2.value, FIRST).join()) mark("back");
  if (both.value.last.set === "λ′") mark("lambda");
});
function toggle(key: string) {
  if (key === BLANK) return;
  offenders.value = offenders.value.includes(key) ? offenders.value.filter((k) => k !== key) : [...offenders.value, key];
  if (offenders.value.length) mark("offender");
}
/** The key an offender had, so tapping its blanked chip brings it back. */
const original = (a: Assignment, v: number) => (a.set === "κ′" ? KAPPA : LAMBDA)[v];
const step = (d: number) => { slot.value = Math.min(FIRST + E - 1, Math.max(FIRST, slot.value + d)); };
const cards = computed(() => [
  { name: "M", say: "this rotation", a: both.value.current },
  { name: "M*", say: "the last rotation", a: both.value.last },
]);
</script>

<template>
  <div class="widget guarantor-seats">
    <div class="readout" aria-live="polite">
      <div class="tile"><span class="tile-label">slot τ′</span><span class="tile-value">{{ slot }}</span></div>
      <div class="tile"><span class="tile-label">rotation</span><span class="tile-value">{{ rotation }}</span></div>
      <template v-for="c in cards" :key="c.name">
        <div v-for="(vs, core) in byCore(c.a.cores)" :key="core" class="tile" :class="`core${core}`">
          <span class="tile-label">{{ c.name }}, core {{ core }}</span><span class="tile-value">{{ vs.join(" ") }}</span>
        </div>
      </template>
    </div>
    <p class="range">
      {{ V }} validators keep {{ V / 3 }} cores active, 3 guarantors each. Every R = {{ R }} slots everyone moves on one
      core, wrapping round; an epoch is E = {{ E }} slots, so {{ E / R }} rotations, then a new deal. Slot {{ slot }} is
      slot {{ slot % E }} of epoch {{ Math.floor(slot / E) }}: ⌊{{ slot % E }}/{{ R }}⌋ = {{ turns(slot) }}
      move{{ turns(slot) === 1 ? "" : "s" }} so far.
    </p>
    <div class="controls">
      <button class="small step" aria-label="one slot back" @click="step(-1)">◀</button>
      <input v-model.number="slot" type="range" :min="FIRST" :max="FIRST + E - 1" aria-label="the block's slot, τ′" />
      <button class="small step" aria-label="one slot on" @click="step(1)">▶</button>
    </div>
    <div class="controls">
      <span class="label">η′₂:</span>
      <button v-for="e in CHOICES" :key="e.name" class="small" :class="{ chosen: e === eta2 }" :aria-pressed="e === eta2" @click="eta2 = e">
        {{ e === ETA2 ? `the vector's, ${e.hex}` : e.name }}
      </button>
    </div>

    <div class="label">
      M's deal, step by step: the seats; F, the shuffle, with the numbers r = Q₆(η′₂) that Blake2b draws from
      {{ eta2 === ETA2 ? "η′₂" : eta2.name }}; then everyone moved on
    </div>
    <div class="row"><span class="who">seats</span>
      <span v-for="(c, i) in seats(V)" :key="i" class="chip" :class="`core${c}`"><b>{{ c }}</b><small>seat {{ i }}</small></span>
    </div>
    <ol class="picks">
      <li v-for="(s, v) in steps" :key="v">
        left: {{ s.pool.join(" ") }}. r{{ sub(v) }} = {{ fmt(s.number) }} mod {{ s.pool.length }} = {{ s.index }}:
        validator {{ v }} takes seat <b>{{ s.picked }}</b>{{ s.index < s.pool.length - 1 ? `; seat ${s.pool[s.pool.length - 1]} fills the gap` : "" }}
      </li>
    </ol>
    <div class="row"><span class="who">shuffled</span>
      <span v-for="(c, v) in shuffled" :key="v" class="chip" :class="`core${c}`"><b>{{ c }}</b><small>validator {{ v }}</small></span>
    </div>
    <div class="row"><span class="who">+ {{ turns(slot) }} move{{ turns(slot) === 1 ? "" : "s" }}</span>
      <span v-for="(c, v) in moved" :key="v" class="chip" :class="`core${c}`"><b>{{ c }}</b><small>validator {{ v }}</small></span>
    </div>

    <div class="cards">
      <div v-for="c in cards" :key="c.name" class="card">
        <div class="card-head"><b>{{ c.name }}</b>, {{ c.say }}: P(6, {{ c.a.set === "κ′" ? "η′₂" : "η′₃" }}, {{ c.a.slot }})</div>
        <div class="card-say">
          slot {{ c.a.slot }}, epoch {{ Math.floor(c.a.slot / E) }}: {{ c.a.set }}'s validators, {{ turns(c.a.slot) }}
          move{{ turns(c.a.slot) === 1 ? "" : "s" }}
        </div>
        <div v-for="(vs, core) in byCore(c.a.cores)" :key="core" class="row">
          <span class="who">core {{ core }}</span>
          <button
            v-for="v in vs" :key="v" class="chip key" :class="[`core${core}`, { banned: c.a.keys[v] === BLANK }]"
            :aria-pressed="c.a.keys[v] === BLANK" :aria-label="`validator ${v}, key 0x${c.a.keys[v]}: an offender?`"
            @click="toggle(original(c.a, v))"
          >
            <b>{{ v }}</b><small>0x{{ c.a.keys[v] }}…</small>
          </button>
        </div>
      </div>
    </div>
    <p class="note">
      The numbers count in each card's own set: M* across an epoch counts in λ′, so match validators by key. A guarantee made
      in τ′'s rotation (⌊t/{{ R }}⌋ = {{ rotation }}) answers to M; one made in the rotation before, to M*.
      <template v-if="offenders.length">
        An offender keeps its seat, but its key is zeros: no signature of its can count.
      </template>
    </p>
    <ul class="goals">
      <li v-for="g in GOALS" :key="g.id" :class="{ done: reached.has(g.id) }">{{ reached.has(g.id) ? "✓" : "○" }} {{ g.say }}</li>
    </ul>
  </div>
</template>

<style scoped>
.range { font-size: 14px; color: var(--vp-c-text-2); margin: 0 0 12px; line-height: 1.5; }
.controls { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; margin-bottom: 8px; }
.controls input[type="range"] { flex: 1; min-width: 0; height: 32px; }
.step { min-width: 40px; min-height: 32px; }
.controls .small { min-height: 32px; }
.label { font-size: 13px; color: var(--vp-c-text-2); }
.tile.core0 { border-color: var(--bit-top-line); background: var(--bit-top); }
.tile.core1 { border-color: var(--bit-low-line); background: var(--bit-low); }
.row { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin: 6px 0; }
.who { font-size: 13px; color: var(--vp-c-text-2); font-family: var(--vp-font-family-mono); min-width: 72px; }
.chip {
  display: inline-flex; flex-direction: column; align-items: center; min-width: 44px; min-height: 32px; padding: 2px 6px;
  border: 2px solid var(--vp-c-divider); border-radius: 4px; font-family: var(--vp-font-family-mono); line-height: 1.2;
}
.chip b { font-size: 16px; }
.chip small { font-size: 10px; color: var(--vp-c-text-2); }
.chip.core0 { border-color: var(--bit-top-line); background: var(--bit-top); }
.chip.core1 { border-color: var(--bit-low-line); background: var(--bit-low); }
.chip.key { cursor: pointer; }
.chip.banned { border-style: dashed; background: var(--vp-c-bg-soft); text-decoration: line-through; }
.picks { font-family: var(--vp-font-family-mono); font-size: 13px; margin: 4px 0; padding-left: 20px; line-height: 1.6; }
.cards { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 12px; }
.card { flex: 1 1 260px; min-width: 0; padding: 8px 12px; border: 1px solid var(--vp-c-divider); border-radius: 6px; }
.card-head { font-family: var(--vp-font-family-mono); font-size: 14px; }
.card-say { font-size: 13px; color: var(--vp-c-text-2); }
.note { font-size: 14px; color: var(--vp-c-text-2); line-height: 1.5; margin: 8px 0 0; }
.goals { list-style: none; padding: 0; margin: 12px 0 0; font-size: 14px; color: var(--vp-c-text-2); }
.goals li.done { color: var(--vp-c-green-1); }
@media (max-width: 640px) {
  .widget.guarantor-seats { padding: 12px; }
  .who { min-width: 56px; }
  .picks { font-size: 12px; }
}
</style>
