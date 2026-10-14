<!-- Lesson 15.11: the gas meter (GP App. A.4). A three-block program with a loop: set the
     starting gas, step, and watch each block paid for in full on the way in, the flag flip,
     and oog strike at the door of the first block the gas can't pay for. -->
<script setup lang="ts">
import { computed, ref } from "vue";
import type { Event, Meter } from "./gas-meter.ts";
import { blockStarts, costAt, GOALS, goalsMet, LOOP, PROGRAM, runToStop, start, step } from "./gas-meter.ts";
import { say } from "./pipeline.ts";

const MOST = 200;
const starts = blockStarts(PROGRAM);
const blocks = starts.map((from, k) => ({
  from,
  lines: PROGRAM.slice(from, starts[k + 1] ?? PROGRAM.length).map((ins, j) => ({ at: from + j, ins })),
  cost: costAt(PROGRAM, from),
}));
const NAMES: Record<number, string> = { 0: "start", [LOOP]: "the loop", [starts[2]]: "the end" };

const gas = ref(100);
const m = ref<Meter>(start(gas.value));
const log = ref<Event[]>([]);
const reached = ref(new Set<string>());

const stopped = computed(() => ["halt", "panic", "oog"].includes(m.value.exit));
const paidTimes = (from: number) => m.value.bought.filter((b) => b === from).length;

function reset(to = gas.value) {
  gas.value = Math.max(0, Math.min(MOST, to));
  m.value = start(gas.value);
  log.value = [];
}
function record(after: Meter, events: Event[]) {
  m.value = after;
  log.value = [...events.reverse(), ...log.value].slice(0, 4);
  for (const e of events) reached.value = new Set([...reached.value, ...goalsMet(after, e)]);
}
function once() {
  const s = step(PROGRAM, m.value);
  record(s.m, [s.event]);
}
function toStop() {
  const s = runToStop(PROGRAM, m.value);
  record(s.m, s.events);
}
</script>

<template>
  <div class="widget gas-meter">
    <div class="readout" aria-live="polite">
      <div class="tile"><span class="tile-label">gas ϱ</span><span class="tile-value">{{ m.gas }}</span></div>
      <div class="tile"><span class="tile-label">this block</span><span class="tile-value wide">{{ m.paid ? "paid" : "not paid" }}</span></div>
      <div class="tile"><span class="tile-label">steps</span><span class="tile-value">{{ m.steps }}</span></div>
      <div class="tile"><span class="tile-label">ε</span><span class="tile-value">{{ m.exit }}</span></div>
    </div>
    <p class="range">
      A step whose block isn't paid for pays its whole price ϱ^Δ first (from lesson 15.10's model CPU). Too little gas:
      oog, and nothing runs, nothing changes. A jump, a branch or a fallthrough that carries on turns the flag off;
      <code>ecalli</code> doesn't. r1 counts the laps down from 3; r0 holds the halt address.
    </p>
    <div class="controls">
      <label class="what" for="gas-meter-start">starting gas</label>
      <button class="small" aria-label="one less gas" :disabled="gas <= 0" @click="reset(gas - 1)">−</button>
      <input id="gas-meter-start" v-model.number="gas" type="range" min="0" :max="MOST" @input="reset(Number(($event.target as HTMLInputElement).value))" />
      <button class="small" aria-label="one more gas" :disabled="gas >= MOST" @click="reset(gas + 1)">+</button>
      <span class="start-value">{{ gas }}</span>
    </div>

    <div class="program">
      <section v-for="b in blocks" :key="b.from" class="block" :class="{ here: b.lines.some((l) => l.at === m.pc) }">
        <div class="block-head">
          <span>{{ NAMES[b.from] }}: ϱ^Δ = <b>{{ b.cost }}</b></span>
          <span class="paid">paid {{ paidTimes(b.from) }}×</span>
        </div>
        <ol>
          <li v-for="l in b.lines" :key="l.at" :class="{ pc: l.at === m.pc }">
            <span class="n">{{ l.at + 1 }}</span>
            <span class="arrow" aria-hidden="true">{{ l.at === m.pc ? "ı ▸" : "" }}</span>
            <code>{{ say(l.ins) }}</code>
          </li>
        </ol>
      </section>
    </div>
    <p class="regs">r1 = {{ m.regs[1] }} · r2 = {{ m.regs[2] }} · r0 = the halt address</p>
    <div class="controls go">
      <button class="small" :disabled="stopped" @click="once">{{ m.exit === "host" ? "the host answers: step" : "step" }}</button>
      <button class="small" :disabled="stopped" @click="toStop">run until it stops</button>
      <button class="small" @click="reset()">start again</button>
    </div>
    <div class="log" aria-live="polite">
      <ol v-for="(e, i) in log" :key="`${m.steps}-${i}`" :class="{ old: i > 0 }">
        <li v-for="(line, j) in e.lines" :key="j">{{ line }}</li>
      </ol>
      <p v-if="!log.length" class="none">Step: what each step pays and runs is told here.</p>
    </div>
    <ul class="goals">
      <li v-for="g in GOALS" :key="g.id" :class="{ done: reached.has(g.id) }">{{ reached.has(g.id) ? "✓" : "○" }} <UnitText :text="g.say" /></li>
    </ul>
  </div>
</template>

<style scoped>
.range { font-size: 14px; color: var(--vp-c-text-2); margin: 0 0 12px; line-height: 1.5; }
.tile-value { min-width: 4ch; }
.tile-value.wide { min-width: 8ch; }
.controls { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; margin-bottom: 8px; }
.controls button { min-height: 36px; }
.controls button.small[aria-label] { min-width: 36px; }
.controls button:disabled { opacity: 0.5; cursor: default; }
.controls input[type="range"] { flex: 1; min-width: 0; height: 32px; }
.what { font-size: 13px; color: var(--vp-c-text-2); width: 100%; }
.start-value { font-family: var(--vp-font-family-mono); min-width: 3ch; text-align: right; }
.program { display: grid; gap: 6px; margin: 8px 0; }
.block { border: 1px solid var(--vp-c-divider); border-radius: 6px; padding: 4px 8px; background: var(--vp-c-bg-soft); }
.block.here { border: 2px solid var(--vp-c-brand-1); }
.block-head { display: flex; justify-content: space-between; gap: 8px; font-size: 13px; color: var(--vp-c-text-2); }
.paid { font-family: var(--vp-font-family-mono); }
.block ol { list-style: none; padding: 0; margin: 4px 0 0; }
.block li { display: flex; gap: 6px; align-items: baseline; margin: 0; padding: 1px 4px; border-radius: 4px; font-size: 14px; }
.block li.pc { background: var(--bit-top); }
.n { font-family: var(--vp-font-family-mono); font-size: 12px; color: var(--vp-c-text-3); min-width: 2ch; }
.arrow { font-family: var(--vp-font-family-mono); font-size: 12px; min-width: 3ch; color: var(--vp-c-brand-1); }
.regs { font-family: var(--vp-font-family-mono); font-size: 13px; color: var(--vp-c-text-2); margin: 4px 0 8px; }
.log { margin-top: 12px; font-size: 14px; line-height: 1.5; }
.log ol { margin: 0 0 8px; padding-left: 20px; }
.log ol.old { color: var(--vp-c-text-3); font-size: 13px; }
.log li { margin: 0; }
.none { font-size: 13px; color: var(--vp-c-text-3); }
.goals { list-style: none; padding: 0; margin: 12px 0 0; font-size: 14px; color: var(--vp-c-text-2); }
.goals li.done { color: var(--vp-c-green-1); }
</style>
