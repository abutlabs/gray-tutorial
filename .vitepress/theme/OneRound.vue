<!-- Lesson 17.1: one round. Pick a real vector and step: the accounts before, each service
     running from its own copy of them, then the round putting each service's own account
     together, with S(s) and a = 43. Data in one-round.ts. -->
<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { asText, SCENARIOS, SLOT, statistics } from "./one-round.ts";

const which = ref(0);
const step = ref(0);
watch(which, () => { step.value = 0; });
const sc = computed(() => SCENARIOS[which.value]);
const ran = (k: number) => step.value > k;
const done = computed(() => step.value > sc.value.services.length);
</script>

<template>
  <div class="widget one-round">
    <div class="readout" aria-live="polite">
      <div v-for="s in sc.services" :key="s.id" class="tile"><span class="tile-label">S({{ s.id }}) = (N, T, G)</span><span class="tile-value">{{ done ? `(${statistics(s).map((x) => x.toLocaleString("en-US")).join(", ")})` : "—" }}</span></div>
      <div v-if="sc.services.length === 1" class="tile"><span class="tile-label">its a, last accumulated</span><span class="tile-value">{{ done ? SLOT : 0 }}</span></div>
    </div>
    <p class="line">
      <template v-if="step === 0">{{ sc.says }}. Before the round, every account's storage is empty. Step: each service runs from this same start.</template>
      <template v-else-if="!done">Service {{ sc.services[step - 1].id }} runs on its own copy of the accounts: {{ sc.services[step - 1].hasCode ? `${sc.services[step - 1].gas.toLocaleString("en-US")} gas` : "no code, so nothing runs and no gas is used" }}{{ sc.services[step - 1].writes.length ? `, writing ${asText(sc.services[step - 1].writes[0][0])}` : "" }}. {{ step > 1 ? "Its copy never saw the other service's write." : "" }}</template>
      <template v-else>The round puts together each service's own account as its run left it. Every service that accumulated a digest or used gas gets its statistics, and a = {{ SLOT }}, the block's slot.</template>
    </p>
    <div class="controls">
      <button v-for="(s, k) in SCENARIOS" :key="s.name" class="small" :class="{ chosen: which === k }" :aria-pressed="which === k" @click="which = k">{{ s.name }}</button>
    </div>
    <div class="controls">
      <button class="small go" :disabled="done" @click="step++">{{ step < sc.services.length ? `run service ${sc.services[step].id}` : "put the round together" }} ▶</button>
      <button class="small" :disabled="step === 0" @click="step = 0">start again</button>
    </div>
    <div class="copies">
      <section v-for="(s, k) in sc.services" :key="s.id" class="copy" :class="{ ran: ran(k) }">
        <p class="head"><b>service {{ s.id }}'s run</b> <span class="muted">{{ s.digests }} digest{{ s.digests === 1 ? "" : "s" }}{{ s.free ? `, ${s.free.toLocaleString("en-US")} free gas` : "" }}{{ s.hasCode ? "" : ", no code" }}</span></p>
        <p v-for="o in sc.services" :key="o.id" class="acct mono">{{ o.id }}: {{ ran(k) && o.id === s.id && s.writes.length ? s.writes.map(([key, v]) => `${asText(key)} = ${v}`).join(", ") : "empty" }}</p>
        <p class="muted">{{ ran(k) ? (s.hasCode ? `${s.gas.toLocaleString("en-US")} gas used` : "nothing ran") : "not run yet" }}</p>
      </section>
    </div>
  </div>
</template>

<style scoped>
.tile .tile-value { min-width: 14ch; font-size: 17px; white-space: nowrap; }
.line { margin: 8px 0; font-size: 14px; line-height: 1.6; min-height: 4.8em; }
.controls { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin: 0 0 6px; }
.controls button.small { min-height: 32px; font-family: var(--vp-font-family-mono); font-size: 12px; }
.go { border-color: var(--vp-c-brand-1); color: var(--vp-c-brand-1); font-weight: 600; }
.muted { font-size: 12px; color: var(--vp-c-text-2); }
.copies { display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 8px; }
.copy { padding: 8px; border: 1px dashed var(--vp-c-divider); border-radius: 6px; }
.copy.ran { border-style: solid; border-color: var(--vp-c-brand-1); background: var(--vp-c-brand-soft); }
.head { margin: 0 0 4px; font-size: 14px; }
.acct { margin: 2px 0; font-size: 12px; overflow-wrap: anywhere; }
.mono { font-family: var(--vp-font-family-mono); }
</style>
