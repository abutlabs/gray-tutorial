<!-- Lesson 7.2: F one pick at a time. Step through a deck: the items left, number mod l,
     the pick, and the last item sliding into the gap; the picks so far build the result.
     Switch to splice, the obvious way to close the gap, and see a fair shuffle that isn't
     JAM's. Computed in shuffle-steps.ts. -->
<script setup lang="ts">
import { computed, ref } from "vue";
import { DECKS, picks, shuffled } from "./shuffle-steps.ts";

const deck = ref(DECKS[0]);
const splice = ref(false);
const at = ref(0); // picks made so far
const all = computed(() => picks(deck.value, splice.value));
const done = computed(() => at.value >= all.value.length);
const pick = computed(() => all.value[Math.min(at.value, all.value.length - 1)]);
const result = computed(() => shuffled(deck.value, splice.value));
const jam = computed(() => shuffled(deck.value, false));
const choose = (d: typeof DECKS[number]) => { deck.value = d; at.value = 0; };
const fmt = (n: number) => n.toLocaleString("en-US");
</script>

<template>
  <div class="widget shuffle-steps">
    <div class="readout" aria-live="polite">
      <div class="tile"><span class="tile-label">pick</span><span class="tile-value">{{ Math.min(at + 1, all.length) }} of {{ all.length }}</span></div>
      <div class="tile wide"><span class="tile-label">number mod l = index</span><span class="tile-value">{{ fmt(pick.number) }} mod {{ pick.l }} = {{ pick.index }}</span></div>
      <div class="tile"><span class="tile-label">picked</span><span class="tile-value">{{ pick.picked }}</span></div>
      <div class="tile"><span class="tile-label">fills the gap</span><span class="tile-value">{{ splice ? "nothing: closed up" : pick.filler ?? "nothing: it was last" }}</span></div>
    </div>
    <p class="line">
      <template v-if="!done">Of the {{ pick.l }} left, take index {{ pick.index }}: {{ pick.picked }}. {{ splice ? "Then close the gap, shifting everything after it." : pick.filler ? `Then the last item, ${pick.filler}, fills the gap, and the last place is dropped.` : "It was the last item, so the last place is simply dropped." }}</template>
      <template v-else>Done: {{ result.join(", ") }}. <template v-if="splice"><span class="bug">Fair, but not JAM's:</span> JAM deals {{ jam.join(", ") }}. A shuffle every node must agree on agrees to the last detail.</template><template v-else>The same numbers deal the same hand on every node.</template></template>
    </p>
    <div class="controls">
      <button v-for="d in DECKS" :key="d.name" class="small" :class="{ chosen: deck === d }" :aria-pressed="deck === d" @click="choose(d)">{{ d.name }}</button>
    </div>
    <div class="controls">
      <button class="small" :disabled="at === 0" @click="at = 0">reset</button>
      <button class="small" :disabled="at === 0" @click="at--">◀ back</button>
      <button class="small go" :disabled="done" @click="at++">pick ▶</button>
      <button class="small" :class="{ chosen: splice }" :aria-pressed="splice" @click="splice = !splice; at = 0">{{ splice ? "closing the gap with splice" : "JAM: the last item fills the gap" }}</button>
    </div>
    <p class="row-says">left, before this pick</p>
    <div class="row" aria-label="the items left">
      <span v-for="(x, i) in pick.left" :key="i" class="item" :class="{ picked: i === pick.index && !done, filler: !done && !splice && pick.filler !== null && i === pick.l - 1 }">{{ x }}</span>
      <span v-if="done" class="muted">none</span>
    </div>
    <p class="row-says">picks so far</p>
    <div class="row" aria-label="the picks so far">
      <span v-for="(x, i) in result.slice(0, at)" :key="i" class="item out">{{ x }}</span>
      <span v-if="at === 0" class="muted">none yet</span>
    </div>
  </div>
</template>

<style scoped>
.tile .tile-value { min-width: 5ch; }
.tile.wide .tile-value { font-size: 16px; min-width: 20ch; }
.bug { color: var(--changed-line); font-weight: 600; }
.line { margin: 8px 0; font-size: 14px; line-height: 1.6; min-height: 4.8em; }
.controls { display: flex; flex-wrap: wrap; gap: 6px; margin: 0 0 8px; }
.controls button.small { min-height: 32px; }
.go { border-color: var(--vp-c-brand-1); color: var(--vp-c-brand-1); font-weight: 600; }
.row-says { margin: 6px 0 4px; font-size: 12px; color: var(--vp-c-text-2); }
.row { display: flex; flex-wrap: wrap; gap: 4px; min-height: 36px; font-family: var(--vp-font-family-mono); font-size: 14px; }
.item { min-width: 2.2em; padding: 6px 8px; text-align: center; border: 1px solid var(--vp-c-divider); border-radius: 4px; background: var(--vp-c-bg-soft); }
.item.picked { border: 2px solid var(--vp-c-brand-1); background: var(--vp-c-brand-soft); font-weight: 700; }
/* the last item, about to move into the gap: amber, like anything that tells what happens next */
.item.filler { background: var(--bit-mark); border-color: var(--bit-mark-line); }
.item.out { background: var(--bit-low); border-color: var(--bit-low-line); }
.muted { color: var(--vp-c-text-3); font-size: 13px; align-self: center; }
</style>
