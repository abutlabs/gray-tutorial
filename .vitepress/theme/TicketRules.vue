<!-- Lesson 8.7: a block's tickets against the rules. Start from a run's three real tickets;
     reorder them, change an attempt, move the block's phase, mark one as already held, or
     add a fourth, and the readout names the first rule broken, in the order the code
     checks them, or shows the tickets entering and what the lottery holds after.
     Computed in ticket-rules.ts. -->
<script setup lang="ts">
import { computed, ref } from "vue";
import { E, ENTERING, EXTRA_ID, K, merged, N, OUT_OF_ORDER, RULES, ticketError, Y, type Ticket } from "./ticket-rules.ts";

const phase = ref(1);
const tickets = ref<Ticket[]>(ENTERING.map((t) => ({ ...t })));
const heldBefore = ref<string[]>([]);
const result = computed(() => ticketError(phase.value, tickets.value));
const after = computed(() => merged(heldBefore.value, tickets.value));
const load = (from: Ticket[]) => { tickets.value = from.map((t) => ({ ...t })); heldBefore.value = []; phase.value = 1; };
const move = (i: number, by: number) => { const j = i + by; if (j < 0 || j >= tickets.value.length) return; const t = [...tickets.value]; [t[i], t[j]] = [t[j], t[i]]; tickets.value = t; };
const add = () => { if (!tickets.value.some((t) => t.id === EXTRA_ID)) tickets.value = [...tickets.value, { attempt: 0, id: EXTRA_ID }]; };
const drop = (i: number) => { tickets.value = tickets.value.filter((_, k) => k !== i); };
const toggleHeld = (t: Ticket) => { t.held = !t.held; tickets.value = [...tickets.value]; };
</script>

<template>
  <div class="widget ticket-rules">
    <div class="readout" aria-live="polite">
      <div class="tile"><span class="tile-label">block's phase m′</span><span class="tile-value">{{ phase }}</span></div>
      <div class="tile"><span class="tile-label">tickets brought</span><span class="tile-value">{{ tickets.length }}</span></div>
      <div class="tile wide" :class="{ wrong: result }"><span class="tile-label">verdict</span><span class="tile-value">{{ result ? result.error : "they enter" }}</span></div>
      <div class="tile"><span class="tile-label">lottery holds after</span><span class="tile-value">{{ result ? "–" : `${after.length} of ${E}` }}</span></div>
    </div>
    <p class="line">
      <template v-if="result">Rule {{ result.rule }} broken: {{ RULES[result.rule] }}. The block is refused whole, and the lottery stays as it was.</template>
      <template v-else>Every rule holds: {{ tickets.length }} ticket{{ tickets.length === 1 ? "" : "s" }} join{{ tickets.length === 1 ? "s" : "" }} the lottery, which keeps the {{ E }} lowest ids{{ heldBefore.length + tickets.length > E ? ", the worst dropping out" : "" }}. Best now: <code class="hash">{{ after[0] }}</code>.</template>
    </p>
    <div class="controls">
      <button class="small" @click="load(ENTERING)">no-mark-2's tickets</button>
      <button class="small" @click="load(OUT_OF_ORDER)">no-mark-4's tickets</button>
      <button class="small" :disabled="tickets.some((t) => t.id === EXTRA_ID)" @click="add">add a 4th (K = {{ K }})</button>
      <button class="small" :class="{ chosen: heldBefore.length === E }" :aria-pressed="heldBefore.length === E" @click="heldBefore = heldBefore.length ? [] : Array.from({ length: E }, (_, i) => `0xf${i.toString(16)}00…`)">{{ heldBefore.length ? "lottery empty" : "lottery full of worse ids" }}</button>
    </div>
    <div class="controls">
      <span class="muted">phase m′</span>
      <button v-for="m in E" :key="m" class="small phase" :class="{ chosen: phase === m - 1, closed: m - 1 >= Y }" :aria-pressed="phase === m - 1" @click="phase = m - 1">{{ m - 1 }}</button>
    </div>
    <ol class="tickets" aria-label="the block's tickets, in its order">
      <li v-for="(t, i) in tickets" :key="t.id" class="ticket">
        <span class="n">{{ i + 1 }}</span>
        <code class="hash">{{ t.id }}</code>
        <label class="attempt">attempt <select v-model.number="t.attempt" aria-label="attempt"><option v-for="a in 5" :key="a" :value="a - 1">{{ a - 1 }}</option></select></label>
        <button class="small" :disabled="i === 0" aria-label="move up" @click="move(i, -1)">▲</button>
        <button class="small" :disabled="i === tickets.length - 1" aria-label="move down" @click="move(i, 1)">▼</button>
        <button class="small" :class="{ chosen: t.held }" :aria-pressed="!!t.held" @click="toggleHeld(t)">{{ t.held ? "already in γ_A" : "new" }}</button>
        <button class="small" aria-label="drop this ticket" @click="drop(i)">✕</button>
      </li>
    </ol>
    <p class="legend">Attempts run 0 to n − 1 = {{ N - 1 }} on tiny; the lottery is open for phases 0 to {{ Y - 1 }}.</p>
  </div>
</template>

<style scoped>
.tile .tile-value { min-width: 4ch; }
.tile.wide .tile-value { min-width: 16ch; font-size: 18px; }
/* a refusal is a change nobody asked for: red (custom.css) */
.tile.wrong { background: var(--changed); border-color: var(--changed-line); }
.line { margin: 8px 0; font-size: 14px; line-height: 1.6; min-height: 4.8em; }
.controls { display: flex; flex-wrap: wrap; align-items: center; gap: 4px; margin: 0 0 8px; }
.controls button.small { min-height: 32px; }
.phase { min-width: 2.4em; font-family: var(--vp-font-family-mono); }
.phase.closed { opacity: 0.6; }
.muted { font-size: 12px; color: var(--vp-c-text-2); margin-right: 4px; }
.tickets { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 4px; }
.ticket { display: flex; flex-wrap: wrap; align-items: center; gap: 4px; padding: 4px 6px; border: 1px solid var(--vp-c-divider); border-radius: 4px; background: var(--vp-c-bg-soft); font-size: 13px; }
.ticket .n { color: var(--vp-c-text-3); min-width: 1.2em; }
.ticket button.small { min-height: 32px; min-width: 32px; }
.attempt { display: flex; align-items: center; gap: 4px; font-size: 12px; color: var(--vp-c-text-2); }
.attempt select { min-height: 32px; border: 1px solid var(--vp-c-divider); border-radius: 4px; background: var(--vp-c-bg); color: var(--vp-c-text-1); font-family: var(--vp-font-family-mono); }
.legend { margin: 8px 0 0; font-size: 12px; color: var(--vp-c-text-2); }
</style>
