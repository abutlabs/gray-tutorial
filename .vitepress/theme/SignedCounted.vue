<!-- Lesson 12.2: the reporters. Two real guarantees, three signatures each, every one checked
     against its signer's key; 𝐆 gathers the signers' keys once each. Make a signer an
     offender and its key becomes zeros, so its genuine signature no longer checks. Computed
     in signed-counted.ts. -->
<script setup lang="ts">
import { computed, ref } from "vue";
import { checked, KEYS, reporters } from "./signed-counted.ts";

const offenders = ref(new Set<number>());
const toggle = (v: number) => { const next = new Set(offenders.value); if (!next.delete(v)) next.add(v); offenders.value = next; };
const out = computed(() => checked(offenders.value));
const all = computed(() => out.value.flatMap((g) => g.signatures));
const real = computed(() => all.value.filter((s) => s.ok).length);
const accepted = computed(() => real.value === all.value.length);
const G = computed(() => reporters(all.value.map((s) => s.key)));
const VALIDATORS = Object.keys(KEYS).map(Number);
const short = (k: string) => `${k.slice(0, 10)}…`;
</script>

<template>
  <div class="widget signed-counted">
    <div class="readout" aria-live="polite">
      <div class="tile"><span class="tile-label">signatures that check</span><span class="tile-value">{{ real }} of {{ all.length }}</span></div>
      <div class="tile"><span class="tile-label">𝐆, the reporters</span><span class="tile-value">{{ accepted ? `${G.length} keys` : "—" }}</span></div>
      <div class="tile" :class="{ bad: !accepted }"><span class="tile-label">the block</span><span class="tile-value">{{ accepted ? "accepted" : "refused" }}</span></div>
    </div>
    <p class="line">
      <template v-if="accepted">Every signature is its signer's Ed25519 signature on "jam_guarantee" ⌢ H(the report). Six signatures, but the same three validators signed both guarantees, so 𝐆 holds 3 keys: a set counts each once.</template>
      <template v-else>An offender's key is all zeros after Φ, so even its genuine signature can't check out. One bad signature and the whole block is refused: banned means banned.</template>
    </p>
    <div class="controls">
      <span class="muted">make an offender:</span>
      <button v-for="v in VALIDATORS" :key="v" class="small" :class="{ chosen: offenders.has(v) }" :aria-pressed="offenders.has(v)" @click="toggle(v)">validator {{ v }}</button>
    </div>
    <div class="guarantees">
      <section v-for="g in out" :key="g.core" class="guarantee">
        <p class="head"><b>core {{ g.core }}'s guarantee</b> <span class="muted">signed at slot {{ g.slot }}</span></p>
        <p v-for="s in g.signatures" :key="s.validator" class="sig" :class="{ ok: s.ok }">
          <span>v{{ s.validator }}</span><span class="mono">{{ short(s.key) }}</span><span>{{ s.ok ? "✓ checks" : "✗ fails" }}</span>
        </p>
      </section>
    </div>
    <p class="row-says">𝐆: the signers' keys, each once, sorted</p>
    <ul class="set">
      <li v-for="k in G" :key="k" class="mono">{{ accepted ? k.slice(0, 22) + "…" : "—" }}</li>
    </ul>
  </div>
</template>

<style scoped>
.tile .tile-value { min-width: 8ch; font-size: 20px; }
.tile.bad { border-color: var(--changed-line); background: var(--changed); }
.line { margin: 8px 0; font-size: 14px; line-height: 1.6; min-height: 4.8em; }
.controls { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin: 0 0 8px; }
.controls button.small { min-height: 32px; }
.muted { font-size: 12px; color: var(--vp-c-text-2); }
.guarantees { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 8px; }
.guarantee { padding: 8px; border: 1px solid var(--vp-c-divider); border-radius: 6px; background: var(--vp-c-bg-soft); }
.head { margin: 0 0 4px; font-size: 14px; }
.sig { display: grid; grid-template-columns: 2.5em 1fr auto; gap: 6px; margin: 2px 0; padding: 3px 6px; border-radius: 4px; font-size: 13px; background: var(--changed); color: var(--changed-line); }
.sig.ok { background: var(--bit-low); color: var(--vp-c-text-1); }
.mono { font-family: var(--vp-font-family-mono); }
.row-says { margin: 10px 0 4px; font-size: 12px; color: var(--vp-c-text-2); }
.set { margin: 0; padding-left: 1.2em; font-size: 13px; min-height: 4.5em; }
</style>
