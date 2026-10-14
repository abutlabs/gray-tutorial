<!-- Lesson 16.6: an accumulation's two contexts, X (live) and Y (the fallback). Build a run
     from host calls, end it with a halt, a panic or out of gas, and see which one the
     collapse C keeps: X on a halt, Y otherwise. -->
<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type { Context, Exit, Step } from "./checkpoints.ts";
import { AMOUNT, collapse, keeps, keysOf, MOST_STEPS, run, same, START, VALUE } from "./checkpoints.ts";

const CALLS: { step: Step; say: string }[] = [
  { step: "write last", say: `write "last" → ${VALUE}` },
  { step: "write ast", say: `write "ast" → ${VALUE}` },
  { step: "transfer", say: `transfer ${AMOUNT} to service 1` },
  { step: "checkpoint", say: "checkpoint" },
];
const EXITS: Exit[] = ["halt", "panic", "out of gas"];
const GOALS = [
  { id: "lose", say: "lose everything the service did to a panic" },
  { id: "first", say: "the lesson's example: keep \"last\" through a panic, lose \"ast\"" },
  { id: "halt", say: "halt and keep it all" },
  { id: "money", say: "run out of gas and take back a transfer, the money included" },
];
const fmt = (n: number) => n.toLocaleString("en-US");
const say = (step: Step) => CALLS.find((c) => c.step === step)?.say ?? step;

const steps = ref<Step[]>([]);
const exit = ref<Exit | null>(null);
const reached = ref(new Set<string>());

const pairs = computed(() => run(steps.value));
const last = computed(() => pairs.value[pairs.value.length - 1]);
const kept = computed(() => (exit.value ? collapse(last.value, exit.value) : null));
const full = computed(() => steps.value.length >= MOST_STEPS);

const add = (step: Step) => { if (!exit.value && !full.value) steps.value = [...steps.value, step]; };
function undo() {
  if (exit.value) exit.value = null;
  else steps.value = steps.value.slice(0, -1);
}
function again() {
  steps.value = [];
  exit.value = null;
}
const storage = (c: Context) => keysOf(c).join(", ") || "no keys";
const sent = (c: Context) => (c.sent.length ? `sent ${c.sent.join(", ")}` : "sent nothing");

// a goal counts when the reader's own ending brings it about
watch(exit, (now) => {
  if (!now || !kept.value) return;
  const x = last.value.x, k = kept.value;
  const mark = (id: string) => { reached.value = new Set([...reached.value, id]); };
  const did = !same(x, START);
  if (now === "panic" && did && same(k, START)) mark("lose");
  if (now === "panic" && keysOf(k).join() === "last" && "ast" in x.storage) mark("first");
  if (now === "halt" && did) mark("halt");
  if (now === "out of gas" && x.sent.length > k.sent.length) mark("money");
});
</script>

<template>
  <div class="widget checkpoint-run">
    <div class="readout" aria-live="polite">
      <div class="tile"><span class="tile-label">the run</span><span class="tile-value wide">{{ exit ?? "running" }}</span></div>
      <div class="tile"><span class="tile-label">C keeps</span><span class="tile-value">{{ exit ? keeps(exit) : "…" }}</span></div>
      <div class="tile"><span class="tile-label">storage after</span><span class="tile-value wide">{{ kept ? keysOf(kept).join(" ") || "—" : "…" }}</span></div>
      <div class="tile"><span class="tile-label">balance after</span><span class="tile-value">{{ kept ? fmt(kept.balance) : "…" }}</span></div>
    </div>
    <p class="range">
      Service 0 starts with neither key stored and a balance of 1,000, in both X and Y. Every host call changes X;
      <b>checkpoint</b> copies X into Y. When the machine stops, a <b>halt</b> keeps X; a <b>panic</b> or running
      <b>out of gas</b> keeps Y.
    </p>
    <div class="controls">
      <span class="label">host calls</span>
      <button v-for="c in CALLS" :key="c.step" class="small" :disabled="!!exit || full" @click="add(c.step)">{{ c.say }}</button>
    </div>
    <div class="controls">
      <span class="label">then stop</span>
      <button v-for="e in EXITS" :key="e" class="small" :class="{ chosen: e === exit }" :aria-pressed="e === exit" :disabled="!!exit && e !== exit" @click="exit = e">
        {{ e }}
      </button>
      <button class="small" :disabled="!exit && !steps.length" @click="undo">undo</button>
      <button class="small" :disabled="!exit && !steps.length" @click="again">start again</button>
    </div>
    <p v-if="full && !exit" class="note">That's {{ MOST_STEPS }} host calls: time to stop the machine.</p>

    <table class="run">
      <thead><tr><th>after</th><th>X, live</th><th>Y, the fallback</th></tr></thead>
      <tbody>
        <tr v-for="(p, i) in pairs" :key="i">
          <td class="what">{{ i === 0 ? "the start, I(…)²" : say(steps[i - 1]) }}</td>
          <td :class="{ changed: i > 0 && steps[i - 1] !== 'checkpoint', kept: exit && i === pairs.length - 1 && keeps(exit) === 'X' }">
            {{ storage(p.x) }}<br />{{ fmt(p.x.balance) }}, {{ sent(p.x) }}
          </td>
          <td :class="{ changed: i > 0 && steps[i - 1] === 'checkpoint', kept: exit && i === pairs.length - 1 && keeps(exit) === 'Y' }">
            {{ storage(p.y) }}<br />{{ fmt(p.y.balance) }}, {{ sent(p.y) }}
          </td>
        </tr>
      </tbody>
    </table>
    <p v-if="exit && kept" class="line">
      {{ exit }}: C keeps <b>{{ keeps(exit) }}</b>. Service 0 is left with storage {{ storage(kept) }}, a balance of
      {{ fmt(kept.balance) }}, and {{ sent(kept) }}.
      <template v-if="!same(kept, last.x)">What X did after the last checkpoint never happened.</template>
    </p>
    <ul class="goals">
      <li v-for="g in GOALS" :key="g.id" :class="{ done: reached.has(g.id) }">{{ reached.has(g.id) ? "✓" : "○" }} <UnitText :text="g.say" /></li>
    </ul>
  </div>
</template>

<style scoped>
.range { font-size: 14px; color: var(--vp-c-text-2); margin: 0 0 12px; line-height: 1.5; }
.controls { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; margin-bottom: 8px; }
.controls .small { min-height: 32px; }
.controls .small:disabled { opacity: 0.45; cursor: default; }
.label { font-size: 13px; color: var(--vp-c-text-2); min-width: 72px; }
.tile-value.wide { min-width: 10ch; }
.run { width: 100%; border-collapse: collapse; font-size: 13px; margin: 8px 0; display: table; }
.run th { text-align: left; font-weight: 500; color: var(--vp-c-text-2); }
.run th, .run td { padding: 4px 6px; border: 1px solid var(--vp-c-divider); vertical-align: top; }
.run td { font-family: var(--vp-font-family-mono); }
.run td.what { font-family: inherit; color: var(--vp-c-text-2); }
.run td.changed { background: var(--bit-mark); }
.run td.kept { outline: 2px solid var(--bit-low-line); outline-offset: -2px; background: var(--bit-low); }
.line { font-size: 14px; margin: 8px 0; line-height: 1.5; }
.note { font-size: 14px; color: var(--vp-c-text-2); margin: 0 0 8px; }
.goals { list-style: none; padding: 0; margin: 12px 0 0; font-size: 14px; color: var(--vp-c-text-2); }
.goals li.done { color: var(--vp-c-green-1); }
@media (max-width: 640px) {
  .widget.checkpoint-run { padding: 12px; }
  .run { font-size: 12px; }
  .run th, .run td { padding: 3px 4px; }
}
</style>
