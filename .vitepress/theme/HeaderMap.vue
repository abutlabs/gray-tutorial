<!-- Lesson 4.6: the two tiny header vectors, field by field in Appendix C's order. Switch
     headers to watch a maybe go from one byte 00 to 01 and its value; tap a field to light up
     its bytes and see its rule on its real value; tap a byte to find its field. The bytes are
     encoded in header-map.ts from the vectors' values, never pasted in. -->
<script setup lang="ts">
import { computed, ref } from "vue";
import { ownerOf, spaced } from "./codec-map.ts";
import type { Node } from "./codec-map.ts";
import { APPENDIX_C, cellsOf, chainOf, E, explain, goalsOf, HEADERS, nearest, nodesOf, ruleOf, shades, valueOf } from "./header-map.ts";

const GOALS = [
  { id: "missing", say: "find a field that's one byte because it's missing" },
  { id: "no-length", say: "find a list with no length in front" },
  { id: "order", say: "find the field §5 lists before the author index but Appendix C writes after it" },
  { id: "two", say: "find the 2-byte field" },
];
const MAPS = HEADERS.map((v) => ({ v, nodes: nodesOf(v), shades: shades(v.root) }));

const which = ref(1); // header_1 first: no epoch mark, so its 00 is there to find
const selected = ref("slot");
const tapped = ref<number | null>(null);
const opened = ref(new Set<number>());
const allOpen = ref(false);
const reached = ref(new Set<string>());

/** A part's bytes as offsets: "100" for one byte, "101–497" for a run. */
const rangeOf = (n: Node) => (n.end - n.start === 1 ? `${n.start}` : `${n.start}–${n.end - 1}`);

const map = computed(() => MAPS[which.value]);
const bytes = computed(() => map.value.v.bytes);
const total = computed(() => bytes.value.length);
const sel = computed<Node>(() => nearest(map.value.nodes, selected.value));
const line = computed(() => explain(sel.value, bytes.value));
const chain = computed(() => chainOf(map.value.v.root, sel.value.path));
const size = computed(() => sel.value.end - sel.value.start);
const rows = computed(() =>
  map.value.v.root.children.map((f, k) => ({ f, k, cells: cellsOf(map.value.v.root, f, (p) => allOpen.value || opened.value.has(p)) })),
);
const tappedSay = computed(() => {
  if (tapped.value === null) return "";
  const i = tapped.value, n = sel.value, k = i - n.start;
  const what = k < n.tag ? "its ¿x tag" : k < n.tag + n.prefix ? "its count" : `byte ${k + 1} of its ${n.end - n.start}`;
  return `byte ${i} = ${spaced([bytes.value[i]])}: ${what}.`;
});

const mark = (n: Node) => { reached.value = new Set([...reached.value, ...goalsOf(n)]); };
/** Goals tick on the reader's own taps and switches, never on the first selection. */
function choose(path: string, byte: number | null) {
  selected.value = path;
  tapped.value = byte;
  mark(sel.value);
}
const tapByte = (i: number) => choose(ownerOf(map.value.v.root, i)!, i);
function unfold(piece: number) {
  opened.value = new Set([...opened.value, piece]);
  choose(ownerOf(map.value.v.root, piece)!, null);
}
function pick(k: number) {
  if (k === which.value) return;
  which.value = k;
  opened.value = new Set();
  tapped.value = null;
  selected.value = sel.value.path; // the same field, or the nearest part this header has
  mark(sel.value);
}

const inSel = (i: number) => sel.value.start <= i && i < sel.value.end;
const inChain = (n: Node) => chain.value.includes(n);
const name = (n: Node) => n.path.replace(/^.*[.[]/, "").replace(/\]$/, "");
const subLabel = (n: Node) => (/\]$/.test(n.path) ? `[${name(n)}]` : name(n));
</script>

<template>
  <div class="widget header-map">
    <div class="readout" aria-live="polite">
      <div class="tile field"><span class="tile-label">field</span><span class="tile-value">{{ sel.path }}</span></div>
      <div class="tile"><span class="tile-label">its {{ size }} byte{{ size === 1 ? "" : "s" }}</span><span class="tile-value">{{ rangeOf(sel) }}</span></div>
      <div class="tile rule"><span class="tile-label">rule</span><span class="tile-value"><UnitText :text="ruleOf(sel)" /></span></div>
      <div class="tile"><span class="tile-label">whole header</span><span class="tile-value">{{ total }}</span></div>
    </div>
    <div class="controls" role="group" aria-label="which header">
      <button v-for="(m, k) in MAPS" :key="m.v.name" class="small" :class="{ chosen: k === which }" :aria-pressed="k === which" @click="pick(k)">
        {{ m.v.name }}: {{ m.v.has }}
      </button>
    </div>
    <p class="range">
      A header is its {{ APPENDIX_C.length }} fields in Appendix C's order, nothing between. The two marks are maybes (¿x):
      a <b class="k tag">tag</b> byte <code class="bytes">00</code> when there's nothing, or <code class="bytes">01</code> then the value. The tickets mark is exactly E = {{ E }}
      tickets with no count; the other lists start with their <b class="k count">count</b>. Tap a field, or a byte.
    </p>
    <p class="line">
      <span v-if="tappedSay" class="tapped"><UnitText :text="tappedSay" /></span>
      <UnitText :text="line" />
    </p>

    <ol class="fields" :aria-label="`${map.v.name}'s fields`">
      <li v-for="r in rows" :key="r.f.path" class="row" :class="{ here: inChain(r.f) }">
        <button class="small field-name" :class="{ chosen: sel === r.f }" :aria-pressed="sel === r.f" @click="choose(r.f.path, null)">
          <span class="n">{{ r.k + 1 }}</span> {{ r.f.path }} <span class="v"><UnitText :text="valueOf(r.f)" /></span>
          <span class="at">{{ rangeOf(r.f) }}</span>
        </button>
        <div class="strip">
          <template v-for="c in r.cells" :key="c.kind === 'byte' ? c.i : `f${c.start}`">
            <button v-if="c.kind === 'byte'" class="byte unit-byte" :class="[map.shades[c.i], { on: inSel(c.i), tap: tapped === c.i }]"
              :aria-label="`byte ${c.i}: ${spaced([bytes[c.i]])}`" :aria-pressed="inSel(c.i)" @click="tapByte(c.i)">{{ spaced([bytes[c.i]]) }}</button>
            <button v-else class="fold" :class="[map.shades[c.start], { on: inSel(c.start) }]"
              :aria-label="`show the ${c.end - c.start} bytes ${c.start} to ${c.end - 1}`" @click="unfold(c.piece)">+{{ c.end - c.start }}</button>
          </template>
        </div>
        <template v-if="inChain(r.f)">
          <div v-for="n in chain.filter((n) => n.children.length)" :key="n.path" class="parts" :aria-label="`${n.path}'s parts`">
            <button v-for="c in n.children" :key="c.path" class="small" :class="{ chosen: sel === c, open: inChain(c) }"
              :aria-pressed="sel === c" @click="choose(c.path, null)">{{ subLabel(c) }}</button>
          </div>
        </template>
      </li>
    </ol>
    <p class="all">
      <button class="small" :aria-pressed="allOpen" @click="allOpen = !allOpen">
        {{ allOpen ? "fold long values" : `show all ${total} bytes` }}
      </button>
      <span>A <b>+25</b> stands for that many bytes of a long value: tap it to show them.</span>
    </p>

    <ul class="goals">
      <li v-for="g in GOALS" :key="g.id" :class="{ done: reached.has(g.id) }">{{ reached.has(g.id) ? "✓" : "○" }} <UnitText :text="g.say" /></li>
    </ul>
  </div>
</template>

<style scoped>
.tile.field .tile-value { font-size: 14px; min-width: 24ch; max-width: 30ch; min-height: 2.6em; overflow-wrap: anywhere; }
.tile.rule .tile-value { font-size: 16px; min-width: 19ch; }
.tile .tile-value { min-width: 7ch; }
.controls { display: flex; flex-wrap: wrap; gap: 6px; margin: 4px 0 8px; }
.controls button.small { min-height: 32px; }
.range { font-size: 14px; color: var(--vp-c-text-2); margin: 0 0 8px; line-height: 1.5; }
.k { font-weight: 600; padding: 0 4px; border-radius: 3px; border: 1px solid; color: var(--vp-c-text-1); }
.k.tag { background: var(--bit-mark); border-color: var(--bit-mark-line); border-style: dashed; }
.k.count { background: var(--bit-mark); border-color: var(--bit-mark-line); }
.line { font-family: var(--vp-font-family-mono); font-size: 14px; margin: 8px 0 12px; line-height: 1.6; min-height: 6.4em; }
.tapped { display: block; color: var(--vp-c-text-2); }
.fields { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 8px; }
.row { padding: 4px 0 6px; border-bottom: 1px solid var(--vp-c-divider); }
.row.here { border-bottom-color: var(--vp-c-brand-1); }
.field-name { min-height: 32px; text-align: left; max-width: 100%; overflow-wrap: anywhere; margin-bottom: 4px; }
.field-name .n { color: var(--vp-c-text-3); }
.field-name .v, .field-name .at { color: var(--vp-c-text-2); }
.field-name .at { font-size: 12px; margin-left: 4px; }
button.small.chosen { background: var(--vp-c-bg-soft); font-weight: 600; }
.strip { display: flex; flex-wrap: wrap; gap: 2px; font-family: var(--vp-font-family-mono); font-size: 13px; }
.byte, .fold {
  min-width: 2.4em; height: 28px; padding: 0 2px; border: 1px solid; border-radius: 3px; font: inherit; color: var(--vp-c-text-1);
  opacity: 0.55; cursor: pointer;
}
.fold { min-width: 3.2em; border-style: dashed; font-style: italic; }
.top { background: var(--bit-top); border-color: var(--bit-top-line); }
.low { background: var(--bit-low); border-color: var(--bit-low-line); }
.count { background: var(--bit-mark); border-color: var(--bit-mark-line); }
/* both are structure, so amber (custom.css); a tag's border is dashed to tell it from a count */
.tag { background: var(--bit-mark); border-color: var(--bit-mark-line); border-style: dashed; }
.byte.on, .fold.on { opacity: 1; font-weight: 700; border-width: 2px; }
.byte.tap { outline: 2px solid var(--vp-c-brand-1); outline-offset: 1px; }
.parts { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px; padding-left: 12px; }
.parts button.small { min-height: 32px; min-width: 40px; font-size: 13px; }
.parts button.small.open { border-color: var(--vp-c-brand-1); }
.all { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 10px; margin: 10px 0 0; font-size: 13px; color: var(--vp-c-text-2); }
.all button.small { min-height: 32px; }
.goals { list-style: none; padding: 0; margin: 12px 0 0; font-size: 14px; color: var(--vp-c-text-2); }
.goals li.done { color: var(--vp-c-green-1); }
@media (max-width: 640px) {
  .widget.header-map { padding: 12px; }
  .byte, .fold { height: 32px; font-size: 14px; }
  .line { font-size: 13px; min-height: 8em; }
  .tile.field .tile-value { min-width: 20ch; }
}
</style>
