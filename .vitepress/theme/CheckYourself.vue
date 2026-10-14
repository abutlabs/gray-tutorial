<!-- A lesson's understanding check (checks.ts turns each `::: check` block into one). Tap an
     answer to see whether it's right and why; a wrong one can be followed by another try,
     and every option, right or wrong, keeps its reason on show once tapped. -->
<script setup lang="ts">
import { computed, ref } from "vue";

type Option = { text: string; right: boolean; why: string };
type Question = { question: string; options: Option[] };

const props = defineProps<{ data: string }>();
// built by checks.ts from the lesson's own Markdown: the text is the lesson's, rendered
const questions: Question[] = JSON.parse(decodeURIComponent(props.data));

// per question, the options tapped, in order
const tapped = ref<number[][]>(questions.map(() => []));

const solved = (q: number) => tapped.value[q].some((o) => questions[q].options[o].right);
const firstTry = (q: number) => tapped.value[q].length > 0 && questions[q].options[tapped.value[q][0]].right;
const answered = computed(() => questions.filter((_, q) => solved(q)).length);
const rightFirst = computed(() => questions.filter((_, q) => firstTry(q)).length);
const done = computed(() => answered.value === questions.length);

function tap(q: number, o: number) {
  if (tapped.value[q].includes(o)) return;
  tapped.value = tapped.value.map((list, i) => (i === q ? [...list, o] : list));
}
const again = () => { tapped.value = questions.map(() => []); };
</script>

<template>
  <div class="widget check-yourself">
    <div class="readout" aria-live="polite">
      <div class="tile"><span class="tile-label">answered</span><span class="tile-value">{{ answered }} / {{ questions.length }}</span></div>
      <div class="tile"><span class="tile-label">right first time</span><span class="tile-value">{{ rightFirst }} / {{ questions.length }}</span></div>
    </div>
    <p class="rule">Tap an answer. A wrong one says why, and you can try again.</p>
    <ol class="questions">
      <li v-for="(q, qi) in questions" :key="qi" class="question">
        <p class="ask" v-html="q.question"></p>
        <ul class="options">
          <li v-for="(o, oi) in q.options" :key="oi">
            <button
              type="button"
              class="option"
              :class="{ right: tapped[qi].includes(oi) && o.right, wrong: tapped[qi].includes(oi) && !o.right }"
              :aria-pressed="tapped[qi].includes(oi)"
              @click="tap(qi, oi)"
            >
              <span class="mark" aria-hidden="true">{{ tapped[qi].includes(oi) ? (o.right ? "✓" : "✗") : "" }}</span>
              <span v-html="o.text"></span>
            </button>
            <p v-if="tapped[qi].includes(oi)" class="why" :class="o.right ? 'right' : 'wrong'">
              <span class="sr-only">{{ o.right ? "Right." : "Not this one." }}</span>
              <span v-html="o.why"></span>
            </p>
          </li>
        </ul>
      </li>
    </ol>
    <p v-if="done" class="done">
      All {{ questions.length }} answered, {{ rightFirst }} right first time.
      <button type="button" class="small" @click="again">start again</button>
    </p>
  </div>
</template>

<style scoped>
.rule { margin: 0 0 8px; font-size: 14px; color: var(--vp-c-text-2); }
.questions { margin: 0; padding-left: 1.4em; }
.question { margin: 0 0 20px; }
.question:last-child { margin-bottom: 4px; }
.ask { margin: 0 0 8px; font-weight: 600; }
.options { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
.options li { margin: 0; }
.option {
  display: flex; gap: 8px; align-items: baseline; width: 100%; min-height: 44px; padding: 8px 12px;
  text-align: left; border: 1px solid var(--vp-c-divider); border-radius: 6px; background: var(--vp-c-bg);
  font-size: 15px; line-height: 1.45; color: var(--vp-c-text-1);
}
.option:hover { border-color: var(--vp-c-brand-1); }
.option.right { border-color: var(--vp-c-green-1); background: var(--vp-c-green-soft); }
.option.wrong { border-color: var(--vp-c-red-1); background: var(--vp-c-red-soft); }
.mark { flex: 0 0 1.2em; font-weight: 700; }
.option.right .mark { color: var(--vp-c-green-1); }
.option.wrong .mark { color: var(--vp-c-red-1); }
.why { margin: 4px 0 2px 12px; padding-left: 10px; font-size: 14px; line-height: 1.5; border-left: 3px solid; }
.why.right { border-color: var(--vp-c-green-1); }
.why.wrong { border-color: var(--vp-c-red-1); }
.done { margin: 8px 0 0; font-size: 14px; display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
.done button { min-height: 36px; }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
@media (max-width: 640px) {
  .questions { padding-left: 1.1em; }
  .option { font-size: 14px; }
}
</style>
