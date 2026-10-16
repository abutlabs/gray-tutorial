<!-- Lesson 15.9: one row of the cost table. Pick an instruction and its registers (and, for
     a branch, what sits at either end): š and ř, whether it writes a register it reads,
     and the row, cycles, decode slots and units. Computed in cost-row.ts. -->
<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type { Landing, Name } from "./cost-row.ts";
import { INSTRUCTIONS, rowOf, unitsOf } from "./cost-row.ts";

const name = ref<Name>("add_64");
const regs = ref([0, 1, 2]);
const next = ref<Landing>("fallthrough");
const target = ref<Landing>("fallthrough");
const ins = computed(() => INSTRUCTIONS.find((i) => i.name === name.value)!);
watch(name, () => { regs.value = [0, 1, 2]; });
const row = computed(() => rowOf(name.value, regs.value.slice(0, ins.value.regs.length), next.value, target.value));
const setReg = (k: number, r: number) => { const n = [...regs.value]; n[k] = r; regs.value = n; };
const list = (rs: number[]) => (rs.length ? rs.map((r) => `r${r}`).join(", ") : "none");
const why = computed(() => {
  const n = name.value;
  if (n === "add_64" || n === "mul_32") return row.value.overlap ? "It writes a register it reads, so 𝔓 picks the smaller slot count: no copy needed first." : "It writes a register it doesn't read, so 𝔓 picks the bigger slot count: a copy first.";
  if (n === "shlo_l_64") return row.value.sameDA ? "D is the same register as A, so 𝔓_S picks 2 slots." : "D isn't A, so 𝔓_S picks 3 slots.";
  if (n === "branch_eq") return row.value.cost.cycles === 1 ? "One way starts with trap or unlikely: a CPU would guess right, so 𝔟 is 1." : "Both ways start with ordinary code: a CPU could guess wrong, so 𝔟 is 20.";
  if (n === "load_ind_u64" || n === "store_ind_u64") return "Memory is slow: every load or store is 𝔪 = 25 cycles.";
  if (n === "move_reg") return "0 cycles: the CPU just relabels a register.";
  if (n === "div_u_64") return "Dividing is slow: 60 cycles, and the divide unit.";
  if (n === "cmov_iz") return "A cmov reads the register it writes: it may keep it.";
  return "ecalli reads and writes no registers, and costs 100.";
});
const LANDINGS: Landing[] = ["fallthrough", "trap", "unlikely"];
</script>

<template>
  <div class="widget cost-row">
    <div class="readout" aria-live="polite">
      <div class="tile"><span class="tile-label">č, cycles</span><span class="tile-value">{{ row.cost.cycles }}</span></div>
      <div class="tile"><span class="tile-label">ď, decode slots</span><span class="tile-value">{{ row.cost.slots }}</span></div>
      <div class="tile wide"><span class="tile-label">x̌, units</span><span class="tile-value small">{{ unitsOf(row.cost.units) }}</span></div>
      <div class="tile wide"><span class="tile-label">š reads · ř writes</span><span class="tile-value small">{{ list(row.reads) }} · {{ list(row.writes) }}</span></div>
    </div>
    <p class="line"><b>{{ name }}</b>: {{ ins.says }}. {{ why }}</p>
    <div class="controls">
      <select v-model="name" aria-label="the instruction"><option v-for="i in INSTRUCTIONS" :key="i.name" :value="i.name">{{ i.name }}</option></select>
      <label v-for="(letter, k) in ins.regs" :key="letter" class="reg">φ_{{ letter }}
        <select :value="regs[k]" :aria-label="`register ${letter}`" @change="setReg(k, Number(($event.target as HTMLSelectElement).value))"><option v-for="r in 4" :key="r" :value="r - 1">r{{ r - 1 }}</option></select>
      </label>
    </div>
    <div v-if="name === 'branch_eq'" class="controls">
      <span class="muted">the next instruction starts with</span>
      <button v-for="l in LANDINGS" :key="`n${l}`" class="small" :class="{ chosen: next === l }" @click="next = l">{{ l }}</button>
    </div>
    <div v-if="name === 'branch_eq'" class="controls">
      <span class="muted">the target starts with</span>
      <button v-for="l in LANDINGS" :key="`t${l}`" class="small" :class="{ chosen: target === l }" @click="target = l">{{ l }}</button>
    </div>
  </div>
</template>

<style scoped>
/* fixed columns, nothing wraps: the readout keeps one height whatever is picked */
.cost-row .readout { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); }
.tile .tile-value { white-space: nowrap; }
.tile.wide .tile-value.small { font-size: 15px; }
.line { margin: 8px 0; font-size: 14px; line-height: 1.6; min-height: 4.8em; }
.controls { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin: 0 0 6px; }
.controls button.small { min-height: 32px; }
.controls select { min-height: 32px; border: 1px solid var(--vp-c-divider); border-radius: 4px; background: var(--vp-c-bg); color: var(--vp-c-text-1); font-family: var(--vp-font-family-mono); padding: 0 4px; }
.reg { display: inline-flex; align-items: center; gap: 4px; font-size: 13px; color: var(--vp-c-text-2); font-family: var(--vp-font-family-mono); }
.muted { font-size: 12px; color: var(--vp-c-text-2); }
</style>
