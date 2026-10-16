<!-- Lesson 3.3: the work_report vector as a receipt: the package's data, where and when, the
     permission, the imports' roots and what came out. Tap any part for what it's for, its
     value and where its bytes are; switch tiny and full and only erasure_shards changes.
     The models are in work-report.ts; Parcel.vue draws them. -->
<script setup lang="ts">
import { ref } from "vue";
import Parcel from "./Parcel.vue";
import { PARCELS, SIZES } from "./work-report.ts";

const which = ref(0);
const fmt = (n: number) => n.toLocaleString("en-US");
</script>

<template>
  <div class="work-report">
    <Parcel :parcel="PARCELS[which]">
      <template #controls>
        <div class="pick" role="group" aria-label="which vector">
          <button v-for="(s, k) in SIZES" :key="s.name" class="small" :class="{ chosen: which === k }" :aria-pressed="which === k" @click="which = k">{{ s.name }}: {{ fmt(s.validators) }} validators</button>
        </div>
      </template>
    </Parcel>
  </div>
</template>

<style scoped>
.pick { display: flex; flex-wrap: wrap; gap: 6px; margin: 8px 0 0; }
.pick button.small { min-height: 32px; font-family: var(--vp-font-family-mono); font-size: 13px; }
</style>
