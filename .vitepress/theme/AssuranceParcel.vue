<!-- Lesson 4.2: an assurance as a parcel, tiny and full: switch sizes and only the bitfield
     grows, 1 byte to 43. The models are in assurance-parcel.ts; Parcel.vue draws them. -->
<script setup lang="ts">
import { ref } from "vue";
import Parcel from "./Parcel.vue";
import { PARCELS, SIZES } from "./assurance-parcel.ts";

const which = ref(0);
</script>

<template>
  <div class="assurance-parcel">
    <Parcel :parcel="PARCELS[which]">
      <template #controls>
        <div class="pick" role="group" aria-label="which size">
          <button v-for="(s, k) in SIZES" :key="s.name" class="small" :class="{ chosen: which === k }" :aria-pressed="which === k" @click="which = k">{{ s.name }}: {{ s.cores.toLocaleString("en-US") }} cores</button>
        </div>
      </template>
    </Parcel>
  </div>
</template>

<style scoped>
.pick { display: flex; flex-wrap: wrap; gap: 6px; margin: 8px 0 0; }
.pick button.small { min-height: 32px; font-family: var(--vp-font-family-mono); font-size: 13px; }
</style>
