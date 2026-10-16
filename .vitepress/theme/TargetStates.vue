<!-- Lesson 20.2: the states a target keeps. Send messages in any order: the reply, the
     session's features, and the kept states, each by its header hash with how many blocks of
     ancestry it carries. Computed in target-states.ts. -->
<script setup lang="ts">
import { ref } from "vue";
import type { MessageId } from "./target-states.ts";
import { answer, MESSAGES, start } from "./target-states.ts";

const session = ref(start());
const reply = ref("");
const send = (id: MessageId) => { const r = answer(session.value, id); session.value = r.session; reply.value = r.reply; };
const reset = () => { session.value = start(); reply.value = ""; };
</script>

<template>
  <div class="widget target-states">
    <div class="readout" aria-live="polite">
      <div class="tile"><span class="tile-label">states kept</span><span class="tile-value">{{ session.kept.length }}</span></div>
      <div class="tile"><span class="tile-label">the session's features</span><span class="tile-value">{{ session.features ?? "—" }}</span></div>
      <div class="tile"><span class="tile-label">the connection</span><span class="tile-value">{{ session.closed ? "closed" : "open" }}</span></div>
    </div>
    <p class="line">{{ reply || "The fuzzer's messages, in any order. Start with PeerInfo, then Initialize." }}</p>
    <div class="controls">
      <button v-for="m in MESSAGES" :key="m.id" class="small" @click="send(m.id)">{{ m.label }}</button>
      <button class="small" @click="reset">a new session</button>
    </div>
    <p class="row-says">kept, under each block's header hash</p>
    <ul class="kept">
      <li v-for="k in session.kept" :key="k.hash" class="mono">{{ k.hash }}… {{ k.label }} · ancestry {{ k.ancestry }} block{{ k.ancestry === 1 ? "" : "s" }}</li>
      <li v-if="!session.kept.length" class="mono muted">nothing yet</li>
    </ul>
  </div>
</template>

<style scoped>
.target-states .readout { display: grid; grid-template-columns: repeat(auto-fit, minmax(110px, 1fr)); }
.tile .tile-value { font-size: 18px; white-space: nowrap; }
.line { margin: 8px 0; font-size: 14px; line-height: 1.6; min-height: 4.8em; overflow-wrap: anywhere; }
.controls { display: flex; flex-wrap: wrap; gap: 4px; margin: 0 0 6px; }
.controls button.small { min-height: 32px; font-size: 12px; }
.row-says { margin: 8px 0 2px; font-size: 12px; color: var(--vp-c-text-2); }
.kept { list-style: none; margin: 0; padding: 0; min-height: 4.5em; }
.mono { font-family: var(--vp-font-family-mono); font-size: 12px; margin: 2px 0; }
.muted { color: var(--vp-c-text-3); }
</style>
