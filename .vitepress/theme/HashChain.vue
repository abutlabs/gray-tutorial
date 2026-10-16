<!-- Lesson 5.1: four real blocks held by their hashes. Each card shows its header's hash and
     the parent it names; a link holds when the parent is the hash before it. Pick a block,
     flip a bit of one of its fields, and watch its hash change and the link after it break,
     while the links before hold; flip its parent field and that link breaks too. Everything
     is encoded and hashed in hash-chain.ts. -->
<script setup lang="ts">
import { computed, ref } from "vue";
import { flip, hashOf, linkHolds, linksHolding, ORIGINAL, parentOf, short, SPOTS, type Block } from "./hash-chain.ts";

const chain = ref<Block[]>(ORIGINAL);
const picked = ref(2);
const block = computed(() => chain.value[picked.value - 1]);
const holding = computed(() => linksHolding(chain.value));
const hashes = computed(() => chain.value.map((b) => hashOf(b.bytes)));
const original = (n: number) => hashOf(ORIGINAL[n - 1].bytes);
const changed = (n: number) => chain.value[n - 1].flipped.length > 0;
const doFlip = (field: string) => { chain.value = flip(chain.value, picked.value, field); };
const reset = () => { chain.value = ORIGINAL; };
</script>

<template>
  <div class="widget hash-chain">
    <div class="readout" aria-live="polite">
      <div class="tile"><span class="tile-label">block {{ block.n }}, slot {{ block.slot }}</span><span class="tile-value">{{ block.bytes.length }} bytes</span></div>
      <div class="tile wide" :class="{ wrong: changed(block.n) }"><span class="tile-label">H(its header)</span><span class="tile-value bytes">{{ short(hashes[block.n - 1]) }}</span></div>
      <div class="tile wide"><span class="tile-label">was</span><span class="tile-value bytes">{{ short(original(block.n)) }}</span></div>
      <div class="tile" :class="{ wrong: holding < chain.length - 1 }"><span class="tile-label">links holding</span><span class="tile-value">{{ holding }} of {{ chain.length - 1 }}</span></div>
    </div>
    <p class="line">
      <template v-if="holding === chain.length - 1">Every block names the hash of the header before it as its parent, so the chain holds. Pick a block and flip one bit of a field.</template>
      <template v-else><span class="bug">One bit, a stranger.</span> {{ block.flipped.length ? `Block ${block.n}'s hash changed completely, so ` : "" }}every block whose parent named the old hash no longer matches, and a flipped parent field breaks the link before it as well.</template>
    </p>
    <ol class="blocks" aria-label="the first four blocks of the fallback trace">
      <template v-for="(b, i) in chain" :key="b.n">
        <li v-if="i > 0" class="link" :class="{ broken: !linkHolds(chain, i) }" aria-hidden="true">{{ linkHolds(chain, i) ? "⟵ holds" : "⟵ broken" }}</li>
        <li class="card" :class="{ on: b.n === picked, changed: changed(b.n) }">
          <button class="small pick" :aria-pressed="b.n === picked" @click="picked = b.n">block {{ b.n }} · slot {{ b.slot }}</button>
          <span class="row">parent <code class="bytes">{{ short(parentOf(b)) }}</code></span>
          <span class="row">hash <code class="bytes">{{ short(hashes[i]) }}</code></span>
        </li>
      </template>
    </ol>
    <div class="controls" role="group" :aria-label="`flip a bit of block ${picked}`">
      <button v-for="s in SPOTS" :key="s.field" class="small" @click="doFlip(s.field)">flip a bit of its {{ s.field }}</button>
      <button class="small" :disabled="holding === chain.length - 1" @click="reset">reset to the vectors</button>
    </div>
    <p class="legend">The fields: {{ SPOTS.map((s) => `${s.field}, ${s.says}`).join("; ") }}.</p>
  </div>
</template>

<style scoped>
.tile .tile-value { min-width: 7ch; }
.tile.wide .tile-value { min-width: 13ch; }
/* a changed hash, or a broken link, is a change nobody asked for: red (custom.css) */
.tile.wrong { background: var(--changed); border-color: var(--changed-line); }
.bug { color: var(--changed-line); font-weight: 600; }
.line { margin: 8px 0; font-size: 14px; line-height: 1.6; min-height: 4.8em; }
.blocks { list-style: none; padding: 0; margin: 0 0 10px; display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
.card { display: flex; flex-direction: column; gap: 4px; padding: 6px 8px; border: 1px solid var(--vp-c-divider); border-radius: 6px; background: var(--vp-c-bg-soft); font-size: 12px; }
.card.on { border-color: var(--vp-c-brand-1); border-width: 2px; }
.card.changed { background: var(--changed); }
.card .pick { min-height: 32px; }
.card .row { font-family: var(--vp-font-family-mono); white-space: nowrap; }
.link { font-size: 12px; color: var(--vp-c-text-2); white-space: nowrap; }
.link.broken { color: var(--changed-line); font-weight: 700; }
.controls { display: flex; flex-wrap: wrap; gap: 6px; }
.controls button.small { min-height: 32px; }
.legend { margin: 10px 0 0; font-size: 13px; color: var(--vp-c-text-2); line-height: 1.6; }
</style>
