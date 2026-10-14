<!-- Lesson 2.6: the tiny work_item vector, its JSON beside its 236 bytes. Tap a field to light
     up its bytes and see its rule on its real value; tap a byte to find its field. The bytes
     are encoded in vector-map.ts from the JSON's values, never pasted in. -->
<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { bytesAfterArrows } from "./units.ts";
import { crossesRow, DUMP_FIELD, explain, flatten, isNumber, ITEM, ownerOf, ROW, rowsOf, ruleOf, shades, spaced } from "./vector-map.ts";
import type { Node } from "./vector-map.ts";

const BYTES = ITEM.bytes;
const TOTAL = BYTES.length;
const NODES = new Map(flatten(ITEM.root).map((n) => [n.path, n]));
const SHADES = shades(ITEM.root);
const DUMP = NODES.get(DUMP_FIELD)!.end; // the lesson's hexdump shows exactly up to here
const node = (path: string): Node => NODES.get(path)!;
const GOALS = [
  { id: "backwards", say: "find a field that's written backwards" },
  { id: "length", say: "find a length the bytes carry" },
  { id: "dump", say: "tap the last byte the lesson's dump shows: its field runs across two rows of 16" },
  { id: "third", say: "find the index of the third import segment" },
];

/** The JSON's rows: a field (or a list's count), or a list's item with its fields. */
const ROWS = ITEM.root.children.flatMap((f) =>
  f.children.length ? [{ head: f, items: [] as Node[] }, ...f.children.map((item) => ({ head: item, items: item.children }))] : [{ head: f, items: [] as Node[] }],
);

const selected = ref("service");
const tapped = ref<number | null>(null);
const reached = ref(new Set<string>());
const perRow = ref(ROW);

const sel = computed(() => node(selected.value));
const line = computed(() => explain(sel.value, BYTES));
const rows = computed(() => Array.from({ length: Math.ceil(TOTAL / perRow.value) }, (_, r) => r * perRow.value));
const across = computed(() => {
  const n = sel.value;
  if (n.children.length || !crossesRow(n)) return "";
  const [a, b] = rowsOf(n);
  return `In the hex dump's rows of 16, it starts on row ${a} and ends on row ${b}.`;
});
const tappedSay = computed(() => {
  if (tapped.value === null) return "";
  const i = tapped.value;
  const n = sel.value;
  const k = i - n.start;
  const what = k < n.prefix ? (n.children.length ? "its count" : "its length") : `byte ${k + 1} of its ${n.end - n.start}`;
  return `byte ${i} = ${spaced([BYTES[i]])}: ${what}.`;
});

const mark = (id: string) => { reached.value = new Set([...reached.value, id]); };
/** Goals tick on the reader's own taps, never on the default selection. */
function choose(path: string, byte: number | null) {
  selected.value = path;
  tapped.value = byte;
  const n = node(path);
  if (isNumber(n.type)) mark("backwards");
  if (n.prefix > 0) mark("length");
  if (byte === DUMP - 1) mark("dump");
  if (path === "import_segments[2].index") mark("third");
}
const tapByte = (i: number) => choose(ownerOf(ITEM.root, i)!, i);

const label = (n: Node) => n.path.replace(/^.*\./, "");
const valueOf = (n: Node): string => {
  if (n.children.length && Array.isArray(n.json)) return `${n.children.length} items`;
  if (typeof n.json === "string") return n.json.length > 14 ? `${n.json.slice(0, 6)}…${n.json.slice(-4)}` : n.json;
  return String(n.json);
};
const shadeOf = (n: Node) => SHADES[n.start];
const inSel = (i: number) => sel.value.start <= i && i < sel.value.end;
const isLength = (i: number) => SHADES[i] === "mark";

let mq: MediaQueryList | null = null;
const fit = () => { perRow.value = mq?.matches ? ROW / 2 : ROW; };
onMounted(() => {
  mq = window.matchMedia("(max-width: 640px)");
  fit();
  mq.addEventListener("change", fit);
});
onUnmounted(() => mq?.removeEventListener("change", fit));
</script>

<template>
  <div class="widget vector-map">
    <div class="readout" aria-live="polite">
      <div class="tile field"><span class="tile-label">field</span><span class="tile-value">{{ sel.path }}</span></div>
      <div class="tile"><span class="tile-label">its bytes</span><span class="tile-value">{{ sel.start }}–{{ sel.end - 1 }}</span></div>
      <div class="tile rule"><span class="tile-label">rule</span><span class="tile-value">{{ ruleOf(sel.type) }}</span></div>
      <div class="tile"><span class="tile-label">so far</span><span class="tile-value">{{ sel.end }} / {{ TOTAL }}</span></div>
    </div>
    <p class="range">
      The .bin is the JSON's values in the JSON's order, each written by its rule from lessons 2.1 to 2.5. No names,
      and a length in front only of what can vary: the payload and the two lists (amber). Tap a field, or a byte.
    </p>
    <p class="line">
      <span v-if="tappedSay" class="tapped">{{ tappedSay }}</span>
      <template v-for="(part, n) in bytesAfterArrows(line)" :key="n"><code v-if="part.bytes" class="bytes">{{ part.text }}</code><template v-else>{{ part.text }}</template></template>
      <span v-if="across" class="across">{{ across }}</span>
    </p>

    <div class="panes">
      <div class="json" aria-label="the JSON's fields">
        <div class="label">work_item.json</div>
        <div v-for="r in ROWS" :key="r.head.path" class="row" :class="{ item: r.head.path.endsWith(']') }">
          <button class="small" :class="[shadeOf(r.head), { chosen: selected === r.head.path, plain: r.items.length }]"
            :aria-pressed="selected === r.head.path" @click="choose(r.head.path, null)">
            <template v-if="r.items.length">{{ r.head.path.replace(/^.*(\[\d+\])$/, "$1") }}</template>
            <template v-else>{{ label(r.head) }} <span class="v">{{ valueOf(r.head) }}</span></template>
          </button>
          <button v-for="c in r.items" :key="c.path" class="small" :class="[shadeOf(c), { chosen: selected === c.path }]"
            :aria-pressed="selected === c.path" @click="choose(c.path, null)">
            {{ label(c) }} <span class="v">{{ valueOf(c) }}</span>
          </button>
        </div>
      </div>

      <div class="bin">
        <div class="label"><span class="unit-tag bytes">bytes</span> work_item.bin, {{ perRow }} to a row, each 2 hex digits{{ perRow < ROW ? " (a gap after every 16, hexdump's rows)" : "" }}</div>
        <div class="grid" :style="{ '--per-row': perRow }" aria-label="the 236 bytes">
          <template v-for="r in rows" :key="r">
            <span class="offset" :class="{ gap: (r + perRow) % ROW === 0 && perRow < ROW }">{{ r }}</span>
            <button v-for="i in Math.min(perRow, TOTAL - r)" :key="r + i - 1" class="byte unit-byte"
              :class="[SHADES[r + i - 1], { on: inSel(r + i - 1), len: isLength(r + i - 1), tap: tapped === r + i - 1, end: r + i === DUMP, gap: (r + perRow) % ROW === 0 && perRow < ROW }]"
              :aria-label="`byte ${r + i - 1}: ${spaced([BYTES[r + i - 1]])}`" :aria-pressed="inSel(r + i - 1)"
              @click="tapByte(r + i - 1)">{{ spaced([BYTES[r + i - 1]]) }}</button>
            <span v-if="r < DUMP && DUMP <= r + perRow" class="dump-note">
              ↑ the lesson's dump ({{ DUMP }} bytes) stops here, right after {{ DUMP_FIELD }}
            </span>
          </template>
        </div>
      </div>
    </div>

    <ul class="goals">
      <li v-for="g in GOALS" :key="g.id" :class="{ done: reached.has(g.id) }">{{ reached.has(g.id) ? "✓" : "○" }} {{ g.say }}</li>
    </ul>
  </div>
</template>

<style scoped>
.tile.field .tile-value { font-size: 16px; min-width: 24ch; }
.tile.rule .tile-value { font-size: 16px; min-width: 15ch; }
.tile .tile-value { min-width: 9ch; }
.range { font-size: 14px; color: var(--vp-c-text-2); margin: 0 0 8px; line-height: 1.5; }
.line { font-family: var(--vp-font-family-mono); font-size: 14px; margin: 8px 0 12px; line-height: 1.6; min-height: 4.8em; }
.tapped, .across { display: block; color: var(--vp-c-text-2); }
.label { font-size: 13px; color: var(--vp-c-text-2); margin-bottom: 4px; }
.panes { display: flex; flex-wrap: wrap; gap: 12px 16px; align-items: flex-start; }
.json { flex: 1 1 200px; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
.json .row { display: flex; flex-wrap: wrap; gap: 4px; }
.json .row.item { padding-left: 16px; }
.json button.small {
  min-height: 32px; text-align: left; border-left-width: 4px; font-size: 13px; max-width: 100%; overflow-wrap: anywhere;
}
.json button.small .v { color: var(--vp-c-text-2); }
.json button.top { border-left-color: var(--bit-top-line); }
.json button.low { border-left-color: var(--bit-low-line); }
.json button.mark { border-left-color: var(--bit-mark-line); }
.json button.plain { border-left-color: var(--vp-c-divider); }
.json button.chosen { border-color: var(--vp-c-brand-1); background: var(--vp-c-bg-soft); font-weight: 600; }
.bin { flex: 0 1 440px; min-width: 0; max-width: 100%; }
.grid {
  display: grid; grid-template-columns: 3.5ch repeat(var(--per-row), minmax(0, 1fr)); gap: 2px;
  font-family: var(--vp-font-family-mono); font-size: 13px;
}
.offset { font-size: 10px; color: var(--vp-c-text-3); align-self: center; text-align: right; padding-right: 4px; }
.byte {
  min-width: 0; height: 28px; padding: 0; border: 1px solid; border-radius: 3px; font: inherit; color: var(--vp-c-text-1);
  opacity: 0.5; cursor: pointer;
}
.byte.top { background: var(--bit-top); border-color: var(--bit-top-line); }
.byte.low { background: var(--bit-low); border-color: var(--bit-low-line); }
.byte.mark { background: var(--bit-mark); border-color: var(--bit-mark-line); }
.byte.on { opacity: 1; font-weight: 700; border-width: 2px; }
.byte.len.on { text-decoration: underline; }
.byte.tap { outline: 2px solid var(--vp-c-brand-1); outline-offset: 1px; }
.byte.end { position: relative; z-index: 1; box-shadow: 4px 0 0 -1px var(--vp-c-danger-1); }
.dump-note {
  grid-column: 1 / -1; font-family: var(--vp-font-family-base); font-size: 12px; color: var(--vp-c-danger-1);
  border-top: 2px dashed var(--vp-c-danger-1); padding: 2px 0 4px; margin: 2px 0;
}
.goals { list-style: none; padding: 0; margin: 12px 0 0; font-size: 14px; color: var(--vp-c-text-2); }
.goals li.done { color: var(--vp-c-green-1); }
@media (max-width: 640px) {
  .widget.vector-map { padding: 12px; }
  .byte { height: 32px; font-size: 14px; }
  .byte.gap, .offset.gap { margin-bottom: 6px; }
  .line { font-size: 13px; }
}
</style>
