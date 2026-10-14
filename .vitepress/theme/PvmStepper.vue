<!-- Lesson 15.3: the PVM, one step at a time. Pick one of the lesson's programs and step it:
     ı moves on by 1 + skip(ı) or where a jump sends it, the register an instruction writes
     lights up, and ε says how each step ended, until halt or panic. The rules are
     pvm-stepper.ts's. -->
<script setup lang="ts">
import { computed, ref } from "vue";
import { assemble, explain, HALT_ADDRESS, listing, newMachine, PROGRAMS, say, stepOnce, trace, writes } from "./pvm-stepper.ts";
import type { Taken } from "./pvm-stepper.ts";

const GOALS = [
  { id: "skip", say: "watch ı skip over an instruction's arguments" },
  { id: "back", say: "watch a branch send ı back" },
  { id: "halt", say: "make the machine halt" },
  { id: "panic", say: "make it panic" },
];
const MOST_STEPS = 1000; // a guard: every program here stops long before

const chosen = ref(PROGRAMS[0].id);
const steps = ref<Taken[]>([]);
const reached = ref(new Set<string>());

const program = computed(() => PROGRAMS.find((p) => p.id === chosen.value) ?? PROGRAMS[0]);
const code = computed(() => assemble(program.value.instructions));
const lines = computed(() => listing(code.value));
const start = computed(() => newMachine(code.value, program.value.registers));
const last = computed(() => steps.value[steps.value.length - 1]);
const machine = computed(() => last.value?.after ?? start.value);
const stopped = computed(() => !!last.value && last.value.exit !== "continue");
/** The instruction to show as ı: the next to run, or the one that stopped the machine. */
const here = computed(() => (stopped.value ? last.value.ins.at : machine.value.pc));
const written = computed(() => (last.value ? writes(last.value.ins) : undefined));
const epsilon = computed(() => (!last.value ? "—" : last.value.exit === "continue" ? "▸" : last.value.exit));
const startsAtHalt = computed(() => program.value.registers[0] === HALT_ADDRESS);

const bytesOf = (at: number, next: number) => code.value.code.slice(at, next);
const hex = (b: number) => `0x${b.toString(16).padStart(2, "0")}`;

// a goal counts when the reader's own step brings it about
function record(s: Taken) {
  const mark = (id: string) => { reached.value = new Set([...reached.value, id]); };
  if (s.exit === "continue" && s.after.pc === s.ins.next && s.ins.skip > 0) mark("skip");
  if (s.exit === "continue" && s.after.pc < s.ins.at) mark("back");
  if (s.exit === "halt") mark("halt");
  if (s.exit === "panic") mark("panic");
}
function stepIt() {
  if (stopped.value) return;
  const s = stepOnce(machine.value, steps.value.length + 1);
  record(s);
  steps.value = [...steps.value, s];
}
function runIt() {
  if (stopped.value) return;
  const more = trace(machine.value, MOST_STEPS - steps.value.length).map((s, i) => ({ ...s, n: steps.value.length + 1 + i }));
  more.forEach(record);
  steps.value = [...steps.value, ...more];
}
function reset() { steps.value = []; }
function pick(id: string) {
  chosen.value = id;
  steps.value = [];
}
</script>

<template>
  <div class="widget pvm-stepper">
    <div class="readout" aria-live="polite">
      <div class="tile"><span class="tile-label">ı</span><span class="tile-value">{{ here }}</span></div>
      <div class="tile" :class="{ ok: last?.exit === 'halt', bad: last?.exit === 'panic' }">
        <span class="tile-label">ε</span><span class="tile-value">{{ epsilon }}</span>
      </div>
      <div class="tile"><span class="tile-label">steps</span><span class="tile-value">{{ steps.length }}</span></div>
      <div class="tile"><span class="tile-label">last written</span><span class="tile-value">{{ written === undefined ? "—" : `r${written}` }}</span></div>
    </div>
    <p class="range">
      The machine is ı, the instruction counter, and φ, thirteen 64-bit registers, r0 to r12. A step, Ψ₁, runs the
      instruction at ı. Unless it says otherwise, ı moves on to ı + 1 + skip(ı), and ε = ▸, carry on. A step can also
      end with <b>halt</b> or <b>panic</b>. Ψ steps until ε isn't ▸.
    </p>
    <div class="controls">
      <span class="label">program</span>
      <button v-for="p in PROGRAMS" :key="p.id" class="small" :class="{ chosen: p.id === chosen }" :aria-pressed="p.id === chosen" @click="pick(p.id)">
        {{ p.name }}
      </button>
    </div>
    <p class="note">{{ program.about }}</p>
    <div class="controls">
      <button class="small go" :disabled="stopped" @click="stepIt">step</button>
      <button class="small" :disabled="stopped" @click="runIt">run to the end</button>
      <button class="small" :disabled="!steps.length" @click="reset">reset</button>
    </div>
    <p class="line">
      <template v-if="last">Step {{ last.n }}, at {{ last.ins.at }}: <b>{{ say(last.ins) }}</b>. {{ explain(last) }}</template>
      <template v-else>ı = 0, every register 0{{ startsAtHalt ? " but r0" : "" }}. Press step to run the instruction at 0.</template>
    </p>

    <table class="code">
      <thead><tr><th><span class="sr-only">now</span></th><th>at</th><th>bytes</th><th>in words</th></tr></thead>
      <tbody>
        <tr v-for="ins in lines" :key="ins.at" :class="ins.at !== here ? '' : stopped ? last.exit : 'now'">
          <td class="mark">{{ ins.at !== here ? "" : stopped ? (last.exit === "halt" ? "■" : "✕") : "▶" }}</td>
          <td class="at">{{ ins.at }}</td>
          <td class="bytes">
            <b>{{ code.code[ins.at] }}</b><span v-for="(b, k) in bytesOf(ins.at + 1, ins.next)" :key="k" class="arg">, {{ hex(b) }}</span>
          </td>
          <td class="words">{{ say(ins) }}<span v-if="ins.skip" class="skip"> · skip {{ ins.skip }}</span></td>
        </tr>
      </tbody>
    </table>

    <div class="label">φ, the registers, in decimal</div>
    <div class="registers">
      <span
        v-for="(v, r) in machine.registers" :key="r" class="reg"
        :class="{ written: r === written, changed: !!last && v !== last.before.registers[r], long: String(v).length > 8 }"
      ><small>r{{ r }}</small>{{ v }}</span>
    </div>
    <p v-if="startsAtHalt" class="note">r0 starts at 2^32 − 2^16 = 4294901760, the halt address: jumping there halts the machine.</p>

    <ul class="goals">
      <li v-for="g in GOALS" :key="g.id" :class="{ done: reached.has(g.id) }">{{ reached.has(g.id) ? "✓" : "○" }} {{ g.say }}</li>
    </ul>
  </div>
</template>

<style scoped>
.range { font-size: 14px; color: var(--vp-c-text-2); margin: 0 0 12px; line-height: 1.5; }
.tile.ok { border-color: var(--bit-low-line); background: var(--bit-low); }
.tile.bad { border-color: var(--vp-c-danger-1); color: var(--vp-c-danger-1); }
.controls { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; margin-bottom: 8px; }
.controls button { min-height: 36px; }
.controls button.go { border-color: var(--vp-c-brand-1); color: var(--vp-c-brand-1); font-weight: 600; min-width: 72px; }
.controls button:disabled { opacity: 0.45; cursor: default; }
.label { font-size: 13px; color: var(--vp-c-text-2); min-width: 64px; }
.note { font-size: 13px; color: var(--vp-c-text-2); margin: 0 0 8px; line-height: 1.4; }
.line {
  margin: 8px 0; padding: 8px 12px; border-left: 3px solid var(--bit-mark-line); background: var(--bit-mark);
  font-size: 14px; line-height: 1.5; min-height: 4.5em;
}
.code { width: 100%; border-collapse: collapse; font-size: 13px; margin: 8px 0; display: table; }
.code th { text-align: left; font-weight: 500; color: var(--vp-c-text-2); }
.code th, .code td { padding: 3px 6px; border: 1px solid var(--vp-c-divider); }
.code td.mark { width: 1.5em; text-align: center; color: var(--vp-c-brand-1); }
.code td.at, .code td.bytes { font-family: var(--vp-font-family-mono); white-space: nowrap; }
.code td.at { text-align: right; }
.code .arg { color: var(--vp-c-text-2); }
.code .skip { color: var(--vp-c-text-3); font-size: 12px; }
.code tr.now td { background: var(--bit-top); }
.code tr.now td.mark { color: var(--bit-top-line); }
.code tr.halt td { background: var(--bit-low); }
.code tr.halt td.mark { color: var(--bit-low-line); }
.code tr.panic td.mark, .code tr.panic td.words { color: var(--vp-c-danger-1); }
.code tr.panic td { outline: 1px solid var(--vp-c-danger-1); outline-offset: -1px; }
.registers { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 4px; margin: 6px 0; }
.reg {
  display: flex; flex-direction: column; padding: 2px 6px; border: 1px solid var(--vp-c-divider); border-radius: 4px;
  font-family: var(--vp-font-family-mono); font-size: 14px; background: var(--vp-c-bg-soft); word-break: break-all;
}
.reg.long { grid-column: span 2; } /* r0's halt address, or a wrapped value: two cells wide */
.reg small { font-size: 10px; color: var(--vp-c-text-2); line-height: 1.3; }
.reg.written { border: 2px solid var(--bit-mark-line); background: var(--bit-mark); }
.reg.changed { font-weight: 700; }
.goals { list-style: none; padding: 0; margin: 12px 0 0; font-size: 14px; color: var(--vp-c-text-2); }
.goals li.done { color: var(--vp-c-green-1); }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
@media (max-width: 640px) {
  .widget.pvm-stepper { padding: 12px; }
  .code { font-size: 12px; }
  .code th, .code td { padding: 3px 4px; }
  .registers { grid-template-columns: repeat(4, minmax(0, 1fr)); }
  .reg { font-size: 12px; padding: 2px 4px; }
}
</style>
