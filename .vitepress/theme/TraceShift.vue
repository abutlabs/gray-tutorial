<!-- Lesson 2.7: move export_count to any place in WorkItem's field list and watch the decode
     trace of the real vector recompute. The lines that read the wrong bytes turn red; the
     first field whose bytes line up again is pointed out, and a field that runs out of
     bytes stops the trace. Everything is computed in trace-shift.ts. -->
<script setup lang="ts">
import { computed, ref } from "vue";
import { BYTES, compare, HOME, MOVED, NAMES, orderWith } from "./trace-shift.ts";

const at = ref(HOME);
const result = computed(() => compare(at.value));
const order = computed(() => orderWith(at.value));
const short = (hex: string) => (hex.length <= 20 ? hex : `${hex.slice(0, 10)}…${hex.slice(-4)}`);
const move = (by: number) => { at.value = Math.min(NAMES.length - 1, Math.max(0, at.value + by)); };
</script>

<template>
  <div class="widget trace-shift">
    <div class="readout" aria-live="polite">
      <div class="tile"><span class="tile-label">{{ MOVED }} is field</span><span class="tile-value">{{ at + 1 }} of {{ NAMES.length }}</span></div>
      <div class="tile" :class="{ wrong: result.wrong }"><span class="tile-label">lines reading wrong bytes</span><span class="tile-value">{{ result.wrong }}</span></div>
      <div class="tile wide"><span class="tile-label">back in step at</span><span class="tile-value">{{ result.wrong === 0 ? "every line" : result.backAt ? `${result.backAt.path}, byte ${result.backAt.from}` : "never" }}</span></div>
      <div class="tile"><span class="tile-label">bytes covered</span><span class="tile-value">{{ result.lines.at(-1)?.to ?? 0 }} of {{ BYTES.length }}</span></div>
    </div>
    <p class="line">
      <template v-if="result.wrong === 0">The codec's own order: every field reads its own bytes, and the trace covers all {{ BYTES.length }}, once, in order.</template>
      <template v-else-if="result.ranOut"><span class="bug">The trace ran out of bytes</span> at <code>{{ result.ranOut }}</code>: a length read from the wrong place asked for more than the file has. Nothing after it can be read at all.</template>
      <template v-else>The decoder reads on from where the last field stopped. From the first wrong line to <code>{{ result.backAt!.path }}</code> the bytes are misread; there the moved widths add up again, and every field after is right.</template>
    </p>
    <div class="controls" role="group" :aria-label="`move ${MOVED}`">
      <button class="small" :disabled="at === 0" @click="move(-1)">◀ move up</button>
      <button class="small" :disabled="at === NAMES.length - 1" @click="move(1)">move down ▶</button>
      <button class="small" :disabled="at === HOME" @click="at = HOME">put it back</button>
    </div>
    <ol class="order" aria-label="the fields, in the order the codec reads them">
      <li v-for="(n, k) in order" :key="n" :class="{ moved: n === MOVED, home: n === MOVED && at === HOME }"><span class="k">{{ k + 1 }}</span>{{ n }}</li>
    </ol>
    <table class="trace">
      <thead><tr><th class="n">bytes</th><th>field</th><th>read</th></tr></thead>
      <tbody>
        <tr v-for="l in result.lines" :key="`${l.path}@${l.from}`" :class="{ changed: l.changed }">
          <td class="n">{{ l.from }}..{{ l.to }}</td><td><code>{{ l.path }}</code></td><td><code class="bytes" :title="l.hex">{{ short(l.hex) }}</code></td>
        </tr>
        <tr v-if="result.ranOut" class="changed"><td class="n">{{ result.lines.at(-1)?.to ?? 0 }}..</td><td><code>{{ result.ranOut }}</code></td><td><em>ran out of bytes</em></td></tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.tile .tile-value { min-width: 5ch; }
.tile.wide .tile-value { font-size: 16px; min-width: 20ch; }
/* a line that read the wrong bytes is a change nobody asked for: red (custom.css) */
.tile.wrong { background: var(--changed); border-color: var(--changed-line); }
.bug { color: var(--changed-line); font-weight: 600; }
.line { margin: 8px 0; font-size: 14px; line-height: 1.6; min-height: 4.8em; }
.controls { display: flex; flex-wrap: wrap; gap: 6px; margin: 0 0 8px; }
.controls button.small { min-height: 32px; }
.order { display: flex; flex-wrap: wrap; gap: 4px; list-style: none; padding: 0; margin: 0 0 10px; font-family: var(--vp-font-family-mono); font-size: 13px; }
.order li { padding: 4px 8px; border: 1px solid var(--vp-c-divider); border-radius: 999px; background: var(--vp-c-bg-soft); }
.order li .k { color: var(--vp-c-text-3); margin-right: 4px; }
.order li.moved { border-color: var(--changed-line); background: var(--changed); font-weight: 700; }
.order li.home { border-color: var(--vp-c-brand-1); background: var(--vp-c-brand-soft); }
.trace { margin: 0; font-family: var(--vp-font-family-mono); font-size: 12px; }
.trace th, .trace td { padding: 2px 8px; }
.trace td.n, .trace th.n { text-align: right; white-space: nowrap; }
.trace tr.changed td { background: var(--changed); }
@media (max-width: 640px) {
  .trace th, .trace td { padding: 2px 4px; }
  .trace { font-size: 11px; }
}
</style>
