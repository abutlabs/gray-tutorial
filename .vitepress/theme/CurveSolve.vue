<!-- Lesson 3.3: the curve, worked by hand. Make: three letters become three points, the
     points give y = a + bx + cx² step by step, and the curve gives the other three shards.
     Rebuild: pick any three of the six shards and watch the same steps find the curve, and
     the message, again; with two, see why it can't. Computed in curve-solve.ts. -->
<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { at, curveText, PRESETS, pointsOf, reading, shardsOf, show, slope, solve } from "./curve-solve.ts";
import { letter, lettersOf } from "./shards.ts";

const text = ref("JAM");
const typed = computed(() => {
  const c = lettersOf(text.value);
  return c && c.length === 3 ? c : null;
});
// while a message is half typed, the last whole one stays: the working never collapses mid-word
const codes = ref<number[]>(lettersOf("JAM")!);
watch(typed, (c) => { if (c) codes.value = c; });
const mode = ref<"make" | "rebuild">("make");
const picked = ref<number[]>([3, 4, 5]);

const made = computed(() => solve(pointsOf(codes.value)));
const shards = computed(() => shardsOf(codes.value));
const chosen = computed(() => [...picked.value].sort((a, b) => a - b));
const rebuilt = computed(() => (chosen.value.length === 3 && shards.value.length ? solve(chosen.value.map((x) => ({ x, y: shards.value[x] }))) : null));
const back = computed(() => (rebuilt.value ? [0, 1, 2].map((x) => at(rebuilt.value!.curve, x)) : null));
const backText = computed(() => (back.value ? back.value.map((y) => (y.d === 1 ? letter(y.n) : "?")).join("") : ""));
const shownWord = computed(() => codes.value.map(letter).join(""));
const big = computed(() => shards.value.some((y) => y < 0 || y > 256));

function pick(x: number) {
  const now = picked.value.filter((p) => p !== x);
  picked.value = now.length < picked.value.length ? now : [...now, x].slice(-3); // a fourth replaces the first picked
}
const set = (t: string) => { text.value = t; };
const fmtCodes = (c: number[]) => c.join(" ");
</script>

<template>
  <div class="widget curve-solve">
    <div class="readout" aria-live="polite">
      <div class="tile"><span class="tile-label">message</span><span class="tile-value">{{ shownWord }} = {{ fmtCodes(codes) }}</span></div>
      <div class="tile wide"><span class="tile-label">the curve</span><span class="tile-value">{{ curveText(made.curve) }}</span></div>
      <div class="tile wide"><span class="tile-label">shards, x = 0 to 5</span><span class="tile-value">{{ shards.map((y) => show({ n: y, d: 1 })).join(" ") || "·" }}</span></div>
      <div class="tile" :class="mode === 'rebuild' ? (rebuilt ? 'ok' : 'no') : ''"><span class="tile-label">rebuilt from {{ chosen.length === 3 ? `x = ${chosen.join(", ")}` : "3 shards" }}</span><span class="tile-value">{{ mode === "rebuild" ? (rebuilt ? `"${backText}"` : "can't") : "·" }}</span></div>
    </div>
    <div class="controls">
      <label class="num">message <input v-model="text" type="text" maxlength="3" spellcheck="false" aria-label="a three-letter message" /></label>
      <button v-for="p in PRESETS" :key="p" class="small" :class="{ chosen: text === p }" :aria-pressed="text === p" @click="set(p)">{{ p }}</button>
      <span class="hint">{{ typed ? "" : `Three letters, each one byte: showing “${shownWord}” till then.` }}</span>
    </div>
    <div class="modes" role="group" aria-label="make the shards, or rebuild from three">
      <button class="small" :class="{ chosen: mode === 'make' }" :aria-pressed="mode === 'make'" @click="mode = 'make'">1 · make the shards</button>
      <button class="small" :class="{ chosen: mode === 'rebuild' }" :aria-pressed="mode === 'rebuild'" @click="mode = 'rebuild'">2 · rebuild from 3</button>
    </div>

    <div v-if="mode === 'rebuild'" class="chips" role="group" aria-label="the six shards: pick three">
      <button v-for="(y, x) in shards" :key="x" class="chip" :class="{ chosen: picked.includes(x) }" :aria-pressed="picked.includes(x)" @click="pick(x)">
        <span class="chip-x">x = {{ x }}</span><span class="chip-y">{{ show({ n: y, d: 1 }) }}</span>
      </button>
    </div>

    <ol class="steps">
      <template v-if="mode === 'make'">
        <li><b>the points:</b> {{ codes.map((y) => `${letter(y)} = ${y}`).join(", ") }}, at x = 0, 1, 2</li>
        <li v-for="(s, i) in made.steps" :key="i"><b>{{ s.finds }}:</b> {{ s.sum }}</li>
        <li><b>the curve:</b> {{ curveText(made.curve) }}</li>
        <li v-for="x in [3, 4, 5]" :key="x"><b>shard {{ x }}:</b> {{ reading(made.curve, x) }}</li>
      </template>
      <template v-else-if="rebuilt">
        <li><b>the points:</b> {{ chosen.map((x) => `(${x}, ${show({ n: shards[x], d: 1 })})`).join(", ") }}</li>
        <li v-for="(s, i) in rebuilt.steps" :key="i"><b>{{ s.finds }}:</b> {{ s.sum }}</li>
        <li><b>the curve:</b> {{ curveText(rebuilt.curve) }}, the same one</li>
        <li><b>the message:</b> at x = 0, 1, 2 it gives {{ back!.map(show).join(", ") }}: "{{ backText }}"</li>
      </template>
      <template v-else>
        <li v-if="chosen.length === 2"><b>one slope:</b> between x = {{ chosen[0] }} and {{ chosen[1] }} the curve climbs ({{ show({ n: shards[chosen[1]], d: 1 }) }} − {{ show({ n: shards[chosen[0]], d: 1 }) }}) ÷ {{ chosen[1] - chosen[0] }} = {{ show(slope({ x: chosen[0], y: shards[chosen[0]] }, { x: chosen[1], y: shards[chosen[1]] })) }}, which is b + c × {{ chosen[0] + chosen[1] }}</li>
        <li><b>pick {{ 3 - chosen.length }} more.</b> {{ chosen.length === 2 ? "One sum, two unknowns: choose any c and some b fits it, each curve a different message." : "Three unknowns, a, b and c, need three points." }}</li>
      </template>
    </ol>
    <p class="note">{{ big ? "Some shards here don't fit in a byte (0 to 255). JAM does the same sums on a clock (the plot above wraps them), so every shard does; the steps don't change." : "Every step is plain arithmetic: check any of it on paper." }}</p>
  </div>
</template>

<style scoped>
.curve-solve .readout { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); }
.tile { min-width: 0; }
.tile .tile-value { font-size: 15px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.tile.ok { border-color: var(--bit-low-line); background: var(--bit-low); }
.tile.no { border-color: var(--bit-mark-line); background: var(--bit-mark); }
.controls, .modes { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin: 8px 0 0; }
.controls button.small, .modes button.small { min-height: 32px; font-family: var(--vp-font-family-mono); }
.num { display: inline-flex; align-items: center; gap: 4px; font-size: 13px; color: var(--vp-c-text-2); }
.num input { width: 6ch; min-height: 32px; padding: 0 6px; border: 1px solid var(--vp-c-divider); border-radius: 4px; background: var(--vp-c-bg); color: var(--vp-c-text-1); font-family: var(--vp-font-family-mono); font-size: 14px; }
.chips { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 4px; margin: 10px 0 0; }
.chip { display: flex; flex-direction: column; align-items: center; min-height: 32px; min-width: 0; padding: 4px 2px; border: 1px solid var(--vp-c-divider); border-radius: 4px; background: var(--vp-c-bg); color: var(--vp-c-text-1); font-family: var(--vp-font-family-mono); cursor: pointer; }
.chip.chosen { border: 2px solid var(--vp-c-brand-1); background: var(--vp-c-brand-soft); }
.chip-x { font-size: 11px; color: var(--vp-c-text-2); }
.chip-y { font-size: 15px; }
.steps { margin: 10px 0 0; padding-left: 1.6em; font-family: var(--vp-font-family-mono); font-size: 13px; line-height: 1.7; min-height: 17em; }
/* narrow: room for the longest working, so the page doesn't jump as shards are picked */
@media (max-width: 640px) { .steps { min-height: 34em; } }
.steps li { margin: 0; overflow-wrap: anywhere; }
.steps b { font-family: var(--vp-font-family-base); font-weight: 600; }
.hint { flex: 1 1 200px; min-height: 1.5em; font-size: 13px; color: var(--vp-c-danger-1); }
.note { margin: 8px 0 0; font-size: 13px; color: var(--vp-c-text-2); line-height: 1.5; min-height: 3em; }
</style>
