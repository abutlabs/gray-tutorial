<!-- Lesson 17.13: the bless order, register by register and byte by byte. Tap a register or
     a group of bytes for what it is; change an assigner or the gas and the bytes redraw.
     Computed in bless-order.ts. -->
<script setup lang="ts">
import { computed, ref } from "vue";
import { assignerBytes, entryBytes, gasOf, hx, REGISTERS, TEST } from "./bless-order.ts";

const order = ref({ ...TEST, assign: [...TEST.assign], free: TEST.free.map((e) => [...e] as [number, number]) });
const picked = ref("the whole order");
const says = ref("Tap a register or a group of bytes.");
const regs = computed(() => REGISTERS(order.value));
const setAssign = (k: number, v: number) => { const a = [...order.value.assign]; a[k] = v; order.value = { ...order.value, assign: a }; };
const setGas = (g: number) => { order.value = { ...order.value, free: [[order.value.free[0][0], g]] }; };
</script>

<template>
  <div class="widget bless-order">
    <div class="readout" aria-live="polite">
      <div class="tile"><span class="tile-label">{{ picked }}</span><span class="tile-value small">{{ says }}</span></div>
    </div>
    <p class="line">The call sets every privilege at once: manager {{ order.manager }}, assigners [{{ order.assign.join(", ") }}], delegator {{ order.delegator }}, registrar {{ order.registrar }}, and χ_Z = {{ order.free.map(([s, g]) => `service ${s}: ${g.toLocaleString("en-US")} gas`).join(", ") }}. It costs 422 + 20 × {{ order.free.length }} = {{ gasOf(order) }}.</p>
    <div class="regs">
      <button v-for="r in regs" :key="r.r" class="small reg" @click="picked = `${r.r} = ${r.value}`; says = r.says">{{ r.r }} = {{ r.value }}</button>
    </div>
    <p class="row-says">at 0x20000: the assigners, 4 bytes each, little end first</p>
    <div class="bytes-row">
      <button v-for="(b, k) in assignerBytes(order)" :key="k" class="small grp" @click="picked = `core ${k}'s assigner`; says = `service ${order.assign[k]}: ${b.map(hx).join(' ')}`">{{ b.map(hx).join(" ") }}</button>
    </div>
    <p class="row-says">at 0x20010: the always-accumulate entries, a 4-byte id then 8 bytes of gas</p>
    <div class="bytes-row">
      <template v-for="(e, k) in entryBytes(order)" :key="k">
        <button class="small grp" @click="picked = 'an entry\'s id'; says = `service ${order.free[k][0]}: ${e.slice(0, 4).map(hx).join(' ')}`">{{ e.slice(0, 4).map(hx).join(" ") }}</button>
        <button class="small grp" @click="picked = 'its gas'; says = `${order.free[k][1].toLocaleString('en-US')} = 0x${order.free[k][1].toString(16)}: ${e.slice(4).map(hx).join(' ')}`">{{ e.slice(4).map(hx).join(" ") }}</button>
      </template>
    </div>
    <div class="controls">
      <span class="muted">core 0's assigner</span>
      <button v-for="v in [2, 9]" :key="v" class="small" :class="{ chosen: order.assign[0] === v }" @click="setAssign(0, v)">{{ v }}</button>
      <span class="muted">service 6's gas</span>
      <button v-for="g in [1000, 100_000]" :key="g" class="small" :class="{ chosen: order.free[0][1] === g }" @click="setGas(g)">{{ g.toLocaleString("en-US") }}</button>
    </div>
  </div>
</template>

<style scoped>
.bless-order .readout { display: grid; grid-template-columns: minmax(0, 1fr); }
.bless-order .tile { min-width: 0; }
.tile .tile-value.small { font-size: 15px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.line { margin: 8px 0; font-size: 14px; line-height: 1.6; min-height: 4.8em; }
.regs, .bytes-row { display: flex; flex-wrap: wrap; gap: 4px; }
.reg, .grp { min-height: 32px; font-family: var(--vp-font-family-mono); font-size: 12px; }
.row-says { margin: 8px 0 4px; font-size: 12px; color: var(--vp-c-text-2); }
.controls { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin: 8px 0 0; }
.controls button.small { min-height: 32px; }
.muted { font-size: 12px; color: var(--vp-c-text-2); }
</style>
