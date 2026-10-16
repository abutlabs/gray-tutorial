<!-- Lesson 2.3: a Reader walking the bytes the Writer made. Tap fixed(2), natural() or
     bytes(4) and watch #at move: in the writer's order the three values come back; a
     natural first swallows three bytes as 491,538 and leaves #at mid-piece, and nothing
     complains. Everything is computed in reader-walk.ts. -->
<script setup lang="ts">
import { computed, ref } from "vue";
import { BYTES, inStep, OPS, PIECE_OF, PIECES, readAt, type Read } from "./reader-walk.ts";

const reads = ref<Read[]>([]);
const at = computed(() => reads.value.reduce((n, r) => n + r.length, 0));
const last = computed(() => reads.value.at(-1));
const done = computed(() => at.value >= BYTES.length);
const can = (op: (typeof OPS)[number]) => readAt(op, at.value) !== null;
const owner = (i: number) => reads.value.findIndex((r) => r.from <= i && i < r.from + r.length);
const hex = (b: number) => b.toString(16).padStart(2, "0");

function read(op: (typeof OPS)[number]) {
  const r = readAt(op, at.value);
  if (r) reads.value = [...reads.value, r];
}
const reset = () => { reads.value = []; };
</script>

<template>
  <div class="widget reader-walk">
    <div class="readout" aria-live="polite">
      <div class="tile"><span class="tile-label">#at</span><span class="tile-value">{{ at }}</span></div>
      <div class="tile wide"><span class="tile-label">last read</span><span class="tile-value">{{ last ? `r.${last.op} → ${last.value}` : "nothing yet" }}</span></div>
      <div class="tile"><span class="tile-label">bytes it took</span><span class="tile-value">{{ last ? last.length : "–" }}</span></div>
      <div class="tile" :class="{ wrong: last && !inStep(last) }"><span class="tile-label">in step with the writer</span><span class="tile-value">{{ last ? (inStep(last) ? "yes" : "no") : "–" }}</span></div>
    </div>
    <p class="line">
      <template v-if="!last">The Writer made eight bytes from three calls. Read them back with the same rules, in the same order, or in another and see what the Reader makes of them.</template>
      <template v-else-if="inStep(last)">A read starts at <code>#at</code>, takes the bytes its rule says, and moves <code>#at</code> past them. {{ done ? "Three values back, every byte used once." : "The next read starts where this one stopped." }}</template>
      <template v-else><span class="bug">Out of step.</span> The rule still read something: nothing in a byte says what it is, so the Reader took {{ last.length }} byte{{ last.length === 1 ? "" : "s" }} from {{ last.from }} and called them {{ last.value }}. Every read after starts in the wrong place.</template>
    </p>
    <div class="strip" aria-label="the eight bytes">
      <span v-for="(b, i) in BYTES" :key="i" class="cell unit-byte" :class="[`piece${PIECE_OF[i]}`, { read: owner(i) >= 0, last: last && owner(i) === reads.length - 1, cursor: i === at }]">
        <span class="off">{{ i }}</span>{{ hex(b) }}
      </span>
      <span v-if="done" class="cell end" aria-hidden="true"><span class="off">{{ BYTES.length }}</span>end</span>
    </div>
    <ol class="pieces" aria-label="what the Writer wrote">
      <li v-for="(p, k) in PIECES" :key="p.call" :class="`piece${k}`"><code>{{ p.call }}</code> → <code class="bytes">{{ p.bytes.map(hex).join(" ") }}</code></li>
    </ol>
    <div class="controls" role="group" aria-label="read">
      <button v-for="op in OPS" :key="op" class="small" :disabled="!can(op)" @click="read(op)">r.{{ op }}</button>
      <button class="small" :disabled="!reads.length" @click="reset">reset</button>
    </div>
    <ol v-if="reads.length" class="log" aria-label="the reads so far">
      <li v-for="(r, k) in reads" :key="k" :class="{ off: !inStep(r) }">#at {{ r.from }}: <code>r.{{ r.op }}</code> took {{ r.length }} byte{{ r.length === 1 ? "" : "s" }} → {{ r.value }}</li>
    </ol>
  </div>
</template>

<style scoped>
.tile .tile-value { min-width: 5ch; }
.tile.wide .tile-value { font-size: 16px; min-width: 20ch; }
/* a read that is out of step with the writer is a change nobody asked for: red (custom.css) */
.tile.wrong { background: var(--changed); border-color: var(--changed-line); }
.bug { color: var(--changed-line); font-weight: 600; }
.line { margin: 8px 0; font-size: 14px; line-height: 1.6; min-height: 4.8em; }
.strip { display: flex; flex-wrap: wrap; gap: 3px; margin: 4px 0 8px; font-family: var(--vp-font-family-mono); font-size: 14px; }
.cell { position: relative; min-width: 2.6em; padding: 14px 4px 4px; text-align: center; border: 1px solid var(--vp-c-divider); border-radius: 3px; opacity: 0.55; }
.cell .off { position: absolute; top: 1px; left: 0; right: 0; font-size: 10px; color: var(--vp-c-text-3); }
.cell.read { opacity: 1; }
.cell.last { font-weight: 700; border-width: 2px; }
.cell.cursor { box-shadow: inset 3px 0 0 var(--vp-c-brand-1); }
.cell.end { opacity: 0.55; border-style: dashed; }
.piece0 { background: var(--bit-top); border-color: var(--bit-top-line); }
.piece1 { background: var(--bit-low); border-color: var(--bit-low-line); }
.piece2 { background: var(--bit-mark); border-color: var(--bit-mark-line); }
.pieces { list-style: none; padding: 0; margin: 0 0 8px; font-size: 13px; line-height: 1.8; }
.pieces li { padding-left: 8px; border-left: 4px solid; }
.pieces li.piece0 { border-color: var(--bit-top-line); background: none; }
.pieces li.piece1 { border-color: var(--bit-low-line); background: none; }
.pieces li.piece2 { border-color: var(--bit-mark-line); background: none; }
.controls { display: flex; flex-wrap: wrap; gap: 6px; }
.controls button.small { min-height: 32px; font-family: var(--vp-font-family-mono); }
.log { margin: 10px 0 0; padding-left: 20px; font-size: 13px; line-height: 1.7; }
.log li.off { color: var(--changed-line); }
</style>
