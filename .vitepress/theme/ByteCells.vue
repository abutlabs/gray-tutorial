<!-- Groups of bits in a row, each bit coloured by its role (the marker, x's top bits, its
     low bits) with a note under the group; boxed, each group is one byte. -->
<script setup lang="ts">
import type { Role } from "./compact.ts";

defineProps<{ groups: { bits: string; roles: Role[]; note: string }[]; boxed?: boolean }>();
</script>

<template>
  <div class="byte-cells">
    <div v-for="(g, n) in groups" :key="n" class="group">
      <div class="cells" :class="{ boxed }">
        <span v-for="(bit, i) in g.bits" :key="i" class="cell" :class="g.roles[i]">{{ bit }}</span>
      </div>
      <div class="note">{{ g.note }}</div>
    </div>
  </div>
</template>

<style scoped>
.byte-cells { display: flex; gap: 12px; flex-wrap: wrap; margin: 4px 0 8px; }
.cells { display: flex; }
.cells.boxed { outline: 2px solid var(--vp-c-text-1); border-radius: 3px; }
.cell {
  width: 20px; text-align: center; font-family: var(--vp-font-family-mono); font-size: 14px;
  line-height: 24px; border: 1px solid; margin-right: -1px;
}
.cell.mark { background: var(--bit-mark); border-color: var(--bit-mark-line); }
.cell.top { background: var(--bit-top); border-color: var(--bit-top-line); }
.cell.low { background: var(--bit-low); border-color: var(--bit-low-line); }
.note { font-size: 12px; color: var(--vp-c-text-2); margin-top: 4px; font-family: var(--vp-font-family-mono); }
</style>
