<!-- Lesson 19.5: β and β†. Before storage_light block 1, β's one block has a state root of
     zeros; the block's header names it. Check the block's report, anchored on that parent,
     against β or against β†. Computed in beta-dagger.ts. -->
<script setup lang="ts">
import { computed, ref } from "vue";
import { ANCHOR, anchorCheck, BETA, dagger, PARENT_STATE_ROOT } from "./beta-dagger.ts";

const useDagger = ref(false);
const history = computed(() => (useDagger.value ? dagger(BETA, PARENT_STATE_ROOT) : BETA));
const error = computed(() => anchorCheck(history.value));
const short = (h: string) => (/^0x0+$/.test(h) ? "0x0000… zeros" : `${h.slice(0, 18)}…`);
</script>

<template>
  <div class="widget beta-dagger">
    <div class="readout" aria-live="polite">
      <div class="tile"><span class="tile-label">checked against</span><span class="tile-value">{{ useDagger ? "β†" : "β" }}</span></div>
      <div class="tile" :class="{ bad: error }"><span class="tile-label">the report's anchor</span><span class="tile-value">{{ error ?? "accepted" }}</span></div>
    </div>
    <p class="line">
      <template v-if="!useDagger">β remembers the parent, but not its state root: nobody knew it until this block named it. The report says the parent left {{ short(ANCHOR.stateRoot) }}; β says zeros: bad_state_root.</template>
      <template v-else>β† is β with the newest root filled in from this block's header, parent_state_root. Now the anchor's root matches, and the report is accepted.</template>
    </p>
    <div class="controls">
      <button class="small" :class="{ chosen: !useDagger }" :aria-pressed="!useDagger" @click="useDagger = false">check against β</button>
      <button class="small" :class="{ chosen: useDagger }" :aria-pressed="useDagger" @click="useDagger = true">make β†, then check</button>
    </div>
    <div class="cols">
      <section class="col">
        <p class="head">{{ useDagger ? "β†" : "β" }}, the recent blocks</p>
        <p v-for="b in history" :key="b.header" class="mono">block {{ short(b.header) }} · root <span :class="{ zero: /^0x0+$/.test(b.stateRoot), filled: useDagger }">{{ short(b.stateRoot) }}</span></p>
      </section>
      <section class="col">
        <p class="head">block 1's header and its report</p>
        <p class="mono">parent_state_root {{ short(PARENT_STATE_ROOT) }}</p>
        <p class="mono">anchor {{ short(ANCHOR.header) }} · root {{ short(ANCHOR.stateRoot) }}</p>
      </section>
    </div>
  </div>
</template>

<style scoped>
.beta-dagger .readout { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); }
.tile .tile-value { font-size: 18px; white-space: nowrap; }
.tile.bad { border-color: var(--changed-line); background: var(--changed); }
.line { margin: 8px 0; font-size: 14px; line-height: 1.6; min-height: 4.8em; }
.controls { display: flex; flex-wrap: wrap; gap: 6px; margin: 0 0 6px; }
.controls button.small { min-height: 32px; }
.cols { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 8px; }
.col { padding: 8px; border: 1px solid var(--vp-c-divider); border-radius: 6px; background: var(--vp-c-bg-soft); }
.head { margin: 0 0 4px; font-size: 13px; font-weight: 600; }
.mono { margin: 2px 0; font-family: var(--vp-font-family-mono); font-size: 12px; overflow-wrap: anywhere; }
.zero { color: var(--changed-line); font-weight: 700; }
.filled { background: var(--bit-low); border-radius: 2px; padding: 0 2px; }
</style>
