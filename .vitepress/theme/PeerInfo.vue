<!-- Lesson 20.1: the README's PeerInfo as a parcel, byte by byte. Change the features or the
     name and the bytes redraw; below, the StateRoot example in its frame. The model is in
     peer-info.ts; Parcel.vue draws it. -->
<script setup lang="ts">
import { computed, ref } from "vue";
import Parcel from "./Parcel.vue";
import { featuresSay, frameOf, peerParcel, STATE_ROOT } from "./peer-info.ts";

const features = ref(2);
const name = ref("fuzzer");
const parcel = computed(() => peerParcel(features.value, name.value));
const hx = (b: number) => b.toString(16).padStart(2, "0");
</script>

<template>
  <div class="peer-info">
    <Parcel :parcel="parcel">
      <template #controls>
        <div class="pick">
          <span class="muted">features</span>
          <button v-for="f in [1, 2, 3]" :key="f" class="small" :class="{ chosen: features === f }" :aria-pressed="features === f" @click="features = f">{{ f }}: {{ featuresSay(f) }}</button>
          <span class="muted">name</span>
          <button v-for="n in ['fuzzer', 'the-gray-tutor']" :key="n" class="small" :class="{ chosen: name === n }" :aria-pressed="name === n" @click="name = n">"{{ n }}"</button>
        </div>
      </template>
    </Parcel>
    <div class="framed">
      <p class="row-says">and on the socket: the README's StateRoot message in its frame</p>
      <p class="hex"><mark class="len">{{ frameOf(STATE_ROOT).map(hx).join(" ") }}</mark> <mark class="kind">02</mark> {{ STATE_ROOT.slice(4, 20) }}…</p>
      <p class="note">The frame's 4 bytes, little end first, say 0x21 = 33: the kind byte, 02 for StateRoot, then the 32-byte root.</p>
    </div>
  </div>
</template>

<style scoped>
.pick { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin: 8px 0 0; }
.pick button.small { min-height: 32px; font-family: var(--vp-font-family-mono); font-size: 12px; }
.muted { font-size: 12px; color: var(--vp-c-text-2); }
.framed { margin: -8px 0 16px; padding: 10px 14px; border: 1px solid var(--vp-c-divider); border-top: none; border-radius: 0 0 8px 8px; }
.row-says { margin: 0 0 4px; font-size: 12px; color: var(--vp-c-text-2); }
.hex { margin: 0; font-family: var(--vp-font-family-mono); font-size: 13px; overflow-wrap: anywhere; }
mark.len { background: var(--bit-mark); color: var(--vp-c-text-1); border-radius: 2px; }
mark.kind { background: var(--bit-top); color: var(--vp-c-text-1); border-radius: 2px; }
.note { margin: 4px 0 0; font-size: 13px; color: var(--vp-c-text-2); }
</style>
