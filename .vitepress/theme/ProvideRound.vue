<!-- Lesson 17.12: provide, then the end of the round. Service 1729 waits for the 8 bytes
     "preimage"; service 0 never asked. Pick a provider and a receiver and provide: φ₇ and
     that run's provisions. Then end the round: what's delivered, what's dropped, and 1729's
     request becoming [44]. Computed in provide-round.ts. -->
<script setup lang="ts">
import { ref } from "vue";
import type { Answer, Run } from "./provide-round.ts";
import { endOfRound, GAS, HASH, provide, SLOT, START_REQUESTS } from "./provide-round.ts";

const requests = ref({ ...START_REQUESTS });
const runs = ref<Run[]>([{ giver: 0, provided: [] }, { giver: 5, provided: [] }]);
const giver = ref(0);
const to = ref<number | "self">(1729);
const last = ref<Answer | null>(null);
const ended = ref<{ stored: number[]; dropped: number } | null>(null);
function go() {
  const k = runs.value.findIndex((r) => r.giver === giver.value);
  const r = provide(requests.value, runs.value[k], to.value);
  runs.value = runs.value.map((x, i) => (i === k ? r.run : x));
  last.value = r.answer;
}
function end() { const r = endOfRound(requests.value, runs.value); requests.value = r.requests; ended.value = r; runs.value = runs.value.map((x) => ({ ...x, provided: [] })); }
const reset = () => { requests.value = { ...START_REQUESTS }; runs.value = [{ giver: 0, provided: [] }, { giver: 5, provided: [] }]; last.value = null; ended.value = null; };
const req = (h: number[] | null) => (h === null ? "never asked" : `[${h.join(", ")}]`);
const TARGETS: { v: number | "self"; label: string }[] = [{ v: 1729, label: "1729" }, { v: "self", label: "itself (2^64 − 1)" }, { v: 7, label: "7" }];
</script>

<template>
  <div class="widget provide-round">
    <div class="readout" aria-live="polite">
      <div class="tile" :class="{ bad: last && last !== 'OK' }"><span class="tile-label">φ₇</span><span class="tile-value">{{ last ?? "—" }}</span></div>
      <div class="tile"><span class="tile-label">1729's request</span><span class="tile-value">{{ req(requests[1729]) }}</span></div>
      <div class="tile"><span class="tile-label">gas a call</span><span class="tile-value">{{ GAS.toLocaleString("en-US") }}</span></div>
    </div>
    <p class="line">
      <template v-if="ended">End of the round: {{ ended.stored.length ? `delivered to ${ended.stored.join(", ")}, request [${SLOT}], the bytes "preimage" stored` : "nothing delivered" }}{{ ended.dropped ? `; ${ended.dropped} provision${ended.dropped === 1 ? "" : "s"} dropped quietly, the request no longer []` : "" }}.</template>
      <template v-else-if="last === 'OK'">Recorded in the run's provisions, nothing delivered yet: every run starts from the same accounts, so delivery waits for the round's end.</template>
      <template v-else-if="last === 'HUH'">HUH: that service isn't waiting for these bytes, or this run gave them already.</template>
      <template v-else-if="last === 'WHO'">WHO: there's no service 7.</template>
      <template v-else>The 8 bytes "preimage", hash {{ HASH.slice(0, 12) }}…: 1729 asked for them and waits, []. Provide, then end the round.</template>
    </p>
    <div class="controls">
      <span class="muted">from</span>
      <button v-for="g in [0, 5]" :key="g" class="small" :class="{ chosen: giver === g }" @click="giver = g">service {{ g }}'s run</button>
      <span class="muted">to</span>
      <button v-for="t in TARGETS" :key="String(t.v)" class="small" :class="{ chosen: to === t.v }" @click="to = t.v">{{ t.label }}</button>
    </div>
    <div class="controls">
      <button class="small go" @click="go">provide ▶</button>
      <button class="small go" @click="end">end of round ▶</button>
      <button class="small" @click="reset">start again</button>
    </div>
    <p v-for="r in runs" :key="r.giver" class="mono">service {{ r.giver }}'s 𝐩: {{ r.provided.length ? r.provided.map((s) => `"preimage" for ${s}`).join(", ") : "empty" }}</p>
  </div>
</template>

<style scoped>
.provide-round .readout { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); }
.tile .tile-value { font-size: 17px; white-space: nowrap; }
.tile.bad { border-color: var(--changed-line); background: var(--changed); }
.line { margin: 8px 0; font-size: 14px; line-height: 1.6; min-height: 4.8em; }
.controls { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin: 0 0 6px; }
.controls button.small { min-height: 32px; }
.go { border-color: var(--vp-c-brand-1); color: var(--vp-c-brand-1); font-weight: 600; }
.muted { font-size: 12px; color: var(--vp-c-text-2); }
.mono { margin: 2px 0; font-family: var(--vp-font-family-mono); font-size: 13px; }
</style>
