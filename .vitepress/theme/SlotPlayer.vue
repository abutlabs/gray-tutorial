<!-- JAM at a glance's slot player: a real JAM chain in slow motion, the storage trace's 100
     tiny blocks. Two cores are two workbenches; six validators sit three to a bench and walk
     to the other one every 4 slots; a report lands on a bench, collects "I hold my piece"
     from the validators, and is accepted once 5 of 6 have said so. Computed in
     slot-player.ts. -->
<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from "vue";
import { colour, MOMENTS, NEEDED, TINY, TOTALS, story, waitingSince } from "./slot-player.ts";

const index = ref(0);
const playing = ref(false);
let timer: ReturnType<typeof setInterval> | undefined;
function stop() { playing.value = false; if (timer) clearInterval(timer); timer = undefined; }
function play() {
  stop();
  playing.value = true;
  timer = setInterval(() => { index.value = (index.value + 1) % MOMENTS.length; }, 1800);
}
const toggle = () => (playing.value ? stop() : play());
const next = () => { stop(); index.value = (index.value + 1) % MOMENTS.length; };
const restart = () => { stop(); index.value = 0; };
onBeforeUnmount(stop);

const m = computed(() => MOMENTS[index.value]);
const toRotation = computed(() => 4 - (m.value.slot % 4));
const onChain = computed(() => MOMENTS.slice(0, index.value + 1).reduce((n, x) => n + x.left.filter((e) => e === "available").length, 0));

/** Where validator v sits: its bench (core), and its place among the bench's three. */
const seat = (v: number) => {
  const core = m.value.cores[v];
  const k = m.value.cores.flatMap((c, w) => (c === core ? [w] : [])).indexOf(v);
  return { left: `calc(${core * 50 + ((k + 0.5) * 50) / 3}% - 22px)` };
};
const signed = (v: number) => m.value.signers.some((s) => s.includes(v));
const assured = (v: number) => m.value.assured.some((a) => a.includes(v));
const pending = (c: number) => waitingSince(index.value, c);
/** How many hold the report on bench c: a report that just arrived has no assurances yet;
 *  this block's went to the one it replaced. */
const held = (c: number) => (m.value.events[c] === "in" ? 0 : m.value.assured[c].length);
/** What became of the report a new one replaced, if any. */
const before = (c: number) => (m.value.events[c] !== "in" || !m.value.left[c] ? "" : m.value.left[c] === "available" ? `last one ✓ accepted (${m.value.assured[c].length} of 6)` : "last one ✗ timed out");
const CHAIN = 10; // blocks shown
const chain = computed(() => MOMENTS.slice(Math.max(0, index.value - CHAIN + 1), index.value + 1));
</script>

<template>
  <div class="widget slot-player">
    <div class="readout" aria-live="off">
      <div class="tile"><span class="tile-label">slot (6 seconds each)</span><span class="tile-value">{{ m.slot }} of 100</span></div>
      <div class="tile"><span class="tile-label">validators switch benches in</span><span class="tile-value">{{ toRotation }} slot{{ toRotation === 1 ? "" : "s" }}</span></div>
      <div class="tile"><span class="tile-label">reports accepted</span><span class="tile-value">{{ onChain }}</span></div>
    </div>
    <p class="line">{{ story(index) }}</p>

    <div class="controls">
      <button class="small play" :aria-pressed="playing" @click="toggle">{{ playing ? "❚❚ pause" : "▶ play" }}</button>
      <button class="small" @click="next">next slot</button>
      <button class="small" @click="restart">start again</button>
    </div>

    <div class="stage" aria-hidden="true">
      <div v-for="c in TINY.cores" :key="c" class="bench" :style="{ left: `${(c - 1) * 50}%`, borderColor: colour(c - 1), background: colour(c - 1, 92) }">
        <span class="bench-name" :style="{ color: colour(c - 1, 35) }">core {{ c - 1 }}</span>
        <div v-if="pending(c - 1) !== null || m.left[c - 1]" class="report" :class="{ done: m.left[c - 1] === 'available' && m.events[c - 1] !== 'in', out: m.left[c - 1] === 'timed out' && m.events[c - 1] !== 'in', fresh: m.events[c - 1] === 'in' }" :style="{ borderColor: colour(c - 1) }">
          <span class="report-title">{{ m.events[c - 1] === "in" ? "new report" : m.left[c - 1] === "available" ? "✓ accepted" : m.left[c - 1] === "timed out" ? "✗ timed out" : "report" }}</span>
          <span class="pips"><span v-for="k in TINY.validators" :key="k" class="pip" :class="{ on: k <= held(c - 1) }" :style="k <= held(c - 1) ? { background: colour(c - 1) } : {}" /></span>
          <span class="pip-say">{{ held(c - 1) }} of 6 hold its pieces{{ m.events[c - 1] === "in" ? " so far" : "" }}</span>
          <span class="pip-say before">{{ before(c - 1) || "\u00a0" }}</span>
        </div>
        <span v-else class="idle">free</span>
      </div>
      <div v-for="v in TINY.validators" :key="v" class="validator" :class="{ signed: signed(v - 1), assured: assured(v - 1) }" :style="{ ...seat(v - 1), background: colour(m.cores[v - 1]) }">
        <b>v{{ v - 1 }}</b>
        <span class="did">{{ signed(v - 1) ? "made it" : assured(v - 1) ? "holds" : "" }}</span>
      </div>
    </div>

    <div class="chain" aria-label="the chain's last blocks">
      <span class="chain-name">blocks</span>
      <div v-for="b in chain" :key="b.slot" class="block" :class="{ now: b.slot === m.slot }">
        <span class="block-slot">{{ b.slot }}</span>
        <span class="block-dots"><span v-for="c in TINY.cores" :key="c" class="dot" :style="b.left[c - 1] === 'available' ? { background: colour(c - 1) } : {}" /></span>
      </div>
    </div>

    <p class="note">A real chain: the official storage trace's 100 blocks, on tiny, JAM's small configuration (6 validators, 2 cores). A report needs {{ NEEDED }} of 6 validators to say they hold its pieces, in one block, to be accepted and its results to go into the chain; after 5 slots without, it times out. Each block below shows a dot for a report it accepted. In these 100 slots {{ TOTALS.in }} reports came in, {{ TOTALS.available }} were accepted and {{ TOTALS.timedOut }} timed out.</p>
  </div>
</template>

<style scoped>
.slot-player .readout { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); }
.tile { min-width: 0; }
.tile .tile-value { font-size: 15px; white-space: normal; }
/* room for the longest slot's story, so nothing below jumps as it plays */
.line { margin: 8px 0; font-size: 14px; line-height: 1.6; min-height: 6.4em; }
@media (max-width: 640px) { .line { min-height: 12.8em; } }
.controls { display: flex; flex-wrap: wrap; gap: 6px; margin: 0 0 10px; }
.controls button.small { min-height: 32px; }
.controls .play { min-width: 92px; font-weight: 700; }
.stage { position: relative; height: 244px; margin: 0 0 8px; }
.bench { position: absolute; top: 0; width: calc(50% - 4px); height: 162px; border: 2px solid; border-radius: 10px; display: flex; flex-direction: column; align-items: center; padding: 6px; box-sizing: border-box; }
.bench-name { font-weight: 700; font-size: 14px; }
.idle { margin-top: 22px; font-size: 13px; color: var(--vp-c-text-3); }
.report { margin-top: 6px; display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 6px 8px; border: 2px solid; border-radius: 6px; background: var(--vp-c-bg); max-width: 100%; box-sizing: border-box; transition: transform 0.3s, opacity 0.3s; }
.report.fresh { transform: scale(1.06); }
.report.done { opacity: 0.75; }
.report.out { opacity: 0.45; }
.report-title { font-size: 12px; font-weight: 700; }
.pips { display: flex; gap: 3px; }
.pip { width: 10px; height: 10px; border-radius: 50%; border: 1px solid var(--vp-c-divider); background: var(--vp-c-bg-soft); }
.pip-say { font-size: 11px; color: var(--vp-c-text-2); text-align: center; }
.pip-say.before { font-size: 10px; }
.validator { position: absolute; top: 176px; width: 44px; height: 60px; border-radius: 22px; color: #fff; display: flex; flex-direction: column; align-items: center; justify-content: center; border: 3px solid transparent; box-sizing: border-box; transition: left 0.9s ease-in-out, background 0.9s; }
.validator b { font-size: 13px; }
.validator .did { font-size: 9px; min-height: 1.2em; }
.validator.assured { border-color: var(--vp-c-bg); box-shadow: 0 0 0 2px var(--vp-c-text-2); }
.validator.signed { border-color: var(--vp-c-text-1); }
.chain { display: flex; align-items: center; gap: 4px; overflow: hidden; }
.chain-name { flex: none; font-size: 12px; color: var(--vp-c-text-2); margin-right: 2px; }
.block { flex: 0 0 auto; width: 30px; height: 34px; border: 1px solid var(--vp-c-divider); border-radius: 4px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; }
.block.now { border: 2px solid var(--vp-c-text-1); }
.block-slot { font-size: 10px; color: var(--vp-c-text-2); }
.block-dots { display: flex; gap: 2px; }
.dot { width: 8px; height: 8px; border-radius: 50%; background: var(--vp-c-bg-soft); }
.note { margin: 8px 0 0; font-size: 13px; color: var(--vp-c-text-2); line-height: 1.5; }
/* a phone's half is narrow: the report's words wrap, so the bench grows */
@media (max-width: 640px) {
  .bench { height: 204px; }
  .stage { height: 286px; }
  .validator { top: 218px; }
  .report { padding: 4px; }
}
@media (prefers-reduced-motion: reduce) { .validator, .report { transition: none; } }
</style>
