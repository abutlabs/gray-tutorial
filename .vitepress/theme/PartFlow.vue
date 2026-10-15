<!-- A Part's opening page: the whole Part as a flow (part-flow.ts). Boxes are things your
     client holds; rounded cards are steps that turn one thing into the next; a dashed
     step happens outside your client. Tap any card, or walk through them in order: the
     readout at the top says what it is, shows a real value and links the lesson that
     builds it. -->
<script setup lang="ts">
import { computed, ref } from "vue";
import { withBase } from "vitepress";
import { LESSON_PATHS, flowOf, type Card } from "./part-flow.ts";

const props = defineProps<{ part: number }>();
const flow = flowOf(props.part)!;
const at = ref(0);
const seen = ref(new Set<string>([flow.walk[0]]));

const id = computed(() => flow.walk[at.value]);
const card = computed<Card>(() => flow.cards[id.value]);
const kindOf = (c: Card) => (c.elsewhere ? "elsewhere" : c.kind);
const KIND_SAYS = { thing: "a thing your client holds", step: "a step your client takes", elsewhere: "a step outside your client" };

function go(to: string) {
  at.value = flow.walk.indexOf(to);
  seen.value = new Set([...seen.value, to]);
}
const step = (by: number) => go(flow.walk[(at.value + by + flow.walk.length) % flow.walk.length]);
</script>

<template>
  <div class="widget part-flow">
    <div class="readout" aria-live="polite">
      <div class="title">
        <span class="kind" :class="kindOf(card)">{{ KIND_SAYS[kindOf(card)] }}</span>
        <b>{{ card.name }}</b>
      </div>
      <p class="says"><UnitText :text="card.says" /></p>
      <p v-if="card.example" class="example"><UnitText :text="card.example" /></p>
      <p v-if="card.fields" class="fields"><code v-for="f in card.fields" :key="f">{{ f }}</code></p>
      <p class="where">
        <template v-if="card.elsewhere">Not in your client: {{ card.elsewhere }}.</template>
        <template v-else>
          Built in
          <template v-for="(l, i) in card.lessons" :key="l">{{ i ? " and " : "" }}<a :href="withBase(`/${LESSON_PATHS[l]}`)">lesson {{ l }}</a></template>.
        </template>
      </p>
    </div>
    <div class="controls">
      <button class="small" aria-label="the step before" @click="step(-1)">◀ back</button>
      <span class="count">{{ at + 1 }} of {{ flow.walk.length }}</span>
      <button class="small go" aria-label="the next step" @click="step(1)">next ▶</button>
    </div>
    <ol class="flow" :aria-label="`Part ${part} as a flow`">
      <li v-for="(row, r) in flow.rows" :key="r" class="row">
        <button v-for="c in row" :key="c" class="card" :class="[kindOf(flow.cards[c]), { now: c === id, seen: seen.has(c) }]"
          :aria-pressed="c === id" @click="go(c)">{{ flow.cards[c].name }}</button>
      </li>
    </ol>
    <p class="legend">
      <span class="key thing">box</span> a thing your client holds ·
      <span class="key step">rounded</span> a step that turns one into the next ·
      <span class="key elsewhere">dashed</span> a step outside your client
    </p>
  </div>
</template>

<style scoped>
/* the shared .widget .readout is a row of tiles; this one is a card of lines */
.part-flow .readout { display: block; min-height: 236px; }
.title { display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 10px; font-size: 17px; }
.kind { font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em; color: var(--vp-c-text-2); }
.kind.step { color: var(--vp-c-brand-1); }
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
.flow { list-style: none; padding: 0; margin: 0; }
.row { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; margin: 0; }
/* an arrow down between rows: each row is made from the one above */
.row + .row::before { content: "↓"; flex-basis: 100%; text-align: center; color: var(--vp-c-text-3); line-height: 1.6; }
.card {
  min-height: 40px; min-width: 120px; max-width: 100%; padding: 6px 12px;
  border: 1px solid var(--vp-c-divider); background: var(--vp-c-bg-soft); color: var(--vp-c-text-1);
  font-size: 14px; line-height: 1.3; cursor: pointer;
}
.card.thing { border-radius: 4px; border-width: 2px; }
.card.step { border-radius: 999px; color: var(--vp-c-brand-1); }
.card.elsewhere { border-radius: 999px; border-style: dashed; color: var(--vp-c-text-2); background: transparent; }
.card.seen:not(.now) { border-color: var(--vp-c-brand-soft); }
.card.now { border-color: var(--vp-c-brand-1); box-shadow: 0 0 0 2px var(--vp-c-brand-1); background: var(--vp-c-brand-soft); }
.legend { margin: 12px 0 0; font-size: 13px; color: var(--vp-c-text-2); line-height: 1.8; }
.key { display: inline-block; padding: 0 6px; border: 1px solid var(--vp-c-divider); font-size: 12px; }
.key.thing { border-radius: 3px; border-width: 2px; }
.key.step { border-radius: 999px; color: var(--vp-c-brand-1); }
.key.elsewhere { border-radius: 999px; border-style: dashed; }
@media (max-width: 640px) {
  .part-flow .readout { min-height: 330px; }
  .card { min-width: 0; flex: 1 1 40%; }
}
</style>
