<!-- Lesson 8.9: pick a block 46 to 50 and see the branch its seal is checked under, the
     context assembled, and each check in order; flip a forgery and see which fails first.
     A byte bar shows the 297-byte header, the 201 the seal signs and the 96 of the seal.
     The verdicts are the lesson's test's. Computed in seal-check.ts. -->
<script setup lang="ts">
import { computed, ref } from "vue";
import { BLOCKS, checks, FIELDS, FORGERIES, HEADER_BYTES, SEAL_BYTES, UNSIGNED_BYTES, verdict, type Forgery } from "./seal-check.ts";

const block = ref(BLOCKS[2]);
const forged = ref(new Set<Forgery>());
const list = computed(() => checks(block.value, forged.value));
const result = computed(() => verdict(block.value, forged.value));
const toggle = (f: Forgery) => { const s = new Set(forged.value); s.has(f) ? s.delete(f) : s.add(f); forged.value = s; };
</script>

<template>
  <div class="widget seal-check">
    <div class="readout" aria-live="polite">
      <div class="tile"><span class="tile-label">block {{ block.n }}, slot {{ block.slot }}</span><span class="tile-value">validator {{ block.author }}</span></div>
      <div class="tile"><span class="tile-label">γ′_S holds</span><span class="tile-value">{{ block.by === "ticket" ? "tickets" : "keys" }}</span></div>
      <div class="tile wide"><span class="tile-label">the seal is checked as</span><span class="tile-value">{{ block.by === "ticket" ? "a winning ticket's" : "a fallback key's" }}</span></div>
      <div class="tile" :class="{ wrong: result }"><span class="tile-label">verdict</span><span class="tile-value">{{ result ?? "checks out" }}</span></div>
    </div>
    <p class="line">
      <template v-if="!result">Seal and entropy source check out, as the run says for block {{ block.n }}. Try a forgery.</template>
      <template v-else-if="forged.has('source') && !forged.has('seal') && !forged.has('stranger')">The seal fails first: H_V sits before H_S in the header, inside ℰ_U(H), so the seal signs the entropy source too.</template>
      <template v-else-if="forged.has('stranger') && block.by === 'fallback'">No cryptography needed: the slot's key in γ′_S isn't the author's. The official fuzzer sent lasair just such a block.</template>
      <template v-else>The signature no longer matches what was signed: <code>bad_seal</code>.</template>
    </p>
    <div class="controls">
      <button v-for="b in BLOCKS" :key="b.n" class="small" :class="{ chosen: block === b }" :aria-pressed="block === b" @click="block = b">block {{ b.n }} · {{ b.by }}</button>
    </div>
    <div class="controls">
      <button v-for="f in FORGERIES" :key="f.id" class="small" :class="{ chosen: forged.has(f.id) }" :aria-pressed="forged.has(f.id)" @click="toggle(f.id)">{{ f.says }}</button>
      <button class="small" :disabled="!forged.size" @click="forged = new Set()">honest again</button>
    </div>
    <ol class="checks" aria-label="the checks, in order">
      <li v-for="c in list" :key="c.step" :class="{ fail: !c.ok }"><span class="mark">{{ c.ok ? "✓" : "✗" }}</span> {{ c.step }}<span v-if="c.context" class="ctx">context {{ c.context }}</span></li>
    </ol>
    <p class="row-says">the header's {{ HEADER_BYTES }} bytes: the seal signs the first {{ UNSIGNED_BYTES }}, and is the last {{ SEAL_BYTES }}</p>
    <div class="bar" aria-label="the header's fields, each as wide as its bytes">
      <span v-for="f in FIELDS" :key="f.name" class="seg" :class="{ seal: f.name === 'seal', source: f.name === 'entropy_source', flipped: (f.name === 'seal' && forged.has('seal')) || (f.name === 'entropy_source' && forged.has('source')) }" :style="{ flexGrow: Math.max(2, f.to - f.from) }" :title="`${f.name}: bytes ${f.from} to ${f.to - 1}`"><span>{{ f.to - f.from >= 32 ? f.name : "" }}</span></span>
    </div>
  </div>
</template>

<style scoped>
.tile .tile-value { min-width: 6ch; font-size: 16px; }
.tile.wide .tile-value { min-width: 14ch; }
/* a refusal is a change nobody asked for: red (custom.css) */
.tile.wrong { background: var(--changed); border-color: var(--changed-line); }
.line { margin: 8px 0; font-size: 14px; line-height: 1.6; min-height: 4.8em; }
.controls { display: flex; flex-wrap: wrap; gap: 6px; margin: 0 0 8px; }
.controls button.small { min-height: 32px; }
.checks { margin: 0 0 8px; padding-left: 20px; font-size: 13px; line-height: 1.7; }
.checks li.fail { color: var(--changed-line); font-weight: 600; }
.checks .mark { display: inline-block; width: 1.4em; }
.checks .ctx { display: block; font-weight: 400; color: var(--vp-c-text-2); font-family: var(--vp-font-family-mono); font-size: 12px; }
.row-says { margin: 8px 0 4px; font-size: 12px; color: var(--vp-c-text-2); }
.bar { display: flex; gap: 1px; }
.seg { flex: 1 1 0; min-width: 0; min-height: 28px; border: 1px solid var(--vp-c-divider); border-radius: 2px; background: var(--bit-top); font-size: 10px; overflow: hidden; }
.seg span { display: block; padding: 6px 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.seg.source { background: var(--bit-low); }
.seg.seal { background: var(--bit-mark); border-color: var(--bit-mark-line); }
.seg.flipped { background: var(--changed); border-color: var(--changed-line); }
</style>
