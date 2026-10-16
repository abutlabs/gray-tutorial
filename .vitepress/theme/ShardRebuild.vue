<!-- Lesson 3.3: erasure coding in miniature. Three letters are three dots at x = 0, 1, 2; the
     one curve through them, read on at 3, 4 and 5, gives the other shards. Each of 6
     validators holds one dot; any 3 dots pin the curve down again, and the plot redraws it
     from them; with 2, a second curve through the same dots reads another message. Full's
     1,023 and 342 as a count only. -->
<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type { Shard } from "./shards.ts";
import { anotherFit, curveOf, curveRuns, curveText, encodeShards, letter, lettersOf, originalShards, P, rangeOf, realRun, rebuild, SIZES, wraps, wrapSum } from "./shards.ts";

const GOALS = [
  { id: "own", say: "lose the 3 shards that are the message itself, and still rebuild" },
  { id: "fewest", say: "find the fewest shards that rebuild" },
  { id: "short", say: "lose one too many" },
];
const fmt = (n: number) => n.toLocaleString("en-US");

const size = ref<"tiny" | "full">("tiny");
const n = computed(() => SIZES[size.value]);
const k = computed(() => originalShards(n.value)); // 3 on tiny, 342 on full

// tiny: real shards of a real message
const text = ref("JAM");
const typed = computed(() => {
  const m = lettersOf(text.value);
  return m && m.length === 3 ? m : null;
});
// while a message is half typed, the last whole one stays: the widget never collapses mid-word
const message = ref<number[]>(lettersOf("JAM")!);
watch(typed, (m) => { if (m) message.value = m; });
const shards = computed(() => encodeShards(message.value, SIZES.tiny));
const lost = ref(new Set<number>());
const held = computed<Shard[]>(() => shards.value.map((y, x) => ({ x, y })).filter((s) => !lost.value.has(s.x)));

type Outcome = { ok: true; back: number[]; used: Shard[] } | { ok: false; other: number[] };
const outcome = ref<Outcome | null>(null);
watch([lost, message], () => { outcome.value = null; });

function toggle(x: number) {
  const next = new Set(lost.value);
  if (!next.delete(x)) next.add(x);
  lost.value = next;
}

const reached = ref(new Set<string>());
const mark = (id: string) => { reached.value = new Set([...reached.value, id]); };
function press() {
  const back = rebuild(held.value, k.value);
  outcome.value = back ? { ok: true, back, used: held.value.slice(0, k.value) } : { ok: false, other: anotherFit(held.value, message.value, SIZES.tiny) };
  // a goal counts when the reader's own rebuild brings it about
  if (back && [0, 1, 2].every((x) => lost.value.has(x))) mark("own");
  if (back && held.value.length === k.value) mark("fewest");
  if (!back && held.value.length === k.value - 1) mark("short");
}

const word = (ys: number[]) => ys.map(letter).join("");
const list = (xs: (number | string)[]) => (xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs.at(-1)}`);

// the curve, and the plot: x = 0 to 5 across; up, the byte 0 to 256 and wherever the real
// curve goes past it, drawn faintly, so a wrapped shard is seen to come round the clock
const curve = computed(() => curveOf(message.value));
const other = computed(() => (outcome.value && !outcome.value.ok ? curveOf(outcome.value.other) : null));
const wrapped = computed(() => wraps(curve.value, SIZES.tiny));
const range = computed(() => rangeOf(curve.value, SIZES.tiny - 1));
const W = 372, TOP = 22; // room right of x = 5 for a wrap's sum, "−257 × 5"
const tall = computed(() => Math.min(280, (140 * (range.value.hi - range.value.lo)) / 256)); // 140 px for the byte, at most 280 in all
const H = computed(() => TOP + tall.value + 30);
const px = (x: number) => 34 + x * 54;
const py = (y: number) => TOP + ((range.value.hi - y) / (range.value.hi - range.value.lo)) * tall.value;
const realPath = computed(() => realRun(curve.value, SIZES.tiny - 1).map(([x, y], i) => `${i ? "L" : "M"}${px(x).toFixed(1)},${py(y).toFixed(1)}`).join(""));
const pathOf = (c: { a: number; b: number; c: number }) =>
  curveRuns(c, SIZES.tiny - 1).map((run) => run.map(([x, y], i) => `${i ? "L" : "M"}${px(x).toFixed(1)},${py(y).toFixed(1)}`).join("")).join("");

// full: a count only
const offline = ref(0);
const fullHeld = computed(() => SIZES.full - offline.value);

const heldCount = computed(() => (size.value === "tiny" ? held.value.length : fullHeld.value));
const verdict = computed(() => {
  if (size.value === "full") return fullHeld.value >= k.value ? "✓" : "✗";
  return outcome.value ? (outcome.value.ok ? "✓" : "✗") : "—";
});
const shown = computed(() => {
  if (size.value === "full") return "count only";
  if (!outcome.value) return "—";
  return outcome.value.ok ? word(outcome.value.back) : "???";
});
</script>

<template>
  <div class="widget shard-rebuild">
    <div class="readout" aria-live="polite">
      <div class="tile"><span class="tile-label">shards held</span><span class="tile-value wide">{{ fmt(heldCount) }}/{{ fmt(n) }}</span></div>
      <div class="tile"><span class="tile-label">needed</span><span class="tile-value">{{ k }}</span></div>
      <div class="tile" :class="{ ok: verdict === '✓', no: verdict === '✗' }"><span class="tile-label">rebuild</span><span class="tile-value">{{ verdict }}</span></div>
      <div class="tile"><span class="tile-label">message</span><span class="tile-value wide">{{ shown }}</span></div>
    </div>
    <div class="controls" role="group" aria-label="network size">
      <button class="small" :class="{ chosen: size === 'tiny' }" :aria-pressed="size === 'tiny'" @click="size = 'tiny'">tiny: 6 validators</button>
      <button class="small" :class="{ chosen: size === 'full' }" :aria-pressed="size === 'full'" @click="size = 'full'">full: 1,023 validators</button>
    </div>

    <template v-if="size === 'tiny'">
      <div class="controls">
        <label class="label" for="shard-message">message</label>
        <input id="shard-message" v-model="text" maxlength="3" spellcheck="false" autocomplete="off" />
        <span class="error">{{ typed ? "" : `Three letters, each one byte (a code below 256): showing “${word(message)}” till then.` }}</span>
      </div>
      <template v-if="curve">
        <ol class="steps">
          <li>“{{ word(message) }}” is the bytes {{ list(message) }}: three dots, at x = 0, 1 and 2.</li>
          <li>Exactly one curve y = a + bx + cx² passes through three dots. Through these: <b class="eq">{{ curveText(curve) }}</b>.</li>
          <li>
            Read the same curve on, at x = 3, 4 and 5: {{ list(shards.slice(3)) }}. Six dots, one per validator: those are the shards.
            <template v-if="wrapped.length"> A shard is one byte, so counting goes round a clock of {{ P }}: where the real curve (faint) passes 256 or drops below 0, its shard comes back in at the other edge, {{ list(wrapped.map(wrapSum)) }}.</template>
          </li>
        </ol>
        <svg class="plot" :viewBox="`0 0 ${W} ${H}`" role="img" :aria-label="`the curve ${curveText(curve)} and the six shards on it`">
          <rect class="byte" :x="px(0) - 10" :width="px(5) - px(0) + 20" :y="py(256)" :height="py(0) - py(256)" />
          <line v-for="y in [0, 128, 256]" :key="y" class="grid" :x1="px(0) - 10" :x2="px(5) + 10" :y1="py(y)" :y2="py(y)" />
          <path v-if="wrapped.length" class="curve real" :d="realPath" />
          <g v-for="w in wrapped" :key="`w${w.x}`" class="wrap">
            <line class="drop" :x1="px(w.x)" :x2="px(w.x)" :y1="py(w.height)" :y2="py(w.shard)" />
            <circle class="ghost" :cx="px(w.x)" :cy="py(w.height)" r="5" />
            <text class="value ghost-value" :x="px(w.x) - 9" :y="py(w.height) + 4" text-anchor="end">{{ w.height.toLocaleString("en-US") }}</text>
            <text class="axis turn" :x="px(w.x) + 7" :y="(py(w.height) + py(w.height > 256 ? 256 : 0)) / 2 + 4">{{ w.height > w.shard ? "−" : "+" }}{{ P }}{{ Math.abs((w.height - w.shard) / P) === 1 ? "" : ` × ${Math.abs((w.height - w.shard) / P)}` }}</text>
          </g>
          <text v-for="y in [0, 128, 256]" :key="`t${y}`" class="axis" :x="px(0) - 14" :y="py(y) + 4" text-anchor="end">{{ y }}</text>
          <path class="curve" :d="pathOf(curve)" />
          <path v-if="other" class="curve other" :d="pathOf(other)" />
          <g v-for="(y, x) in shards" :key="x" :class="['dot', { own: x < 3, lost: lost.has(x) }]" @click="toggle(x)">
            <circle :cx="px(x)" :cy="py(y)" r="7" />
            <text class="value" :x="px(x)" :y="py(y) - 11" text-anchor="middle">{{ lost.has(x) ? "?" : y }}</text>
          </g>
          <circle v-for="(y, x) in (outcome && !outcome.ok ? encodeShards(outcome.other, SIZES.tiny) : [])" v-show="lost.has(x)" :key="`o${x}`" class="dot-other" :cx="px(x)" :cy="py(y)" r="5" />
          <text v-for="x in 6" :key="`x${x}`" class="axis" :x="px(x - 1)" :y="H - 8" text-anchor="middle">{{ x - 1 }}</text>
        </svg>
        <div class="label">Tap a validator to take it offline. Shards 0 to 2 are the letters themselves; 3 to 5 carry the curve on.</div>
        <div class="validators">
          <button
            v-for="(y, x) in shards" :key="x" class="chip" :class="{ lost: lost.has(x), own: x < 3 }" :aria-pressed="lost.has(x)"
            :aria-label="`validator ${x}, shard ${y}: offline?`" @click="toggle(x)"
          >
            <small>validator {{ x }}</small>
            <b>{{ lost.has(x) ? "offline" : y }}</b>
            <small>{{ x < 3 ? `“${letter(y)}”` : `curve at ${x}` }}</small>
          </button>
        </div>
        <button class="rebuild" @click="press">rebuild from the {{ held.length }} shard{{ held.length === 1 ? "" : "s" }} held</button>
        <div v-if="outcome && outcome.ok" class="outcome">
          <p>
            The dots at validators {{ list(outcome.used.map((s) => s.x)) }}<template v-if="held.length > k"> (any 3 will do: these
            are the first 3 held)</template> fit one curve only, <b class="eq">{{ curveText(curve) }}</b>: finding it is three
            equations, one per dot, for a, b and c. Read it at x = 0, 1 and 2: {{ list(outcome.back) }}, “{{ word(outcome.back) }}”.
          </p>
        </div>
        <div v-else-if="outcome" class="outcome">
          <p>
            {{ held.length }} dot{{ held.length === 1 ? "" : "s" }} fit{{ held.length === 1 ? "s" : "" }} many curves: {{ held.length }}
            equation{{ held.length === 1 ? "" : "s" }} for 3 unknowns. The dashed one, <b class="eq">{{ other && curveText(other) }}</b>,
            <template v-if="held.length">passes through the same dot{{ held.length === 1 ? "" : "s" }} at validator{{ held.length === 1 ? "" : "s" }}
            {{ list(held.map((s) => s.x)) }} but </template>reads {{ list(outcome.other) }} at x = 0, 1 and 2, “{{ word(outcome.other) }}”.
            Nobody can tell which message it was.<template v-if="other && wraps(other, SIZES.tiny).length"> (Where it runs off the
            chart it comes back in at the other edge: counting goes round a clock of {{ P }}.)</template>
          </p>
        </div>
      </template>
    </template>

    <template v-else>
      <p class="range">
        1,023 validators each hold one shard, and any {{ k }} of them rebuild the bundle: a third of 1,023, plus one. Here it
        is a count only; no curve is worked out.
      </p>
      <div class="controls">
        <label class="label" for="shard-offline">offline: {{ fmt(offline) }}</label>
        <input id="shard-offline" v-model.number="offline" type="range" min="0" :max="SIZES.full" aria-label="validators offline" />
      </div>
      <p class="sum">{{ fmt(fullHeld) }} held {{ fullHeld >= k ? "≥" : "<" }} {{ k }} needed: {{ fullHeld >= k ? "it rebuilds" : "it can't" }}</p>
    </template>

    <p v-if="size === 'tiny'" class="note">
      The same idea as JAM's, smaller: JAM's code (Gray Paper, Appendix H) runs on 2-byte numbers instead of letters, counts in a
      field of 2^16 instead of mod {{ P }}, and works on many curves at once.
    </p>

    <ul class="goals">
      <li v-for="g in GOALS" :key="g.id" :class="{ done: reached.has(g.id) }">{{ reached.has(g.id) ? "✓" : "○" }} <UnitText :text="g.say" /></li>
    </ul>
  </div>
</template>

<style scoped>
.range { font-size: 14px; color: var(--vp-c-text-2); margin: 0 0 12px; line-height: 1.5; }
.tile-value.wide { min-width: 11ch; }
.tile.ok { border-color: var(--bit-low-line); background: var(--bit-low); }
.tile.no { border-color: var(--bit-mark-line); background: var(--bit-mark); }
.controls { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; margin-bottom: 8px; }
.controls .small { min-height: 32px; }
.controls input:not([type="range"]) {
  width: 8ch; min-height: 32px; padding: 2px 8px; border: 1px solid var(--vp-c-divider); border-radius: 6px;
  font-family: var(--vp-font-family-mono); font-size: 16px;
}
.controls input[type="range"] { flex: 1 1 160px; min-width: 0; height: 32px; }
.label { font-size: 13px; color: var(--vp-c-text-2); }
.validators { display: grid; grid-template-columns: repeat(auto-fill, minmax(96px, 1fr)); gap: 6px; margin: 8px 0; }
.chip {
  display: flex; flex-direction: column; align-items: center; min-height: 44px; padding: 4px 6px; cursor: pointer;
  border: 2px solid var(--bit-low-line); background: var(--bit-low); border-radius: 6px; font-family: var(--vp-font-family-mono); line-height: 1.25;
}
.chip.own { border-color: var(--bit-top-line); background: var(--bit-top); }
.chip b { font-size: 18px; }
.chip small { font-size: 11px; color: var(--vp-c-text-2); }
.chip.lost { border-style: dashed; border-color: var(--vp-c-divider); background: var(--vp-c-bg-soft); }
.chip.lost b { font-size: 14px; color: var(--vp-c-text-3); }
.rebuild {
  min-height: 40px; padding: 4px 16px; border: 2px solid var(--vp-c-brand-1); border-radius: 8px;
  color: var(--vp-c-brand-1); font-weight: 600;
}
.outcome { margin-top: 8px; font-size: 14px; line-height: 1.5; }
.outcome p { margin: 4px 0; }
.steps { margin: 0 0 4px; padding-left: 1.4em; font-size: 14px; line-height: 1.55; }
.steps li { margin: 2px 0; }
.eq { font-family: var(--vp-font-family-mono); font-weight: 600; white-space: nowrap; }
.plot { display: block; width: 100%; max-width: 540px; height: auto; margin: 4px 0 8px; }
.plot .grid { stroke: var(--vp-c-divider); stroke-width: 1; }
.plot .axis { font-size: 11px; fill: var(--vp-c-text-3); font-family: var(--vp-font-family-mono); }
.plot .curve { fill: none; stroke: var(--vp-c-brand-1); stroke-width: 2.5; }
.plot .curve.other { stroke: var(--bit-mark-line); stroke-dasharray: 6 4; }
.plot .curve.real { stroke-width: 1.5; opacity: 0.35; }
.plot .byte { fill: var(--vp-c-bg-soft); }
.plot .drop { stroke: var(--vp-c-text-3); stroke-width: 1.5; stroke-dasharray: 2 3; }
.plot .ghost { fill: var(--vp-c-bg); stroke: var(--vp-c-text-3); stroke-width: 1.5; stroke-dasharray: 2 2; }
.plot .ghost-value { font-size: 11px; fill: var(--vp-c-text-2); font-family: var(--vp-font-family-mono); }
.plot .turn { fill: var(--vp-c-text-2); }
.plot .dot { cursor: pointer; }
.plot .dot circle { fill: var(--bit-low); stroke: var(--bit-low-line); stroke-width: 2; }
.plot .dot.own circle { fill: var(--bit-top); stroke: var(--bit-top-line); }
.plot .dot.lost circle { fill: var(--vp-c-bg); stroke: var(--vp-c-text-3); stroke-dasharray: 3 2; }
.plot .dot .value { font-size: 12px; font-weight: 600; fill: var(--vp-c-text-1); font-family: var(--vp-font-family-mono); }
.plot .dot-other { fill: var(--bit-mark); stroke: var(--bit-mark-line); stroke-width: 2; }
.note { font-size: 13px; color: var(--vp-c-text-2); margin: 10px 0 0; line-height: 1.5; }
.sum { font-family: var(--vp-font-family-mono); font-size: 14px; overflow-wrap: anywhere; }
.error { color: var(--vp-c-danger-1); font-size: 13px; flex: 1 1 200px; min-height: 1.5em; }
.goals { list-style: none; padding: 0; margin: 12px 0 0; font-size: 14px; color: var(--vp-c-text-2); }
.goals li.done { color: var(--vp-c-green-1); }
@media (max-width: 640px) {
  .widget.shard-rebuild { padding: 12px; }
  .validators { grid-template-columns: repeat(3, 1fr); }
}
</style>
