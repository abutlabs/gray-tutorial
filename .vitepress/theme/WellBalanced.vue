<!-- Lesson 17.11: M_B, item by item. Add or remove items, the test's single bytes 1, 2, 3,
     …: the tree redraws, each inner hash under "node", and the root with real Keccak.
     Computed in well-balanced.ts. -->
<script setup lang="ts">
import { computed, ref } from "vue";
import { hex, treeOf, VECTOR_ROOT, wellBalancedRoot } from "./well-balanced.ts";
import TreeNode from "./WellBalancedNode.vue";

const n = ref(3);
const items = computed(() => Array.from({ length: n.value }, (_, k) => [k + 1]));
const root = computed(() => wellBalancedRoot(items.value));
const tree = computed(() => treeOf(items.value));
const why = computed(() => (n.value === 0 ? "No items: the root is 32 zero bytes." : n.value === 1 ? "One item alone is hashed, so the root is always a hash: keccak(01)." : `${n.value} items split as ${Math.ceil(n.value / 2)} and ${Math.floor(n.value / 2)}, each half rooted, the two hashed under "node". A pair is joined as it is, not hashed first.`));
</script>

<template>
  <div class="widget well-balanced">
    <div class="readout" aria-live="polite">
      <div class="tile"><span class="tile-label">items</span><span class="tile-value">{{ n }}</span></div>
      <div class="tile wide"><span class="tile-label">M_B, the root</span><span class="tile-value hash">{{ hex(root).slice(0, 18) }}…</span></div>
    </div>
    <p class="line">{{ why }}</p>
    <div class="controls">
      <button v-for="k in 6" :key="k" class="small" :class="{ chosen: n === k - 1 }" :aria-pressed="n === k - 1" @click="n = k - 1">{{ k - 1 }} item{{ k === 2 ? "" : "s" }}</button>
    </div>
    <p v-if="n > 1" class="key">Each "node" box is keccak("node" ⌢ its left ⌢ its right); a byte on its own is an item, as it is.</p>
    <div class="tree"><TreeNode v-if="n > 1" :tree="tree" /><p v-else class="muted">{{ n === 1 ? "keccak(01)" : "32 zero bytes" }}</p></div>
    <p class="note">The vector's block has one output, service 1's: ℰ₄(1) ⌢ its 32-byte yield, 36 bytes. One item, so the root is its Keccak hash: {{ VECTOR_ROOT.slice(0, 18) }}…, the vector's.</p>
  </div>
</template>

<style scoped>
.tile .tile-value { min-width: 3ch; }
.tile.wide .tile-value { font-size: 15px; min-width: 19ch; }
.line { margin: 8px 0; font-size: 14px; line-height: 1.6; min-height: 3.2em; }
.controls { display: flex; flex-wrap: wrap; gap: 6px; margin: 0 0 6px; }
.controls button.small { min-height: 32px; }
.tree { margin: 8px 0; overflow-x: auto; }
.key { margin: 4px 0; font-size: 12px; color: var(--vp-c-text-2); }
.muted { color: var(--vp-c-text-2); font-family: var(--vp-font-family-mono); font-size: 13px; }
.note { margin: 8px 0 0; font-size: 13px; color: var(--vp-c-text-2); line-height: 1.5; }
</style>
