<!-- Lesson 3.3: erasure coding in miniature. Three letters become the curve through their
     numbers (mod 257), each of 6 validators holds one point on it, and any 3 points rebuild
     the letters (Lagrange); 2 can't. Full's 1,023 and 342 as a count only. -->
<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type { Shard } from "./shards.ts";
import { anotherFit, encodeShards, letter, lettersOf, originalShards, P, rebuild, SIZES, weights } from "./shards.ts";

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
const message = computed(() => {
  const m = lettersOf(text.value);
  return m && m.length === 3 ? m : null;
});
const shards = computed(() => (message.value ? encodeShards(message.value, SIZES.tiny) : []));
const lost = ref(new Set<number>());
const held = computed<Shard[]>(() => shards.value.map((y, x) => ({ x, y })).filter((s) => !lost.value.has(s.x)));

type Outcome = { ok: true; back: number[]; used: Shard[] } | { ok: false; other: number[] };
const outcome = ref<Outcome | null>(null);
watch([lost, text], () => { outcome.value = null; });

function toggle(x: number) {
  const next = new Set(lost.value);
  if (!next.delete(x)) next.add(x);
  lost.value = next;
}

const reached = ref(new Set<string>());
const mark = (id: string) => { reached.value = new Set([...reached.value, id]); };
function press() {
  if (!message.value) return;
  const back = rebuild(held.value, k.value);
  outcome.value = back ? { ok: true, back, used: held.value.slice(0, k.value) } : { ok: false, other: anotherFit(held.value, message.value, SIZES.tiny) };
  // a goal counts when the reader's own rebuild brings it about
  if (back && [0, 1, 2].every((x) => lost.value.has(x))) mark("own");
  if (back && held.value.length === k.value) mark("fewest");
  if (!back && held.value.length === k.value - 1) mark("short");
}

/** One rebuilt letter's sum: each used shard times its weight, mod P. */
const sumFor = (used: Shard[], x: number) => {
  const w = weights(used.map((s) => s.x), x);
  return used.map((s, i) => `${s.y}×${w[i]}`).join(" + ");
};
const word = (ys: number[]) => ys.map(letter).join("");

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
    <p class="range">
      The same idea in miniature, not JAM's exact code: 3 letters are 3 numbers, and there is exactly one curve
      (a polynomial of degree 2, counting mod {{ P }}) through them. Each of 6 validators holds one point on it, a shard. Any
      3 points pin the curve down again, so any 3 shards give the letters back. JAM does this with a systematic Reed–Solomon
      code in GF(2^16), on 2-byte words, many at once (Gray Paper, Appendix H).
    </p>
    <div class="controls" role="group" aria-label="network size">
      <button class="small" :class="{ chosen: size === 'tiny' }" :aria-pressed="size === 'tiny'" @click="size = 'tiny'">tiny: 6 validators</button>
      <button class="small" :class="{ chosen: size === 'full' }" :aria-pressed="size === 'full'" @click="size = 'full'">full: 1,023 validators</button>
    </div>

    <template v-if="size === 'tiny'">
      <div class="controls">
        <label class="label" for="shard-message">message</label>
        <input id="shard-message" v-model="text" maxlength="3" spellcheck="false" autocomplete="off" />
      </div>
      <p v-if="!message" class="error">Three letters, each one byte (a code below 256).</p>
      <template v-else>
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
            From validators {{ outcome.used.map((s) => s.x).join(", ") }}<template v-if="held.length > k"> (any 3 will do: these
            are the first 3 held)</template>: each letter is their shards times weights that depend only on which validators they
            are, mod {{ P }}.
          </p>
          <p v-for="(y, x) in outcome.back" :key="x" class="sum">
            letter {{ x + 1 }} = {{ sumFor(outcome.used, x) }} = {{ y }}, “{{ letter(y) }}”
          </p>
        </div>
        <div v-else-if="outcome" class="outcome">
          <p>
            {{ held.length }} shard{{ held.length === 1 ? "" : "s" }} {{ held.length === 1 ? "is" : "are" }} {{ held.length }}
            equation{{ held.length === 1 ? "" : "s" }} for 3 unknowns, the 3 letters: not enough to decide them. The message
            {{ outcome.other.join(", ") }} (“{{ word(outcome.other) }}”) gives exactly the same
            shard{{ held.length === 1 ? "" : "s" }}<template v-if="held.length"> at validator{{ held.length === 1 ? "" : "s" }}
            {{ held.map((s) => s.x).join(" and ") }}</template> as {{ message.join(", ") }} does.
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

    <ul class="goals">
      <li v-for="g in GOALS" :key="g.id" :class="{ done: reached.has(g.id) }">{{ reached.has(g.id) ? "✓" : "○" }} {{ g.say }}</li>
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
.sum { font-family: var(--vp-font-family-mono); font-size: 14px; overflow-wrap: anywhere; }
.error { color: var(--vp-c-danger-1); font-size: 14px; }
.goals { list-style: none; padding: 0; margin: 12px 0 0; font-size: 14px; color: var(--vp-c-text-2); }
.goals li.done { color: var(--vp-c-green-1); }
@media (max-width: 640px) {
  .widget.shard-rebuild { padding: 12px; }
  .validators { grid-template-columns: repeat(3, 1fr); }
}
</style>
