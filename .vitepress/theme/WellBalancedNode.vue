<!-- One node of an M_B tree (17.11's WellBalanced.vue, 3.3's ShardJourney.vue): a leaf shows
     its item as it is, or `label`'s name for it; an inner node shows its hash under "node",
     over its two halves. `mark` gives a node a class: 3.3 lights one validator's proof. -->
<script setup lang="ts">
import type { Tree } from "./well-balanced.ts";
import { hex } from "./well-balanced.ts";

defineProps<{ tree: Tree; label?: (t: Tree) => string | undefined; mark?: (t: Tree) => string | undefined }>();
</script>

<template>
  <div class="tnode">
    <template v-if="tree.kind === 'node'">
      <p class="hash" :class="mark?.(tree)">node {{ hex(tree.hash).slice(2, 6) }}…</p>
      <div class="halves"><WellBalancedNode :tree="tree.left" :label="label" :mark="mark" /><WellBalancedNode :tree="tree.right" :label="label" :mark="mark" /></div>
    </template>
    <p v-else-if="tree.kind === 'leaf'" class="leaf" :class="mark?.(tree)">{{ label?.(tree) ?? hex(tree.items[0]).slice(2) }}</p>
  </div>
</template>

<style scoped>
.tnode { display: flex; flex-direction: column; align-items: center; gap: 4px; min-width: 0; flex: 1 1 0; }
.hash { margin: 0; padding: 3px 6px; border: 1px solid var(--vp-c-brand-1); border-radius: 4px; background: var(--vp-c-brand-soft); font-family: var(--vp-font-family-mono); font-size: 11px; text-align: center; overflow-wrap: anywhere; }
.halves { display: flex; gap: 6px; width: 100%; }
.leaf { margin: 0; padding: 3px 8px; border: 1px solid var(--vp-c-divider); border-radius: 4px; background: var(--bit-top); font-family: var(--vp-font-family-mono); font-size: 13px; }
.path { outline: 2px solid var(--vp-c-brand-1); font-weight: 700; }
.proof { border-style: dashed; border-color: var(--bit-mark-line); background: var(--bit-mark); }
</style>
