<!-- Lesson 15.2: the napkin program's bytes with their bitmask. Tap an instruction for its
     opcode, layout, register nibbles, skip, the immediate's bytes and sign-extension, or
     the offset read signed and added to ı; edit the immediate or the offset byte and watch
     the value and the target move. Computed in decode-instruction.ts. -->
<script setup lang="ts">
import { computed, ref } from "vue";
import { asSigned, CODE, decode, STARTS, startsInstruction } from "./decode-instruction.ts";

const code = ref([...CODE]);
const at = ref(0);
const d = computed(() => decode(code.value, at.value));
const hex = (b: number) => b.toString(16).padStart(2, "0");
const setByte = (i: number, v: number) => { const c = [...code.value]; c[i] = v; code.value = c; };
const owner = (i: number) => { let o = -1; for (const s of STARTS) if (s <= i) o = s; return o; };
</script>

<template>
  <div class="widget decode-instruction">
    <div class="readout" aria-live="polite">
      <div class="tile"><span class="tile-label">ı = {{ d.at }}: opcode {{ d.opcode }}</span><span class="tile-value">{{ d.name }}</span></div>
      <div class="tile"><span class="tile-label">layout · skip(ı)</span><span class="tile-value">{{ d.layout }} · {{ d.skip }}</span></div>
      <div class="tile" v-if="d.immediate"><span class="tile-label">immediate, {{ d.immediate.bytes.length }} byte{{ d.immediate.bytes.length === 1 ? "" : "s" }}</span><span class="tile-value">{{ asSigned(d.immediate.extended) }}</span></div>
      <div class="tile" v-else-if="d.offset" :class="{ wrong: !d.offset.lands }"><span class="tile-label">offset {{ d.offset.signed }} → target</span><span class="tile-value">{{ d.offset.target }}</span></div>
      <div class="tile" v-else><span class="tile-label">registers</span><span class="tile-value">{{ d.registers.length ? d.registers.map((r) => `r${r}`).join(", ") : "none" }}</span></div>
      <div class="tile"><span class="tile-label">next instruction at</span><span class="tile-value">{{ d.next }}</span></div>
    </div>
    <p class="line">
      <template v-if="d.nibbles">Byte ı + 1 = <code class="bytes">{{ hex(code[d.at + 1]) }}</code>: low nibble r{{ d.nibbles.low }}, high nibble r{{ d.nibbles.high }}{{ d.layout === "regRegReg" ? `; byte ı + 2 names the register written, r${d.registers[2]}: r${d.registers[2]} = r${d.registers[0]} + r${d.registers[1]}` : "" }}.</template>
      <template v-if="d.immediate"> The bitmask says the next instruction starts at {{ d.next }}, so skip(ı) = {{ d.skip }} leaves {{ d.immediate.bytes.length }} byte{{ d.immediate.bytes.length === 1 ? "" : "s" }} for the immediate, <code class="bytes">{{ d.immediate.bytes.map(hex).join(" ") }}</code>: {{ d.immediate.raw }} unsigned, sign-extended to 0x{{ d.immediate.extended.toString(16) }} = {{ asSigned(d.immediate.extended) }}.</template>
      <template v-if="d.offset"> The offset <code class="bytes">{{ d.offset.bytes.map(hex).join(" ") }}</code> is read signed, {{ d.offset.signed }}, and added to ı: {{ d.at }} + ({{ d.offset.signed }}) = {{ d.offset.target }}, which {{ d.offset.lands ? "starts an instruction" : "doesn't start an instruction: a bad target" }}.</template>
      <template v-if="d.layout === 'none'"> No arguments: one byte, and the next instruction follows.</template>
    </p>
    <div class="strip" role="group" aria-label="the napkin program's bytes">
      <button v-for="(b, i) in code" :key="i" class="cell unit-byte" :class="{ start: startsInstruction(i), on: owner(i) === d.at }" :aria-pressed="owner(i) === d.at" @click="at = owner(i)"><span class="off">{{ i }}</span>{{ hex(b) }}</button>
    </div>
    <div class="controls">
      <span class="muted">edit:</span>
      <button class="small" :class="{ chosen: code[2] === 0x7f }" @click="setByte(2, code[2] === 0xff ? 0x7f : 0xff); at = 0">load_imm's byte: {{ hex(code[2]) }}</button>
      <button class="small" :class="{ chosen: code[7] !== 0xfd }" @click="setByte(7, code[7] === 0xfd ? 0xfe : 0xfd); at = 6">jump's offset: {{ hex(code[7]) }}</button>
      <button class="small" :disabled="code.every((b, i) => b === CODE[i])" @click="code = [...CODE]">reset</button>
    </div>
    <p class="legend">Instruction starts, from the bitmask <code class="bytes">49 01</code>: bytes {{ STARTS.join(", ") }}. An instruction ends where the next begins.</p>
  </div>
</template>

<style scoped>
.tile .tile-value { min-width: 5ch; }
/* a target that misses an instruction start: red (custom.css) */
.tile.wrong { background: var(--changed); border-color: var(--changed-line); }
.line { margin: 8px 0; font-size: 14px; line-height: 1.6; min-height: 6.4em; }
.strip { display: flex; flex-wrap: wrap; gap: 3px; margin: 0 0 8px; font-family: var(--vp-font-family-mono); font-size: 14px; }
.cell { position: relative; min-width: 2.6em; padding: 14px 4px 4px; text-align: center; border: 1px solid var(--vp-c-divider); border-radius: 3px; background: var(--vp-c-bg-soft); font: inherit; color: var(--vp-c-text-1); cursor: pointer; opacity: 0.7; }
.cell .off { position: absolute; top: 1px; left: 0; right: 0; font-size: 10px; color: var(--vp-c-text-3); }
/* an opcode byte is structure: amber; the bytes after it are its arguments */
.cell.start { background: var(--bit-mark); border-color: var(--bit-mark-line); }
.cell.on { opacity: 1; border-width: 2px; }
.controls { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
.controls button.small { min-height: 32px; font-family: var(--vp-font-family-mono); }
.muted { font-size: 12px; color: var(--vp-c-text-2); }
.legend { margin: 8px 0 0; font-size: 12px; color: var(--vp-c-text-2); }
</style>
