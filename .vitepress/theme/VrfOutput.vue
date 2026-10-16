<!-- Lesson 8.6: 𝒴 in three steps on a real block. Pick one of five blocks: its 96-byte
     entropy source with the output point marked, the 59 bytes SHA-512 hashes, the 64 it
     gives with the 32 kept, and η′₀ = H(η₀ ⌢ 𝒴) beside the trace's. Computed in
     vrf-output.ts. -->
<script setup lang="ts">
import { computed, ref } from "vue";
import { BLOCKS, STEPS, SUITE } from "./vrf-output.ts";

const k = ref(0);
const b = computed(() => BLOCKS[k.value]);
const s = computed(() => STEPS[k.value]);
const hx = (bytes: number[]) => bytes.map((x) => x.toString(16).padStart(2, "0")).join("");
const short = (bytes: number[]) => `0x${hx(bytes.slice(0, 4))}…`;
const theirs = computed(() => (k.value + 1 < BLOCKS.length ? BLOCKS[k.value + 1].eta0Before : null));
</script>

<template>
  <div class="widget vrf-output">
    <div class="readout" aria-live="polite">
      <div class="tile"><span class="tile-label">block {{ b.n }}, slot {{ b.slot }}, by validator {{ b.author }}</span><span class="tile-value">𝒴 {{ short(s.output) }}</span></div>
      <div class="tile"><span class="tile-label">η′₀ = H(η₀ ⌢ 𝒴)</span><span class="tile-value">{{ short(s.eta0) }}</span></div>
    </div>
    <div class="controls" role="group" aria-label="which block">
      <button v-for="(x, i) in BLOCKS" :key="x.n" class="small" :class="{ chosen: k === i }" :aria-pressed="k === i" @click="k = i">block {{ x.n }}</button>
    </div>
    <ol class="steps">
      <li>
        <p class="what"><b>1.</b> The header's entropy source, 96 bytes. Its first 32 are the <mark>output point</mark>; the rest prove it, and only lesson 8.9 checks them.</p>
        <code class="hex"><mark>{{ hx(s.signature.slice(0, 32)) }}</mark>{{ hx(s.signature.slice(32)) }}</code>
      </li>
      <li>
        <p class="what"><b>2.</b> SHA-512 of 59 bytes: the suite's name, 03, the point, 00. The 03 and 00 mark this hash as a VRF output, so it can't be mistaken for any other hash of the point.</p>
        <p class="input"><span class="seg name">"{{ SUITE }}" · 25</span><span class="seg tag">03</span><span class="seg pt">the point · 32</span><span class="seg tag">00</span></p>
        <code class="hex"><mark>{{ hx(s.hash.slice(0, 32)) }}</mark>{{ hx(s.hash.slice(32)) }}</code>
      </li>
      <li>
        <p class="what"><b>3.</b> Keep the first 32 bytes: that's 𝒴, randomness the author couldn't choose.</p>
        <code class="hex"><mark>{{ hx(s.output) }}</mark></code>
      </li>
      <li>
        <p class="what">Stir it in: η′₀ = H(η₀ ⌢ 𝒴), with η₀ {{ b.eta0Before.slice(0, 10) }}…</p>
        <code class="hex">{{ hx(s.eta0) }}</code>
        <p class="check" :class="{ ok: theirs === null || theirs === '0x' + hx(s.eta0) }">{{ theirs === null ? "the trace's next state holds this η₀ too" : theirs === "0x" + hx(s.eta0) ? "✓ the same as the η₀ in the trace's next state" : "✗ not the trace's" }}</p>
      </li>
    </ol>
    <p v-if="k === 1 || k === 2" class="note">Blocks 2 and 3 have the same entropy source: both by validator 3, whose VRF input is the same all through a fallback epoch. η₀ still moves on, because each new 𝒴 is hashed in with the η₀ before it.</p>
  </div>
</template>

<style scoped>
.tile .tile-value { font-size: 18px; min-width: 13ch; }
.controls { display: flex; flex-wrap: wrap; gap: 6px; margin: 4px 0 8px; }
.controls button.small { min-height: 32px; }
.steps { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
.steps li { padding: 6px 8px; border: 1px solid var(--vp-c-divider); border-radius: 4px; }
.what { margin: 0 0 4px; font-size: 13px; line-height: 1.5; }
.hex { display: block; font-size: 12px; line-height: 1.5; overflow-wrap: anywhere; word-break: break-all; color: var(--vp-c-text-3); background: none; padding: 0; }
.hex mark { background: var(--bit-top); color: var(--vp-c-text-1); border-radius: 2px; }
.what mark { background: var(--bit-top); color: var(--vp-c-text-1); border-radius: 2px; padding: 0 2px; }
.input { display: flex; flex-wrap: wrap; gap: 2px; margin: 0 0 4px; font-family: var(--vp-font-family-mono); font-size: 11px; }
.seg { padding: 2px 6px; border: 1px solid var(--vp-c-divider); border-radius: 3px; }
.seg.name { background: var(--vp-c-default-soft); }
.seg.tag { background: var(--bit-mark); }
.seg.pt { background: var(--bit-top); }
.check { margin: 4px 0 0; font-size: 13px; color: var(--changed-line); }
.check.ok { color: var(--vp-c-green-1); }
.note { margin: 8px 0 0; font-size: 13px; color: var(--vp-c-text-2); line-height: 1.5; min-height: 3em; }
</style>
