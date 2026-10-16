<!-- Lesson 17.6: R on two cores. Service 1 holds both at the round's start; set what the
     manager's run and the holder's run each left, and whether the holder set a queue: R's
     arguments and answer per core, and the merged χ′_A. Computed in merge-rule.ts. -->
<script setup lang="ts">
import { computed, ref } from "vue";
import { BEFORE, merge, TEST } from "./merge-rule.ts";

const manager = ref([...TEST.manager]);
const holder = ref([...TEST.holder]);
const queue = ref([...TEST.holderQueue]);
const rows = computed(() => merge({ manager: manager.value, holder: holder.value, holderQueue: queue.value }));
const set = (r: typeof manager, k: number, v: number) => { const n = [...r.value]; n[k] = v; r.value = n; };
const flip = (k: number) => { const n = [...queue.value]; n[k] = !n[k]; queue.value = n; };
const reset = () => { manager.value = [...TEST.manager]; holder.value = [...TEST.holder]; queue.value = [...TEST.holderQueue]; };
</script>

<template>
  <div class="widget merge-rule">
    <div class="readout" aria-live="polite">
      <div class="tile"><span class="tile-label">χ_A at the start</span><span class="tile-value">[{{ BEFORE.join(", ") }}]</span></div>
      <div class="tile"><span class="tile-label">χ′_A, merged</span><span class="tile-value">[{{ rows.map((r) => r.after).join(", ") }}]</span></div>
      <div class="tile"><span class="tile-label">new queues kept</span><span class="tile-value">{{ rows.filter((r) => r.queue).map((r) => `core ${r.core}`).join(", ") || "none" }}</span></div>
    </div>
    <p class="line">R(o, a, b) = b if a = o, otherwise a: o is the holder at the start, a what the manager's run (service 0) left, b what the holder's own run (service 1) left. The manager's change wins; if it changed nothing, the holder's own does.</p>
    <div class="cores">
      <section v-for="r in rows" :key="r.core" class="core">
        <p class="head"><b>core {{ r.core }}</b></p>
        <div class="controls"><span class="muted">manager left a =</span>
          <button v-for="v in [1, 5]" :key="v" class="small" :class="{ chosen: manager[r.core] === v }" @click="set(manager, r.core, v)">{{ v }}</button></div>
        <div class="controls"><span class="muted">holder left b =</span>
          <button v-for="v in [1, 7]" :key="v" class="small" :class="{ chosen: holder[r.core] === v }" @click="set(holder, r.core, v)">{{ v }}</button>
          <button class="small" :class="{ chosen: queue[r.core] }" @click="flip(r.core)">holder sets a queue</button></div>
        <p class="sum">R({{ r.o }}, {{ r.a }}, {{ r.b }}) = <b>{{ r.after }}</b>: {{ r.a === r.o ? "the manager left it alone, so the holder's choice" : "the manager changed it, so its choice" }}</p>
      </section>
    </div>
    <div class="controls"><button class="small" @click="reset">the test's runs</button></div>
  </div>
</template>

<style scoped>
.merge-rule .readout { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); }
.tile .tile-value { font-size: 18px; white-space: nowrap; }
.line { margin: 8px 0; font-size: 14px; line-height: 1.6; }
.cores { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 8px; margin-bottom: 6px; }
.core { padding: 8px; border: 1px solid var(--vp-c-divider); border-radius: 6px; background: var(--vp-c-bg-soft); }
.head { margin: 0 0 4px; }
.controls { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin: 0 0 6px; }
.controls button.small { min-height: 32px; }
.muted { font-size: 12px; color: var(--vp-c-text-2); }
.sum { margin: 4px 0 0; font-family: var(--vp-font-family-mono); font-size: 13px; }
</style>
