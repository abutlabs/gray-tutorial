<!-- A Part's opening page: the whole Part as a flow (part-flow.ts). Boxes are things your
     client holds; rounded cards are steps that turn one thing into the next; a dashed card
     happens outside your client, and an arrowed one in a later Part. A flow that crosses
     places is banded: off the chain, in-core, on-chain. Tap any card, or walk through them
     in order: the readout at the top says what it is, shows a real value and links the
     lesson that builds it. -->
<script setup lang="ts">
import { computed, ref } from "vue";
import { withBase } from "vitepress";
import { LESSON_PATHS, flowOf, partPath, type Card, type Place } from "./part-flow.ts";

const props = defineProps<{ part: number }>();
const flow = flowOf(props.part)!;
const at = ref(0);
const seen = ref(new Set<string>([flow.walk[0]]));

const id = computed(() => flow.walk[at.value]);
const card = computed<Card>(() => flow.cards[id.value]);
type Look = "thing" | "step" | "elsewhere" | "ahead";
const lookOf = (c: Card): Look => (c.elsewhere ? "elsewhere" : c.ahead ? "ahead" : c.kind);
const LOOK_SAYS: Record<Look, string> = {
  thing: "a thing your client holds",
  step: "a step your client takes",
  elsewhere: "done outside your client",
  ahead: "a step your client takes in a later Part",
};
const LOOK_KEY: Record<Look, string> = { thing: "box", step: "rounded", elsewhere: "dashed", ahead: "arrowed" };
/** The legend: only the looks this flow uses, in a fixed order. */
const looks = (Object.keys(LOOK_SAYS) as Look[]).filter((l) => Object.values(flow.cards).some((c) => lookOf(c) === l));

const PLACE_NAME: Record<Place, string> = { "off-chain": "Off the chain", "in-core": "In-core", "on-chain": "On-chain" };
const PLACE_SAYS: Record<Place, string> = {
  "off-chain": "before JAM sees it",
  "in-core": "on one of JAM's cores, by its guarantors, before any block",
  "on-chain": "in a block, checked by every client, yours too",
};
/** The rows, run by run: one run of all of them if the flow has no bands. */
const runs = (() => {
  let from = 0;
  return (flow.bands ?? [{ place: undefined, rows: flow.rows.length }]).map((b) => ({ place: b.place, rows: flow.rows.slice(from, (from += b.rows)) }));
})();
const placeOf = (c: string) => runs.find((r) => r.rows.some((row) => row.includes(c)))?.place;

function go(to: string) {
  at.value = flow.walk.indexOf(to);
  seen.value = new Set([...seen.value, to]);
}
/** What goes before the i-th of n names: nothing, a comma, or "and" before the last. */
const joiner = (i: number, n: number) => (i === 0 ? "" : i === n - 1 ? " and " : ", ");
const step = (by: number) => go(flow.walk[(at.value + by + flow.walk.length) % flow.walk.length]);
</script>

<template>
  <div class="widget part-flow">
    <div class="readout" aria-live="polite">
      <div class="title">
        <span class="kind" :class="lookOf(card)">{{ LOOK_SAYS[lookOf(card)] }}<template v-if="placeOf(id)"> · {{ PLACE_NAME[placeOf(id)!] }}</template></span>
        <b>{{ card.name }}</b>
      </div>
      <p class="says"><UnitText :text="card.says" /></p>
      <p v-if="card.example" class="example"><UnitText :text="card.example" /></p>
      <p v-if="card.fields" class="fields"><code v-for="f in card.fields" :key="f">{{ f }}</code></p>
      <p class="where">
        <template v-if="card.elsewhere">{{ card.elsewhere }}</template>
        <template v-else-if="card.ahead">
          Your client takes this step in {{ card.ahead.length > 1 ? "Parts" : "Part" }}
          <template v-for="(p, i) in card.ahead" :key="p">{{ joiner(i, card.ahead.length) }}<a :href="withBase(`/${partPath(p)}/`)">{{ p }}</a></template>.
        </template>
        <template v-else>
          Built in {{ card.lessons.length > 1 ? "lessons" : "lesson" }}
          <template v-for="(l, i) in card.lessons" :key="l">{{ joiner(i, card.lessons.length) }}<a :href="withBase(`/${LESSON_PATHS[l]}`)">{{ l }}</a></template>.
        </template>
      </p>
    </div>
    <div class="controls">
      <button class="small" aria-label="the step before" @click="step(-1)">◀ back</button>
      <span class="count">{{ at + 1 }} of {{ flow.walk.length }}</span>
      <button class="small go" aria-label="the next step" @click="step(1)">next ▶</button>
    </div>
    <div class="flow" :aria-label="`Part ${part} as a flow`">
      <template v-for="(run, k) in runs" :key="k">
        <div v-if="k > 0" class="arrow" aria-hidden="true">↓</div>
        <section class="run" :class="run.place">
          <p v-if="run.place" class="place"><b>{{ PLACE_NAME[run.place] }}</b> {{ PLACE_SAYS[run.place] }}</p>
          <ol class="rows">
            <li v-for="(row, r) in run.rows" :key="r" class="row">
              <button v-for="c in row" :key="c" class="card" :class="[lookOf(flow.cards[c]), { now: c === id, seen: seen.has(c) }]"
                :aria-pressed="c === id" @click="go(c)">{{ flow.cards[c].name }}</button>
            </li>
          </ol>
        </section>
      </template>
    </div>
    <dl class="legend">
      <template v-for="l in looks" :key="l">
        <dt><span class="key" :class="l">{{ LOOK_KEY[l] }}</span></dt>
        <dd>{{ LOOK_SAYS[l] }}</dd>
      </template>
    </dl>
  </div>
</template>

<style scoped>
/* the shared .widget .readout is a row of tiles; this one is a card of lines */
.part-flow .readout { display: block; min-height: 236px; }
.title { display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 10px; font-size: 17px; }
.kind { font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em; color: var(--vp-c-text-2); }
.kind.step, .kind.ahead { color: var(--vp-c-brand-1); }
.kind.elsewhere { color: var(--vp-c-text-3); }
.says { margin: 8px 0; line-height: 1.55; }
.example { margin: 6px 0; font-family: var(--vp-font-family-mono); font-size: 14px; }
.fields { display: flex; flex-wrap: wrap; gap: 4px; margin: 6px 0; }
.fields code { font-size: 12px; }
.where { margin: 6px 0 0; font-size: 14px; color: var(--vp-c-text-2); }
.controls { display: flex; align-items: center; gap: 8px; margin: 8px 0 12px; }
.controls .count { font-family: var(--vp-font-family-mono); font-size: 13px; color: var(--vp-c-text-2); }
.widget button.small { min-height: 32px; }
.go { border-color: var(--vp-c-brand-1); color: var(--vp-c-brand-1); font-weight: 600; }
.rows { list-style: none; padding: 0; margin: 0; }
.row { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; margin: 0; }
/* an arrow down between rows, and between runs: each is made from the one above */
.row + .row::before, .arrow { flex-basis: 100%; text-align: center; color: var(--vp-c-text-3); line-height: 1.6; }
.row + .row::before { content: "↓"; }
/* a run of rows in one place: a labelled band */
.run.off-chain, .run.in-core, .run.on-chain { border: 1px solid var(--vp-c-divider); border-radius: 8px; padding: 6px 10px 12px; }
.run.off-chain { border-style: dashed; }
.run.in-core { background: var(--vp-c-default-soft); }
.place { margin: 0 0 6px; font-size: 13px; line-height: 1.4; color: var(--vp-c-text-2); }
.place b { margin-right: 4px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em; color: var(--vp-c-text-1); }
.card {
  min-height: 40px; min-width: 120px; max-width: 100%; padding: 6px 12px;
  border: 1px solid var(--vp-c-divider); background: var(--vp-c-bg-soft); color: var(--vp-c-text-1);
  font-size: 14px; line-height: 1.3; cursor: pointer;
}
.card.thing { border-radius: 4px; border-width: 2px; }
.card.step, .card.ahead { border-radius: 999px; color: var(--vp-c-brand-1); }
.card.elsewhere { border-radius: 999px; border-style: dashed; color: var(--vp-c-text-2); background: transparent; }
.card.ahead::after, .key.ahead::after { content: " →"; }
.card.seen:not(.now) { border-color: var(--vp-c-brand-soft); }
.card.now { border-color: var(--vp-c-brand-1); box-shadow: 0 0 0 2px var(--vp-c-brand-1); background: var(--vp-c-brand-soft); }
/* the legend: each look's key in one column, what it means in the next */
.legend { display: grid; grid-template-columns: max-content 1fr; align-items: center; gap: 6px 10px; margin: 14px 0 0; font-size: 13px; color: var(--vp-c-text-2); }
.legend dt { display: flex; }
.legend dd { margin: 0; }
.key { flex: 1; padding: 0 8px; border: 1px solid var(--vp-c-divider); font-size: 12px; line-height: 1.8; text-align: center; }
.key.thing { border-radius: 3px; border-width: 2px; }
.key.step, .key.ahead { border-radius: 999px; color: var(--vp-c-brand-1); }
.key.elsewhere { border-radius: 999px; border-style: dashed; }
@media (max-width: 640px) {
  .part-flow .readout { min-height: 330px; }
  .card { min-width: 0; flex: 1 1 40%; }
  .run.off-chain, .run.in-core, .run.on-chain { padding: 6px 6px 10px; }
}
</style>
