<!-- Lesson 19.3: where a service keeps an entry. Pick the kind and the service: the marker
     put in front, what gets hashed, and the 31-byte key with the owner's id lit at bytes 0,
     2, 4, 6. For a request, its value: the history as a count and 4-byte slots. Computed in
     entry-key.ts. -->
<script setup lang="ts">
import { computed, ref } from "vue";
import type { Kind } from "./entry-key.ts";
import { historyBytes, hx, keyOf, KEYS, markedOf, MARKER } from "./entry-key.ts";

const kind = ref<Kind>("storage");
const s = ref(0);
const history = ref([5, 9]);
const L = 8;
const key = computed(() => keyOf(kind.value, s.value, L));
const marked = computed(() => markedOf(kind.value, L));
const marker = computed(() => MARKER[kind.value](L));
const KINDS: Kind[] = ["storage", "preimage", "request"];
const HISTORIES = [[], [5], [5, 9], [5, 9, 50]];
</script>

<template>
  <div class="widget entry-key">
    <div class="readout" aria-live="polite">
      <div class="tile"><span class="tile-label">the marker, ℰ₄</span><span class="tile-value small">{{ marker === 2 ** 32 - 1 ? "2^32 − 1" : marker === 2 ** 32 - 2 ? "2^32 − 2" : `l = ${marker}` }}</span></div>
      <div class="tile wide"><span class="tile-label">the key's first bytes</span><span class="tile-value small">{{ key.slice(0, 8).map((c) => hx(c.byte)).join(" ") }} …</span></div>
    </div>
    <p class="line">C(s, ℰ₄(marker) ⌢ {{ kind === "storage" ? "k" : "h" }}): the marker says the kind, so a storage key and a hash with the same bytes can't land together. Both are hashed; service {{ s }}'s id is woven into bytes 0, 2, 4 and 6.</p>
    <div class="controls">
      <button v-for="k in KINDS" :key="k" class="small" :class="{ chosen: kind === k }" :aria-pressed="kind === k" @click="kind = k">{{ k }}</button>
      <span class="muted">service</span>
      <button v-for="x in [0, 7]" :key="x" class="small" :class="{ chosen: s === x }" :aria-pressed="s === x" @click="s = x">{{ x }}</button>
    </div>
    <p class="row-says">what gets hashed: the marker's 4 bytes, then {{ KEYS[kind].label }}{{ kind === "request" ? `, l = ${L}` : "" }}</p>
    <p class="hex"><mark>{{ marked.slice(0, 4).map(hx).join(" ") }}</mark> {{ marked.slice(4, 12).map(hx).join(" ") }}{{ marked.length > 12 ? " …" : "" }}</p>
    <p class="row-says">the state key, 31 bytes</p>
    <div class="key"><span v-for="(c, k) in key" :key="k" class="b" :class="c.from.kind">{{ hx(c.byte) }}</span></div>
    <template v-if="kind === 'request'">
      <p class="row-says">its value, the history: how many slots, then each in 4 bytes</p>
      <div class="controls"><button v-for="h in HISTORIES" :key="h.join()" class="small" :class="{ chosen: history.join() === h.join() }" @click="history = h">[{{ h.join(", ") }}]</button></div>
      <p class="hex">{{ historyBytes(history).map(hx).join(" ") }}</p>
    </template>
  </div>
</template>

<style scoped>
.entry-key .readout { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); }
.tile .tile-value.small { font-size: 15px; white-space: nowrap; }
.line { margin: 8px 0; font-size: 14px; line-height: 1.6; min-height: 4.8em; }
.controls { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin: 0 0 6px; }
.controls button.small { min-height: 32px; }
.muted { font-size: 12px; color: var(--vp-c-text-2); }
.row-says { margin: 8px 0 2px; font-size: 12px; color: var(--vp-c-text-2); }
.hex { margin: 0; font-family: var(--vp-font-family-mono); font-size: 13px; overflow-wrap: anywhere; }
.hex mark { background: var(--bit-mark); color: var(--vp-c-text-1); border-radius: 2px; }
.key { display: flex; flex-wrap: wrap; gap: 2px; font-family: var(--vp-font-family-mono); font-size: 12px; }
.b { padding: 2px 3px; border: 1px solid var(--vp-c-divider); border-radius: 2px; }
.b.n { background: var(--bit-top); font-weight: 700; }
.b.a { background: var(--vp-c-bg-soft); }
</style>
