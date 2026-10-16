<!-- Lesson 8.2: the four validator sets as a slide puzzle. Tap "new epoch" and each row's
     right side becomes the row above's left; tap a validator in ι to make it an offender
     and watch it arrive in pending as 0000, in its old place. Computed in rotation.ts. -->
<script setup lang="ts">
import { computed, ref } from "vue";
import { BEFORE, FROM, LETTER, OFFENDERS, rotate, SET_NAMES, WHO, ZERO, type SetName } from "./rotation.ts";

const offenders = ref<string[]>(OFFENDERS);
const applied = ref(false);
const picked = ref<SetName>("pending");
const after = computed(() => rotate(BEFORE, offenders.value));
const zeroed = computed(() => after.value.pending.filter((k) => k === ZERO).length);
const toggle = (key: string) => { offenders.value = offenders.value.includes(key) ? offenders.value.filter((k) => k !== key) : [...offenders.value, key]; };
const isOffender = (key: string) => offenders.value.includes(key);
</script>

<template>
  <div class="widget rotation">
    <div class="readout" aria-live="polite">
      <div class="tile"><span class="tile-label">slot 45 → 48</span><span class="tile-value">a new epoch</span></div>
      <div class="tile"><span class="tile-label">{{ LETTER[picked] }}, {{ picked }}</span><span class="tile-value">{{ WHO[picked] }}</span></div>
      <div class="tile"><span class="tile-label">after the block, from</span><span class="tile-value">{{ applied ? FROM[picked] : "–" }}</span></div>
      <div class="tile" :class="{ wrong: applied && zeroed }"><span class="tile-label">keys zeroed in γ′_P</span><span class="tile-value">{{ applied ? zeroed : "–" }}</span></div>
    </div>
    <p class="line">
      <template v-if="!applied">Four sets, the same six validators in different orders. Mark an offender in ι if you like, then start the new epoch.</template>
      <template v-else>Each row's right side is the row above's left: ι slid into γ_P, γ_P into κ, κ into λ. ι itself stays. {{ zeroed ? `${zeroed === 1 ? "One offender" : zeroed + " offenders"} arrived in pending as ${ZERO}, keeping ${zeroed === 1 ? "its" : "their"} place but useless: nobody can sign with a zero key.` : "No offenders, so Φ changed nothing." }}</template>
    </p>
    <div class="controls">
      <button class="small go" :aria-pressed="applied" @click="applied = !applied">{{ applied ? "before the block" : "new epoch ▶" }}</button>
      <button class="small" :disabled="!offenders.length" @click="offenders = []">no offenders</button>
      <button class="small" :disabled="offenders.length === OFFENDERS.length && offenders.every((k) => OFFENDERS.includes(k))" @click="offenders = OFFENDERS">the vector's offender</button>
    </div>
    <table class="sets">
      <thead><tr><th></th><th>before</th><th>{{ applied ? "after" : "" }}</th></tr></thead>
      <tbody>
        <tr v-for="s in SET_NAMES" :key="s" :class="{ on: s === picked }" @click="picked = s">
          <td><button class="small name" :aria-pressed="s === picked">{{ LETTER[s] }} {{ s }}</button></td>
          <td class="keys">
            <template v-for="(k, i) in BEFORE[s]" :key="i">
              <button v-if="s === 'staging'" class="key" :class="{ offender: isOffender(k) }" :aria-pressed="isOffender(k)" :title="isOffender(k) ? 'an offender: tap to pardon' : 'tap to make an offender'" @click.stop="toggle(k)">{{ k }}</button>
              <span v-else class="key" :class="{ offender: isOffender(k) }">{{ k }}</span>
            </template>
          </td>
          <td class="keys">
            <template v-if="applied"><span v-for="(k, i) in after[s]" :key="i" class="key" :class="{ zero: k === ZERO, moved: s !== 'staging' }">{{ k }}</span></template>
          </td>
        </tr>
      </tbody>
    </table>
    <p class="legend">Each validator by the first four hex digits of its Ed25519 key. In ι, tap one to make it an offender.</p>
  </div>
</template>

<style scoped>
.tile .tile-value { min-width: 6ch; font-size: 15px; }
/* a zeroed key is a change nobody asked for: red (custom.css) */
.tile.wrong { background: var(--changed); border-color: var(--changed-line); }
.line { margin: 8px 0; font-size: 14px; line-height: 1.6; min-height: 4.8em; }
.controls { display: flex; flex-wrap: wrap; gap: 6px; margin: 0 0 8px; }
.controls button.small { min-height: 32px; }
.go { border-color: var(--vp-c-brand-1); color: var(--vp-c-brand-1); font-weight: 600; }
.sets { margin: 0; font-size: 13px; }
.sets th, .sets td { padding: 3px 6px; vertical-align: middle; }
.sets tr { cursor: pointer; }
.sets tr.on td { background: var(--vp-c-bg-soft); }
.name { min-height: 32px; white-space: nowrap; }
.keys { font-family: var(--vp-font-family-mono); white-space: nowrap; }
.key { display: inline-block; min-width: 3.2em; min-height: 32px; line-height: 30px; margin: 1px; padding: 0 4px; text-align: center; border: 1px solid var(--vp-c-divider); border-radius: 3px; background: var(--vp-c-bg); font: inherit; color: var(--vp-c-text-1); }
button.key { cursor: pointer; }
.key.offender { border-color: var(--changed-line); background: var(--changed); }
.key.zero { background: var(--changed); border-color: var(--changed-line); font-weight: 700; }
.key.moved { background: var(--vp-c-brand-soft); }
.legend { margin: 8px 0 0; font-size: 12px; color: var(--vp-c-text-2); }
@media (max-width: 640px) {
  .sets { display: block; overflow-x: auto; }
  .key { min-width: 2.8em; font-size: 11px; }
}
</style>
