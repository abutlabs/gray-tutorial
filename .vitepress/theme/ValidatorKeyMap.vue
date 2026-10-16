<!-- Lesson 6.3: κ, six validator keys of 336 bytes behind a count byte. Tap a validator and
     one of its four parts: where it sits in the key and in κ, what it's for, and the real
     key there. Swap Bandersnatch and Ed25519 in the record and watch every Ed25519 key read
     the wrong 32 bytes. Computed in validator-key.ts. -->
<script setup lang="ts">
import { computed, ref } from "vue";
import { KAPPA_BYTES, KEY_BYTES, keyStart, PARTS, rangeOf, readsAs, swapped, VALIDATOR_COUNT, type Part } from "./validator-key.ts";

const order = ref<Part[]>(PARTS);
const who = ref(0);
const part = ref<Part["name"]>("ed25519");
const isSwapped = computed(() => order.value[0].name !== PARTS[0].name);
const range = computed(() => rangeOf(order.value, part.value));
const inKappa = computed(() => ({ start: keyStart(who.value) + range.value.start, end: keyStart(who.value) + range.value.end }));
const reads = computed(() => readsAs(order.value, who.value, part.value));
const wrong = computed(() => isSwapped.value && (part.value === "bandersnatch" || part.value === "ed25519"));
const job = computed(() => PARTS.find((p) => p.name === part.value)!.job);
const fmt = (n: number) => n.toLocaleString("en-US");
</script>

<template>
  <div class="widget validator-key">
    <div class="readout" aria-live="polite">
      <div class="tile"><span class="tile-label">κ{{ who }}'s {{ part }}</span><span class="tile-value">bytes {{ range.start }}–{{ range.end - 1 }}</span></div>
      <div class="tile"><span class="tile-label">in κ's {{ fmt(KAPPA_BYTES) }}</span><span class="tile-value">{{ fmt(inKappa.start) }}–{{ fmt(inKappa.end - 1) }}</span></div>
      <div class="tile wide" :class="{ wrong }"><span class="tile-label">reads as</span><span class="tile-value bytes">{{ reads }}</span></div>
    </div>
    <p class="line">
      <template v-if="wrong"><span class="bug">The wrong key.</span> The record's field order is the byte order, so with the two swapped, <code>{{ part }}</code> reads the other key's 32 bytes, and every assurance checked with it fails.</template>
      <template v-else>{{ job }}. κ is a count byte, <code class="bytes">06</code>, then {{ VALIDATOR_COUNT }} keys of {{ KEY_BYTES }} bytes: 1 + {{ VALIDATOR_COUNT }} × {{ KEY_BYTES }} = {{ fmt(KAPPA_BYTES) }}; validator {{ who }}'s starts at byte {{ fmt(keyStart(who)) }}.</template>
    </p>
    <div class="controls" role="group" aria-label="which validator">
      <button v-for="i in VALIDATOR_COUNT" :key="i" class="small" :class="{ chosen: who === i - 1 }" :aria-pressed="who === i - 1" @click="who = i - 1">κ{{ i - 1 }}</button>
    </div>
    <div class="key" role="group" :aria-label="`validator ${who}'s 336 bytes, part by part`">
      <button v-for="p in order" :key="p.name" class="seg" :class="[p.name, { on: p.name === part }]" :style="{ flexGrow: p.width }" :aria-pressed="p.name === part" @click="part = p.name">
        <span class="n">{{ p.name }}</span><span class="w">{{ p.width }}</span>
      </button>
    </div>
    <div class="controls">
      <button class="small" :aria-pressed="isSwapped" @click="order = swapped(order)">{{ isSwapped ? "put the fields back" : "⇄ swap bandersnatch and ed25519 in the record" }}</button>
    </div>
  </div>
</template>

<style scoped>
.tile .tile-value { min-width: 9ch; font-size: 18px; }
.tile.wide .tile-value { min-width: 14ch; }
/* a key read from the wrong bytes is a change nobody asked for: red (custom.css) */
.tile.wrong { background: var(--changed); border-color: var(--changed-line); }
.bug { color: var(--changed-line); font-weight: 600; }
.line { margin: 8px 0; font-size: 14px; line-height: 1.6; min-height: 4.8em; }
.controls { display: flex; flex-wrap: wrap; gap: 6px; margin: 0 0 8px; }
.controls button.small { min-height: 32px; }
.key { display: flex; gap: 2px; margin: 0 0 8px; }
.seg { flex: 1 1 0; min-width: 0; min-height: 44px; padding: 2px; border: 1px solid var(--vp-c-divider); border-radius: 3px; font-size: 12px; color: var(--vp-c-text-1); cursor: pointer; opacity: 0.75; overflow: hidden; }
.seg span { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.seg .w { color: var(--vp-c-text-2); font-family: var(--vp-font-family-mono); }
.seg.on { opacity: 1; border: 2px solid var(--vp-c-brand-1); font-weight: 700; }
.bandersnatch { background: var(--bit-top); }
.ed25519 { background: var(--bit-low); }
.bls { background: var(--vp-c-brand-soft); }
.metadata { background: var(--vp-c-default-soft); }
</style>
