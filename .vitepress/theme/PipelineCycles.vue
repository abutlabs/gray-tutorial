<!-- Lesson 15.10: the Gray Paper's model CPU (App. A.9) running one basic block. Pick one of
     the lesson's blocks or build one, then step cycle by cycle: a timeline with a row a line,
     what each line is doing and why it waits, and the block's cost ϱ^Δ at the end. -->
<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type { Ins, Op } from "./pipeline.ts";
import {
  BODY_OPS, BUFFER, columns, cost, DECODE_SLOTS, END_OPS, GOALS, goalsMet, MOST_LINES, nextChange,
  OVERHEAD, PRESETS, retype, say, simulate, STARTS, tokens, UNIT_NAMES, UNITS,
} from "./pipeline.ts";

const SHORT: Partial<Record<Op, string>> = {
  load_ind_u64: "load", store_ind_u64: "store", add_64: "add", add_imm_64: "add", mul_64: "mul",
  div_u_64: "div", move_reg: "move", load_imm: "imm", load_imm_jump: "call",
};
const short = (op: Op) => SHORT[op] ?? op;
const REGISTERS = Array.from({ length: 13 }, (_, i) => i);
const copy = (block: Ins[]) => block.map((ins) => ({ ...ins, regs: [...ins.regs] }));

const chosen = ref("four");
const block = ref<Ins[]>(copy(PRESETS[0].block));
const at = ref(0);
const reached = ref(new Set<string>());

const run = computed(() => simulate(block.value));
const frame = computed(() => run.value.frames[at.value]);
const cols = computed(() => columns(run.value.frames, at.value));
const last = computed(() => run.value.frames.length - 1);
const entries = computed(() => block.value.filter((ins) => ins.op !== "move_reg").length);
const done = computed(() => at.value === last.value);

function pick(id: string) {
  chosen.value = id;
  block.value = copy(PRESETS.find((p) => p.id === id)!.block);
  at.value = 0;
}
function edit(change: (b: Ins[]) => void) {
  const b = copy(block.value);
  change(b);
  block.value = b;
  chosen.value = "";
  at.value = 0;
}
const setOp = (i: number, op: Op) => edit((b) => { b[i] = retype(op, b[i]); });
const setReg = (i: number, k: number, reg: number) => edit((b) => { b[i].regs[k] = reg; });
const remove = (i: number) => edit((b) => { b.splice(i, 1); });
const addLine = () => edit((b) => { b.splice(b.length - 1, 0, retype("load_ind_u64")); });
const opsFor = (i: number) => {
  const offered = i === block.value.length - 1 ? END_OPS : BODY_OPS;
  const op = block.value[i].op;
  return offered.includes(op) ? offered : [op, ...offered];
};
const facts = (ins: Ins) => {
  const c = cost(ins);
  const units = UNIT_NAMES.filter((_, k) => c.units[k] > 0).join("+") || "no units";
  return `č ${c.cycles} · ď ${c.slots} · ${units}`;
};
const unitsLeft = computed(() => UNIT_NAMES.map((name, k) => `${name} ${frame.value.free[k]}/${UNITS[k]}`).join(" · "));
const label = (c: { from: number; to: number }) => {
  const [a, b] = [run.value.frames[c.from].cycle, run.value.frames[c.to].cycle];
  return a === b ? `${a}` : `${a}–${b}`;
};
const shown = (i: number, col: { from: number }) => {
  const cell = run.value.frames[col.from].cells[i];
  return cell.event === "decoded" ? "D" : cell.mark;
};
const cellClass = (i: number, col: { from: number }) => {
  const cell = run.value.frames[col.from].cells[i];
  return [cell.event === "decoded" ? "dec" : `s-${cell.mark === "·" ? "ret" : cell.mark || "none"}`, { starts: cell.event === "started" }];
};
const chip = (i: number) => {
  const cell = frame.value.cells[i];
  if (cell.event === "decoded") return "D";
  if (cell.event === "started") return "W▸";
  return cell.mark || "–";
};

// a goal counts when the reader's own stepping lands on a cycle that shows it
watch([run, at], () => {
  reached.value = new Set([...reached.value, ...goalsMet(run.value, at.value)]);
});
</script>

<template>
  <div class="widget pipeline-cycles">
    <div class="readout" aria-live="polite">
      <div class="tile"><span class="tile-label">cycle</span><span class="tile-value">{{ frame.cycle }}</span></div>
      <div class="tile"><span class="tile-label">in the buffer</span><span class="tile-value">{{ frame.buffer }}</span></div>
      <div class="tile"><span class="tile-label">retired</span><span class="tile-value">{{ frame.retired }}/{{ entries }}</span></div>
      <div class="tile"><span class="tile-label">ϱ^Δ = cycles − {{ OVERHEAD }}</span><span class="tile-value">{{ done ? run.cost : "…" }}</span></div>
    </div>
    <p class="range">
      Each cycle the CPU decodes in order, up to {{ DECODE_SLOTS }} slots' worth (ď), into a buffer of at most {{ BUFFER }}.
      A decoded line starts once what it reads is made and its units are free ({{ UNITS[0] }} ALU, {{ UNITS[1] }} load,
      {{ UNITS[2] }} store, 1 multiplier, 1 divider), up to {{ STARTS }} a cycle; it runs č cycles; finished lines retire in
      order. The block costs the cycles to retire everything, less {{ OVERHEAD }}, at least 1.
    </p>
    <div class="controls" role="group" aria-label="the lesson's blocks">
      <button v-for="p in PRESETS" :key="p.id" class="small" :class="{ chosen: chosen === p.id }" :aria-pressed="chosen === p.id" @click="pick(p.id)">
        {{ p.say }}
      </button>
    </div>

    <div class="label">the block: change a line, or add one</div>
    <ol class="lines">
      <li v-for="(ins, i) in block" :key="i">
        <span class="n">{{ i + 1 }}</span>
        <span class="code">
          <select :value="ins.op" :aria-label="`line ${i + 1}: instruction`" @change="setOp(i, ($event.target as HTMLSelectElement).value as Op)">
            <option v-for="op in opsFor(i)" :key="op" :value="op">{{ op }}</option>
          </select>
          <template v-for="(t, j) in tokens(ins)" :key="j">
            <select v-if="typeof t === 'number'" :value="ins.regs[t]" class="reg" :aria-label="`line ${i + 1}: register ${t + 1}`" @change="setReg(i, t, Number(($event.target as HTMLSelectElement).value))">
              <option v-for="r in REGISTERS" :key="r" :value="r">r{{ r }}</option>
            </select>
            <span v-else-if="t === 'n'" class="text">{{ ins.imm ?? 0 }}</span>
            <!-- trap, jump, fallthrough: the picker already says it -->
            <span v-else-if="t !== ins.op" class="text">{{ t }}</span>
          </template>
        </span>
        <span class="facts">{{ facts(ins) }}</span>
        <button v-if="i < block.length - 1" class="small x" :aria-label="`remove line ${i + 1}, ${say(ins)}`" @click="remove(i)">×</button>
      </li>
    </ol>
    <div class="controls">
      <button class="small" :disabled="block.length > MOST_LINES" @click="addLine">+ a line</button>
    </div>

    <div class="label">the timeline: a column is the start of a cycle, as the lesson's printout catches it</div>
    <div class="strip" role="region" aria-label="timeline, scrolls sideways" tabindex="0">
      <table class="timeline">
        <thead>
          <tr>
            <th class="who" scope="col">line</th>
            <th v-for="(c, k) in cols" :key="c.from" scope="col" :class="{ now: k === cols.length - 1 }">{{ label(c) }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(ins, i) in block" :key="i">
            <th class="who" scope="row">{{ i + 1 }} {{ short(ins.op) }}</th>
            <td v-for="(c, k) in cols" :key="c.from" :class="[cellClass(i, c), { now: k === cols.length - 1 }]">{{ shown(i, c) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <p class="key">
      <span class="s-chip dec">D</span> decoded this cycle <span class="s-chip s-W">W</span> waiting
      <span class="s-chip s-W starts">W</span> starts this cycle <span class="s-chip s-E">E</span> executing
      <span class="s-chip s-F">F</span> finished <span class="s-chip s-ret">·</span> retired
      <span class="s-chip s-m">m</span> move_reg, never in the buffer
    </p>
    <div class="controls go">
      <button class="small" aria-label="back to cycle 0" :disabled="at === 0" @click="at = 0">↺</button>
      <button class="small" aria-label="one cycle back" :disabled="at === 0" @click="at -= 1">◀</button>
      <button class="small" :disabled="done" @click="at += 1">next cycle ▶</button>
      <button class="small" :disabled="done" @click="at = nextChange(run.frames, at)">next change ▶▶</button>
      <button class="small" :disabled="done" @click="at = last">to the end</button>
    </div>

    <div class="label">cycle {{ frame.cycle }}: units free {{ unitsLeft }}</div>
    <ol class="now-list" aria-live="polite">
      <li v-for="(ins, i) in block" :key="i">
        <span class="s-chip" :class="cellClass(i, { from: at })">{{ chip(i) }}</span>
        <span><b>{{ i + 1 }}</b> <code>{{ say(ins) }}</code>: {{ frame.cells[i].why }}</span>
      </li>
    </ol>
    <p v-if="done" class="sum">All retired at cycle {{ run.cycles }}: ϱ^Δ = max({{ run.cycles }} − {{ OVERHEAD }}, 1) = <b>{{ run.cost }}</b> gas.</p>
    <ul class="goals">
      <li v-for="g in GOALS" :key="g.id" :class="{ done: reached.has(g.id) }">{{ reached.has(g.id) ? "✓" : "○" }} {{ g.say }}</li>
    </ul>
  </div>
</template>

<style scoped>
.range { font-size: 14px; color: var(--vp-c-text-2); margin: 0 0 12px; line-height: 1.5; }
.tile-value { min-width: 4ch; }
.controls { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 8px; }
.controls button { min-height: 36px; min-width: 36px; }
.controls button:disabled { opacity: 0.5; cursor: default; }
.label { font-size: 13px; color: var(--vp-c-text-2); margin: 12px 0 4px; }
.lines { list-style: none; padding: 0; margin: 0 0 8px; display: grid; gap: 4px; }
.lines li {
  display: flex; flex-wrap: wrap; align-items: center; gap: 4px 8px; margin: 0; padding: 4px 6px;
  border: 1px solid var(--vp-c-divider); border-radius: 6px; background: var(--vp-c-bg-soft);
}
.n { font-family: var(--vp-font-family-mono); font-size: 12px; color: var(--vp-c-text-3); min-width: 2ch; }
.code { display: flex; flex-wrap: wrap; align-items: center; gap: 2px; font-family: var(--vp-font-family-mono); font-size: 14px; }
.code select {
  min-height: 32px; max-width: 100%; padding: 0 4px; border: 1px solid var(--vp-c-divider); border-radius: 4px;
  background: var(--vp-c-bg); color: var(--vp-c-text-1); font-family: var(--vp-font-family-mono); font-size: 14px;
}
.code .text { white-space: pre; }
.facts { font-size: 12px; color: var(--vp-c-text-2); margin-left: auto; }
.x { min-width: 32px; min-height: 32px; padding: 0; }
.strip { max-width: 100%; overflow-x: auto; border: 1px dashed var(--vp-c-divider); border-radius: 6px; }
.timeline { border-collapse: collapse; margin: 0; display: table; font-family: var(--vp-font-family-mono); font-size: 13px; }
.timeline tr { background: none; border: 0; }
.timeline th, .timeline td { border: 1px solid var(--vp-c-divider); padding: 2px 4px; text-align: center; min-width: 28px; height: 28px; white-space: nowrap; }
.timeline thead th { font-size: 11px; font-weight: 400; color: var(--vp-c-text-2); }
.timeline th.who { position: sticky; left: 0; z-index: 1; background: var(--vp-c-bg); text-align: left; font-weight: 400; font-size: 12px; }
.timeline thead th.now { color: var(--vp-c-brand-1); font-weight: 600; }
.timeline td.now { outline: 2px solid var(--vp-c-brand-1); outline-offset: -2px; }
.s-W { background: var(--bit-mark); }
.s-E { background: var(--bit-top); }
.s-F { background: var(--bit-low); }
.s-ret { color: var(--vp-c-text-3); }
.s-m { color: var(--vp-c-text-3); font-style: italic; }
.dec { background: var(--vp-c-bg-soft); font-weight: 600; }
.starts { box-shadow: inset -4px 0 0 var(--bit-top-line); }
.key { font-size: 12px; color: var(--vp-c-text-2); line-height: 2; margin: 6px 0 8px; }
.s-chip {
  display: inline-block; min-width: 26px; padding: 0 4px; margin-right: 2px; text-align: center;
  border: 1px solid var(--vp-c-divider); border-radius: 4px; font-family: var(--vp-font-family-mono); font-size: 12px;
}
.now-list { list-style: none; padding: 0; margin: 0; font-size: 14px; line-height: 1.5; }
.now-list li { display: flex; gap: 8px; align-items: baseline; margin: 0 0 4px; }
.now-list .s-chip { flex: none; }
.sum { font-size: 14px; margin: 8px 0 0; }
.goals { list-style: none; padding: 0; margin: 12px 0 0; font-size: 14px; color: var(--vp-c-text-2); }
.goals li.done { color: var(--vp-c-green-1); }
@media (max-width: 640px) {
  .facts { margin-left: 0; width: 100%; }
  .timeline tr { background: none; border: 0; }
.timeline th, .timeline td { min-width: 24px; padding: 2px 3px; }
}
</style>
