<!-- The start page's slot player: press play and watch slots go by. Full: 341 cores, each its
     own colour, and 1,023 validators wearing the colour of the core they work; every 10 slots
     they all move on one core. Tiny: a real chain, the storage trace's 100 blocks, its two
     cores' reports arriving, waiting for assurances and becoming available. Computed in
     slot-player.ts. -->
<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { colour, FULL_FIRST, FULL_SLOTS, fullCoresAt, LANES, MOMENTS, NEEDED, TINY, TOTALS, type Event } from "./slot-player.ts";
import { NETWORKS } from "./network-map.ts";

const scene = ref<"full" | "tiny">("full");
const index = ref(0); // slots played, from the scene's first
const playing = ref(false);
const length = computed(() => (scene.value === "full" ? FULL_SLOTS : MOMENTS.length));
const SPEED = { full: 4, tiny: 1.5 }; // slots a second
let timer: ReturnType<typeof setInterval> | undefined;

function stop() { playing.value = false; if (timer) clearInterval(timer); timer = undefined; }
function play() {
  stop();
  playing.value = true;
  timer = setInterval(() => { index.value = (index.value + 1) % length.value; }, 1000 / SPEED[scene.value]);
}
const toggle = () => (playing.value ? stop() : play());
const step = () => { stop(); index.value = (index.value + 1) % length.value; };
watch(scene, () => { stop(); index.value = 0; });
onBeforeUnmount(stop);

// full
const full = NETWORKS.full;
const fullSlot = computed(() => FULL_FIRST + index.value);
const fullCores = computed(() => fullCoresAt(fullSlot.value));
const rotation = computed(() => Math.floor((fullSlot.value % full.E) / full.R));
const toNext = computed(() => full.R - (fullSlot.value % full.R));
/** Core 0, outlined, and its three validators: one core to follow through the shifting colours. */
const followed = computed(() => fullCores.value.flatMap((c, v) => (c === 0 ? [v] : [])));

// tiny
const moment = computed(() => MOMENTS[index.value]);
const waitedFor = (c: number) => {
  let n = 0;
  for (let i = index.value; i >= 0 && LANES[c][i] === "waiting"; i--) n++;
  return n;
};
const coreSays = (c: number) => {
  const m = moment.value, e = m.events[c], gone = m.left[c];
  if (e === "in") {
    // a report made in the rotation before is signed by that rotation's guarantors, who have moved on since
    const earlier = m.signers[c].some((v) => m.cores[v] !== c) ? ", made last rotation, before they moved on" : "";
    return `${gone ? `${gone === "available" ? "✓ available" : "✗ timed out"}, and ` : ""}a new report, signed by ${m.signers[c].join(", ")}${earlier}`;
  }
  if (e === "available") return `✓ available: ${m.assured[c].length} of 6 hold their shard`;
  if (e === "timed out") return "✗ timed out: too few assured in 5 slots";
  if (e === "waiting") return `waiting ${waitedFor(c)} slot${waitedFor(c) === 1 ? "" : "s"}: ${m.assured[c].length} of 6 assured, ${NEEDED} needed`;
  return "free: no report";
};
const SHOWN = 30; // slots in the lanes
const window_ = computed(() => {
  const end = index.value + 1, start = Math.max(0, end - SHOWN);
  return Array.from({ length: end - start }, (_, k) => start + k);
});
const MARK: Record<Event, string> = { idle: "", in: "", waiting: "", available: "✓", "timed out": "✗" };

// the drawing
const W = 340;
const fullLayout = { coreCols: 31, valCols: 33, coreCell: W / 31, valCell: W / 33, gap: 26 };
const cRow = (c: number) => Math.floor(c / fullLayout.coreCols), cCol = (c: number) => c % fullLayout.coreCols;
const vRow = (v: number) => Math.floor(v / fullLayout.valCols), vCol = (v: number) => v % fullLayout.valCols;
const valTop = 14 + 11 * fullLayout.coreCell + fullLayout.gap;
const fullHeight = valTop + 31 * fullLayout.valCell;
</script>

<template>
  <div class="widget slot-player">
    <div class="readout" aria-live="off">
      <template v-if="scene === 'full'">
        <div class="tile"><span class="tile-label">slot</span><span class="tile-value">{{ fullSlot }}</span></div>
        <div class="tile"><span class="tile-label">rotation</span><span class="tile-value">{{ rotation + 1 }} of {{ full.E / full.R }}</span></div>
        <div class="tile"><span class="tile-label">everyone moves on in</span><span class="tile-value">{{ toNext }} slot{{ toNext === 1 ? "" : "s" }}</span></div>
        <div class="tile"><span class="tile-label">core 0 (outlined) is worked by</span><span class="tile-value">{{ followed.join(", ") }}</span></div>
      </template>
      <template v-else>
        <div class="tile"><span class="tile-label">slot</span><span class="tile-value">{{ moment.slot }} of 100</span></div>
        <div v-for="c in TINY.cores" :key="c" class="tile wide" :style="{ borderColor: colour(c - 1) }"><span class="tile-label">core {{ c - 1 }}</span><span class="tile-value small">{{ coreSays(c - 1) }}</span></div>
      </template>
    </div>

    <div class="controls">
      <button class="small play" :aria-pressed="playing" @click="toggle">{{ playing ? "❚❚ pause" : "▶ play" }}</button>
      <button class="small" @click="step">next slot</button>
      <button class="small" :class="{ chosen: scene === 'full' }" :aria-pressed="scene === 'full'" @click="scene = 'full'">full: who works where</button>
      <button class="small" :class="{ chosen: scene === 'tiny' }" :aria-pressed="scene === 'tiny'" @click="scene = 'tiny'">tiny: a real chain's work</button>
    </div>

    <svg v-if="scene === 'full'" class="map" :viewBox="`0 0 ${W} ${fullHeight}`" role="img" :aria-label="`slot ${fullSlot}: 341 cores, each a colour, and 1,023 validators in the colour of the core they work`">
      <text class="label-text" x="0" y="10">341 cores</text>
      <rect v-for="c in full.cores" :key="`c${c}`" :x="cCol(c - 1) * fullLayout.coreCell + 0.5" :y="14 + cRow(c - 1) * fullLayout.coreCell + 0.5"
        :width="fullLayout.coreCell - 1" :height="fullLayout.coreCell - 1" :fill="colour(c - 1)" :class="{ followed: c === 1 }" />
      <text class="label-text" x="0" :y="valTop - 4">1,023 validators, in their core's colour</text>
      <rect v-for="v in full.validators" :key="`v${v}`" class="validator" :x="vCol(v - 1) * fullLayout.valCell + 0.5" :y="valTop + vRow(v - 1) * fullLayout.valCell + 0.5"
        :width="fullLayout.valCell - 1" :height="fullLayout.valCell - 1" rx="4" :fill="colour(fullCores[v - 1])" :class="{ followed: fullCores[v - 1] === 0 }" />
    </svg>

    <template v-else>
      <div class="tiny-cores">
        <div v-for="c in TINY.cores" :key="c" class="tiny-core" :class="[moment.events[c - 1], { left: moment.left[c - 1] }]" :style="{ background: colour(c - 1, 85), borderColor: colour(c - 1) }">
          <b>core {{ c - 1 }}</b>
          <span class="tag">{{ moment.events[c - 1] === "in" ? "report in" : moment.events[c - 1] === "idle" ? "free" : moment.events[c - 1] }}</span>
        </div>
      </div>
      <div class="tiny-validators">
        <div v-for="v in TINY.validators" :key="v" class="tiny-validator" :style="{ background: colour(moment.cores[v - 1]) }"
          :class="{ signed: moment.signers.some((s) => s.includes(v - 1)), assured: moment.assured.some((a) => a.includes(v - 1)) }">
          <b>v{{ v - 1 }}</b>
          <span class="tag">{{ moment.signers.some((s) => s.includes(v - 1)) ? "signs" : moment.assured.some((a) => a.includes(v - 1)) ? "assures" : "\u00a0" }}</span>
        </div>
      </div>
      <div class="lanes" aria-label="each core's last 30 slots">
        <div v-for="c in TINY.cores" :key="c" class="lane">
          <span class="lane-name">core {{ c - 1 }}</span>
          <span v-for="i in window_" :key="i" class="cell" :class="[LANES[c - 1][i], { now: i === index }]"
            :style="LANES[c - 1][i] === 'idle' ? {} : { background: colour(c - 1, LANES[c - 1][i] === 'in' ? 55 : 82) }">{{ MOMENTS[i].left[c - 1] ? MARK[MOMENTS[i].left[c - 1]!] : "" }}</span>
        </div>
      </div>
    </template>

    <p class="note">{{ scene === "full"
      ? "Each core has its own colour, and each validator wears the colour of the core it works: three per core, dealt with real randomness. Every 10 slots, a minute, every validator moves on to the next core and the colours shift; follow core 0's three, outlined. The official traces of real blocks are all tiny, so for the work itself, switch to tiny."
      : `The official storage trace, 100 real blocks on tiny: a solid cell is a report arriving, a pale one a report waiting for assurances, ✓ one that became available (5 of 6 assured) and ✗ one that timed out (5 slots). ${TOTALS.in} reports came in; ${TOTALS.available} became available and ${TOTALS.timedOut} timed out.` }}</p>
  </div>
</template>

<style scoped>
.slot-player .readout { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); }
.tile { min-width: 0; }
.tile.wide { grid-column: 1 / -1; border-width: 2px; border-style: solid; } /* a core's story, full width */
.tile .tile-value { font-size: 15px; white-space: normal; line-height: 1.35; min-height: 2.7em; }
.tile .tile-value.small { font-size: 13px; min-height: 4.05em; } /* a core's longest story: three lines, four on a phone */
@media (max-width: 640px) { .tile .tile-value.small { min-height: 5.4em; } }
.controls { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin: 8px 0; }
.controls button.small { min-height: 32px; }
.controls .play { min-width: 92px; font-weight: 700; }
.map { display: block; width: 100%; max-width: 440px; height: auto; margin: 4px 0 6px; }
.label-text { font-size: 9px; fill: var(--vp-c-text-2); }
.validator { transition: fill 0.5s; }
.followed { stroke: var(--vp-c-text-1); stroke-width: 2; }
.tiny-cores { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 6px 0; }
.tiny-core { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 64px; border: 2px solid; border-radius: 8px; transition: transform 0.2s; }
.tiny-core.in { transform: scale(1.03); box-shadow: 0 0 0 3px var(--vp-c-brand-soft); }
.tiny-core .tag { font-size: 12px; color: var(--vp-c-text-1); }
.tiny-validators { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 4px; margin: 0 0 8px; }
.tiny-validator { display: flex; flex-direction: column; align-items: center; min-height: 48px; padding: 4px 0; border-radius: 22px; color: #fff; border: 3px solid transparent; transition: background 0.5s; }
.tiny-validator.assured { border-color: var(--bit-low-line); }
.tiny-validator.signed { border-color: var(--vp-c-text-1); }
.tiny-validator .tag { font-size: 10px; min-height: 1.3em; } /* there or not, the same height */
.lanes { display: grid; gap: 3px; margin: 4px 0; }
.lane { display: flex; align-items: center; gap: 1px; }
.lane-name { flex: none; width: 48px; font-size: 11px; color: var(--vp-c-text-2); }
.cell { flex: 1 1 0; min-width: 0; height: 22px; display: flex; align-items: center; justify-content: center; background: var(--vp-c-bg-soft); font-size: 11px; font-weight: 700; }
.cell.now { outline: 2px solid var(--vp-c-text-1); outline-offset: -2px; }
.note { margin: 6px 0 0; font-size: 13px; color: var(--vp-c-text-2); line-height: 1.5; min-height: 6em; }
@media (prefers-reduced-motion: reduce) { .validator, .tiny-validator, .tiny-core { transition: none; } }
</style>
