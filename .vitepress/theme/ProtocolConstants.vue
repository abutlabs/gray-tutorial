<!-- Lesson 16.2: fetch's item 0, the 29 protocol constants in 122 bytes, as a parcel, tiny
     and full: switch and the nine that differ redraw. The models are in
     protocol-constants.ts; Parcel.vue draws them. -->
<script setup lang="ts">
import { ref } from "vue";
import Parcel from "./Parcel.vue";
import { PARCELS, SIZES } from "./protocol-constants.ts";

const which = ref(0);
</script>

<template>
  <div class="protocol-constants">
    <Parcel :parcel="PARCELS[which]">
      <template #controls>
        <div class="pick" role="group" aria-label="which size">
          <button v-for="(s, k) in SIZES" :key="s" class="small" :class="{ chosen: which === k }" :aria-pressed="which === k" @click="which = k">{{ s }}</button>
        </div>
      </template>
    </Parcel>
  </div>
</template>

<style scoped>
.pick { display: flex; flex-wrap: wrap; gap: 6px; margin: 8px 0 0; }
.pick button.small { min-height: 32px; font-family: var(--vp-font-family-mono); font-size: 13px; }
</style>
