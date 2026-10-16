<!-- Lesson 2.4: one value under every integer codec at once. Type a number or pick one of
     the tests', and the table shows what ℰ₁, ℰ₂, ℰ₄, ℰ₈ and ℰ each make of it, greying a
     codec the number doesn't fit; tap a row to read it in the readout. Below, the same
     five bytes as a blob and as fixed bytes. Everything is computed in codec-picker.ts. -->
<script setup lang="ts">
import { computed, ref } from "vue";
import { asBlob, asFixedBytes, bytesUnder, CODECS, dump, FIVE, HASH_BYTES, limitOf, parse, PRESETS } from "./codec-picker.ts";

const typed = ref("16384");
const chosen = ref("natural");
const value = computed(() => parse(typed.value));
const rows = computed(() => CODECS.map((c) => ({ ...c, bytes: value.value === undefined ? null : bytesUnder(c.name, value.value) })));
const row = computed(() => rows.value.find((r) => r.name === chosen.value)!);
const pick = (x: bigint) => { typed.value = `${x}`; };
</script>

<template>
  <div class="widget codec-picker">
    <div class="readout" aria-live="polite">
      <div class="tile"><span class="tile-label">value</span><span class="tile-value">{{ value === undefined ? "?" : value.toLocaleString("en-US") }}</span></div>
      <div class="tile"><span class="tile-label">codec</span><span class="tile-value">{{ row.name }} · {{ row.rule }}</span></div>
      <div class="tile wide"><span class="tile-label">its bytes</span><span class="tile-value bytes">{{ dump(row.bytes) }}</span></div>
      <div class="tile"><span class="tile-label">how many</span><span class="tile-value">{{ row.bytes ? row.bytes.length : "–" }}</span></div>
    </div>
    <p class="line">
      <template v-if="value === undefined">Type a whole number: decimal, <code>0x…</code> or <code>0b…</code>.</template>
      <template v-else-if="row.bytes === null">{{ row.name }} holds up to {{ limitOf(row.name).toLocaleString("en-US") }}; {{ value.toLocaleString("en-US") }} doesn't fit, and the encoder must refuse it.</template>
      <template v-else>{{ row.says }}. The codec decides the bytes, not the value: the same {{ value.toLocaleString("en-US") }} is a different byte string under each row.</template>
    </p>
    <div class="controls">
      <label class="typed">value <input v-model="typed" type="text" inputmode="numeric" spellcheck="false" aria-label="a number to encode" /></label>
      <button v-for="p in PRESETS" :key="`${p}`" class="small" :class="{ chosen: value === p }" :aria-pressed="value === p" @click="pick(p)">{{ p.toLocaleString("en-US") }}</button>
    </div>
    <table class="codecs">
      <thead><tr><th>codec</th><th>rule</th><th>bytes</th><th class="n">how many</th></tr></thead>
      <tbody>
        <tr v-for="r in rows" :key="r.name" :class="{ chosen: r.name === chosen, none: r.bytes === null }" @click="chosen = r.name">
          <td><button class="small" :aria-pressed="r.name === chosen">{{ r.name }}</button></td>
          <td>{{ r.rule }}</td>
          <td><code v-if="r.bytes" class="bytes">{{ dump(r.bytes) }}</code><span v-else class="muted">doesn't fit</span></td>
          <td class="n">{{ r.bytes ? r.bytes.length : "–" }}</td>
        </tr>
      </tbody>
    </table>
    <p class="also">
      Bytes have two codecs too. The test's five bytes <code class="bytes">{{ dump(FIVE) }}</code> as a <b>blob</b> (↕, the length first):
      <code class="bytes">{{ dump(asBlob(FIVE)) }}</code>; as <b>fixedBytes(5)</b>, as they are: <code class="bytes">{{ dump(asFixedBytes(FIVE)) }}</code>.
      A <b>hash</b> is fixedBytes({{ HASH_BYTES }}): its {{ HASH_BYTES }} bytes and nothing else, since everyone knows the length.
    </p>
  </div>
</template>

<style scoped>
.tile .tile-value { min-width: 6ch; }
.tile.wide .tile-value { font-size: 16px; min-width: 24ch; }
.line { margin: 8px 0; font-size: 14px; line-height: 1.6; min-height: 3.2em; }
.controls { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin: 0 0 8px; }
.controls button.small { min-height: 32px; }
.typed { display: flex; align-items: center; gap: 6px; font-size: 13px; color: var(--vp-c-text-2); }
.typed input { width: 12ch; min-height: 32px; padding: 0 8px; border: 1px solid var(--vp-c-divider); border-radius: 4px; background: var(--vp-c-bg); color: var(--vp-c-text-1); font-family: var(--vp-font-family-mono); font-size: 14px; }
.codecs { margin: 0; font-size: 14px; }
.codecs th, .codecs td { padding: 4px 8px; }
.codecs td.n, .codecs th.n { text-align: right; }
.codecs tr { cursor: pointer; }
.codecs tr.chosen td { background: var(--vp-c-brand-soft); }
.codecs tr.none td { color: var(--vp-c-text-3); }
.codecs button.small { min-height: 32px; font-family: var(--vp-font-family-mono); }
.muted { color: var(--vp-c-text-3); font-style: italic; }
.also { margin: 12px 0 0; font-size: 14px; line-height: 1.7; }
@media (max-width: 640px) {
  .codecs th, .codecs td { padding: 4px; }
  .codecs { font-size: 13px; }
}
</style>
