<!-- Lesson 3.3's big picture: a bundle's six shards on tiny, one per validator, under the
     erasure root that the report carries. Tap a validator to change what it does (holds its
     shard, is offline, or says it holds it without holding it) and to see its shard checked
     against the root. The readout counts the yeses, whether the report is available, and
     whether the real shards rebuild it. Computed in shard-journey.ts. -->
<script setup lang="ts">
import { computed, ref } from "vue";
import type { Status } from "./shard-journey.ts";
import { ASSURE, checks, climb, enough, FULL, leafName, marksFor, NEED, outcome, proof, ROOT, says, SCENES, SHARDS, short, STATUSES, TREE, V } from "./shard-journey.ts";
import { originalShards } from "./shards.ts";
import TreeNode from "./WellBalancedNode.vue";

const statuses = ref<Status[]>([...SCENES[0].statuses]);
const picked = ref(2);
const result = computed(() => outcome(statuses.value));
const marks = computed(() => marksFor(picked.value));
const mark = (t: Parameters<typeof leafName>[0]) => marks.value.get(t);
const steps = computed(() => climb(picked.value));
const sides = computed(() => proof(picked.value));
const ok = computed(() => checks(picked.value, SHARDS[picked.value]));

function tap(i: number) {
  if (picked.value === i) {
    const next = [...statuses.value];
    next[i] = STATUSES[(STATUSES.indexOf(next[i]) + 1) % STATUSES.length];
    statuses.value = next;
  }
  picked.value = i;
}
const scene = (s: Status[]) => statuses.value.every((x, i) => x === s[i]);
const WORDS: Record<Status, string> = { holds: "holds", offline: "offline", lies: "lies" };
const fmt = (n: number) => n.toLocaleString("en-US");
</script>

<template>
  <div class="widget shard-journey">
    <div class="readout" aria-live="polite">
      <div class="tile"><span class="tile-label">say they hold it</span><span class="tile-value">{{ result.said }} of {{ V }}</span></div>
      <div class="tile" :class="result.available ? 'ok' : 'no'"><span class="tile-label">available (needs {{ ASSURE }})</span><span class="tile-value">{{ result.available ? "yes" : "not yet" }}</span></div>
      <div class="tile"><span class="tile-label">really hold it</span><span class="tile-value">{{ result.holders.length }}</span></div>
      <div class="tile" :class="result.rebuilt ? 'ok' : 'no'"><span class="tile-label">rebuilt (needs {{ NEED }})</span><span class="tile-value">{{ result.rebuilt ? `"${result.rebuilt}"` : "can't" }}</span></div>
    </div>
    <p class="line">{{ says(result) }}</p>
    <div class="controls">
      <button v-for="s in SCENES" :key="s.says" class="small" :class="{ chosen: scene(s.statuses) }" :aria-pressed="scene(s.statuses)" @click="statuses = [...s.statuses]">{{ s.says }}</button>
    </div>
    <p class="key">The report carries one hash for all six shards, the erasure root (node {{ short(ROOT) }}… at the top). Tap a validator to see its check (its path up is outlined, the hashes it's handed are dashed); tap it again to change what it does: hold its shard, go offline, or lie (say yes, hold nothing).</p>
    <div class="tree"><TreeNode :tree="TREE" :label="leafName" :mark="mark" /></div>
    <div class="validators" role="group" aria-label="the six validators">
      <button v-for="(st, i) in statuses" :key="i" class="validator" :class="[st, { picked: picked === i }]" :aria-pressed="picked === i" @click="tap(i)">
        <span class="v-name">v{{ i }}</span>
        <span class="v-shard">{{ st === "lies" ? "·" : SHARDS[i] }}</span>
        <span class="v-status">{{ WORDS[st] }}</span>
      </button>
    </div>
    <p class="check">
      When v{{ picked }} got its shard, {{ SHARDS[picked] }}, it checked it: the shard hashes to {{ short(steps[0]) }}…;
      <template v-for="(v, j) in steps.slice(1)" :key="j">with {{ short(sides[j].sibling) }}… on its {{ sides[j].side === "left" ? "right" : "left" }}, "node" makes {{ short(v) }}…{{ j < steps.length - 2 ? "; " : "" }}</template>:
      {{ ok ? "the root, so the guarantors sent v" + picked + " the right shard." : "not the root." }}
      A wrong shard would hash to something else and miss it.
    </p>
    <p class="note">On full it's the same with {{ fmt(FULL) }} validators: {{ fmt(enough(FULL)) }} must say yes, and any {{ fmt(originalShards(FULL)) }} rebuild.</p>
  </div>
</template>

<style scoped>
.shard-journey .readout { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); }
.tile { min-width: 0; }
.tile .tile-value { white-space: nowrap; }
.tile.ok { border-color: var(--bit-low-line); background: var(--bit-low); }
.tile.no { border-color: var(--bit-mark-line); background: var(--bit-mark); }
.line { margin: 8px 0; font-size: 14px; line-height: 1.6; min-height: 3.2em; }
.controls { display: flex; flex-wrap: wrap; gap: 6px; margin: 0 0 6px; }
.controls button.small { min-height: 32px; }
.key { margin: 4px 0; font-size: 12px; color: var(--vp-c-text-2); }
.tree { margin: 8px 0 4px; }
.validators { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 4px; }
.validator { display: flex; flex-direction: column; align-items: center; gap: 2px; min-height: 32px; min-width: 0; padding: 4px 2px; border: 1px solid var(--vp-c-divider); border-radius: 4px; background: var(--vp-c-bg); color: var(--vp-c-text-1); cursor: pointer; }
.validator.picked { border: 2px solid var(--vp-c-brand-1); }
.validator.offline { color: var(--vp-c-text-3); background: var(--vp-c-bg-soft); }
.validator.lies { border-style: dashed; background: var(--bit-mark); }
.v-name { font-family: var(--vp-font-family-mono); font-size: 12px; font-weight: 700; }
.v-shard { font-family: var(--vp-font-family-mono); font-size: 15px; }
.v-status { font-size: 11px; line-height: 1.2; text-align: center; color: var(--vp-c-text-2); }
.check { margin: 8px 0 0; font-size: 13px; line-height: 1.6; min-height: 4.8em; }
/* narrow: room for the longest line and check, so nothing below them jumps */
@media (max-width: 640px) { .line { min-height: 6.4em; } .check { min-height: 12.8em; } }
.note { margin: 6px 0 0; font-size: 13px; color: var(--vp-c-text-2); line-height: 1.5; }
</style>
