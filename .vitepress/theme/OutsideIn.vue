<!-- Lesson 8.4: Z, outside in. Tap a slot of the next epoch to see which winner seals it
     and that ticket's real id, or tap a ticket to find its slot; below, a five-item list
     whose odd middle goes in once. Computed in outside-in.ts. -->
<script setup lang="ts">
import { computed, ref } from "vue";
import { E, FIVE, outsideIn, rankOf, slotOf, WINNERS } from "./outside-in.ts";

const slot = ref(3);
const rank = computed(() => rankOf(slot.value));
const seated = outsideIn(WINNERS.map((_, i) => i));
</script>

<template>
  <div class="widget outside-in">
    <div class="readout" aria-live="polite">
      <div class="tile"><span class="tile-label">slot of the next epoch</span><span class="tile-value">{{ slot }}</span></div>
      <div class="tile"><span class="tile-label">takes ticket</span><span class="tile-value">t{{ rank }}</span></div>
      <div class="tile wide"><span class="tile-label">its id</span><span class="tile-value hash">{{ WINNERS[rank] }}</span></div>
      <div class="tile"><span class="tile-label">from the</span><span class="tile-value">{{ slot % 2 === 0 ? "front" : "back" }}</span></div>
    </div>
    <p class="line">
      {{ slot % 2 === 0 ? `An even slot takes ⌊${slot}/2⌋ = ${rank} from the front: the ${rank === 0 ? "best" : `${rank + 1}th best`} ticket.` : `An odd slot takes E − 1 − ⌊${slot}/2⌋ = ${rank} from the back: the ${rank === E - 1 ? "worst of the winners" : `${E - rank}th worst`}.` }}
      Lower ids are better: t0 starts <code class="hash">{{ WINNERS[0] }}</code>, t11 <code class="hash">{{ WINNERS[E - 1] }}</code>.
    </p>
    <p class="row-says">slots of the next epoch, and the ticket each takes</p>
    <div class="row" role="group" aria-label="the slots">
      <button v-for="s in E" :key="s" class="seat" :class="{ on: s - 1 === slot }" :aria-pressed="s - 1 === slot" @click="slot = s - 1">
        <span class="s">slot {{ s - 1 }}</span><span class="t">t{{ seated[s - 1] }}</span>
      </button>
    </div>
    <p class="row-says">the winners by rank, best first</p>
    <div class="row" role="group" aria-label="the tickets">
      <button v-for="r in E" :key="r" class="seat ticket" :class="{ on: r - 1 === rank }" :aria-pressed="r - 1 === rank" @click="slot = slotOf(r - 1)">
        <span class="s">t{{ r - 1 }}</span><span class="t">slot {{ slotOf(r - 1) }}</span>
      </button>
    </div>
    <p class="legend">Five items go {{ FIVE.join(", ") }} → {{ outsideIn(FIVE).join(", ") }}: the odd middle, {{ FIVE[2] }}, goes in once.</p>
  </div>
</template>

<style scoped>
.tile .tile-value { min-width: 4ch; }
.tile.wide .tile-value { min-width: 13ch; }
.tile .tile-value.hash { font-size: 16px; }
.line { margin: 8px 0; font-size: 14px; line-height: 1.6; min-height: 4.8em; }
.row-says { margin: 6px 0 4px; font-size: 12px; color: var(--vp-c-text-2); }
.row { display: flex; flex-wrap: wrap; gap: 4px; }
.seat { display: flex; flex-direction: column; min-width: 3.6em; min-height: 40px; padding: 3px 6px; border: 1px solid var(--vp-c-divider); border-radius: 4px; background: var(--vp-c-bg-soft); font-family: var(--vp-font-family-mono); font-size: 12px; color: var(--vp-c-text-1); cursor: pointer; }
.seat .t { color: var(--vp-c-text-2); }
.seat.on { border: 2px solid var(--vp-c-brand-1); background: var(--vp-c-brand-soft); font-weight: 700; }
.seat.ticket { background: var(--bit-low); border-color: var(--bit-low-line); }
.seat.ticket.on { border-color: var(--vp-c-brand-1); }
.legend { margin: 10px 0 0; font-size: 13px; color: var(--vp-c-text-2); }
</style>
