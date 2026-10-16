<!-- One node of lesson 17.11's tree (WellBalanced.vue): a leaf shows its item as it is; an
     inner node shows its hash under "node", over its two halves. -->
<script setup lang="ts">
import type { Tree } from "./well-balanced.ts";
import { hex } from "./well-balanced.ts";

defineProps<{ tree: Tree }>();
</script>

<template>
  <div class="tnode">
    <template v-if="tree.kind === 'node'">
      <p class="hash">node {{ hex(tree.hash).slice(0, 8) }}…</p>
      <div class="halves"><WellBalancedNode :tree="tree.left" /><WellBalancedNode :tree="tree.right" /></div>
    </template>
    <p v-else-if="tree.kind === 'leaf'" class="leaf">{{ hex(tree.items[0]).slice(2) }}</p>
  </div>
</template>

<style scoped>
.tnode { display: flex; flex-direction: column; align-items: center; gap: 4px; min-width: 0; flex: 1 1 0; }
.hash { margin: 0; padding: 3px 6px; border: 1px solid var(--vp-c-brand-1); border-radius: 4px; background: var(--vp-c-brand-soft); font-family: var(--vp-font-family-mono); font-size: 11px; text-align: center; overflow-wrap: anywhere; }
.halves { display: flex; gap: 6px; width: 100%; }
.leaf { margin: 0; padding: 3px 8px; border: 1px solid var(--vp-c-divider); border-radius: 4px; background: var(--bit-top); font-family: var(--vp-font-family-mono); font-size: 13px; }
</style>
