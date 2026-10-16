<!-- Lesson 4.4: slide the validator count V from tiny's 6 to full's 1,023 and watch a
     verdict's vote count, ⌊2V/3⌋ + 1, and the compact bytes that count takes in front of
     the votes: one byte until 128 votes, two after. Computed in vote-count.ts. -->
<script setup lang="ts">
import { computed, ref } from "vue";
import { countBytes, dump, FULL_V, STEP, TINY_V, TWO_BYTES_FROM, twoThirds, votesFor } from "./vote-count.ts";

const v = ref(TINY_V);
const votes = computed(() => votesFor(v.value));
const bytes = computed(() => countBytes(v.value));
const fmt = (n: number) => n.toLocaleString("en-US");
</script>

<template>
  <div class="widget vote-count">
    <div class="readout" aria-live="polite">
      <div class="tile"><span class="tile-label">validators, V</span><span class="tile-value">{{ fmt(v) }}</span></div>
      <div class="tile"><span class="tile-label">⌊2V/3⌋</span><span class="tile-value">{{ fmt(twoThirds(v)) }}</span></div>
      <div class="tile"><span class="tile-label">votes, + 1</span><span class="tile-value">{{ fmt(votes) }}</span></div>
      <div class="tile"><span class="tile-label">the count in front</span><span class="tile-value bytes">{{ dump(bytes) }}</span></div>
    </div>
    <p class="line">
      A verdict carries two thirds of the validators, plus one: with {{ fmt(v) }}, that's {{ fmt(votes) }} votes.
      The votes list writes that count first, as a compact natural: {{ bytes.length === 1 ? "one byte" : "two bytes, from " + fmt(TWO_BYTES_FROM) + " validators up" }}.
      {{ v === TINY_V ? "That's tiny." : v === FULL_V ? "That's full: 683, the vector's 82 ab." : "" }}
    </p>
    <div class="controls">
      <label class="slider">V <input v-model.number="v" type="range" :min="TINY_V" :max="FULL_V" :step="STEP" aria-label="the validator count" /></label>
      <button class="small" :class="{ chosen: v === TINY_V }" :aria-pressed="v === TINY_V" @click="v = TINY_V">tiny: {{ TINY_V }}</button>
      <button class="small" :class="{ chosen: v === TWO_BYTES_FROM }" :aria-pressed="v === TWO_BYTES_FROM" @click="v = TWO_BYTES_FROM">two bytes: {{ TWO_BYTES_FROM }}</button>
      <button class="small" :class="{ chosen: v === FULL_V }" :aria-pressed="v === FULL_V" @click="v = FULL_V">full: {{ fmt(FULL_V) }}</button>
    </div>
  </div>
</template>

<style scoped>
.tile .tile-value { min-width: 6ch; }
.line { margin: 8px 0; font-size: 14px; line-height: 1.6; min-height: 4.8em; }
.controls { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.controls button.small { min-height: 32px; }
.slider { display: flex; align-items: center; gap: 8px; flex: 1 1 200px; font-size: 13px; color: var(--vp-c-text-2); }
.slider input { flex: 1; min-height: 32px; accent-color: var(--vp-c-brand-1); }
</style>
