<!-- Lesson 3.2: the two tiny work_result vectors as summary cards, one job that succeeded
     and one that panicked: tap any part for what it's for, its value and where its bytes
     are. The models are in work-digest.ts; Parcel.vue draws them. -->
<script setup lang="ts">
import { ref } from "vue";
import Parcel from "./Parcel.vue";
import { DIGEST_NAMES, PARCELS } from "./work-digest.ts";

const which = ref(0);
const SAYS = ["the job that succeeded", "the job that panicked"];
</script>

<template>
  <div class="work-digest">
    <Parcel :parcel="PARCELS[which]">
      <template #controls>
        <div class="pick" role="group" aria-label="which digest">
          <button v-for="(name, k) in DIGEST_NAMES" :key="name" class="small" :class="{ chosen: which === k }" :aria-pressed="which === k" @click="which = k">{{ name }}: {{ SAYS[k] }}</button>
        </div>
      </template>
    </Parcel>
  </div>
</template>

<style scoped>
.pick { display: flex; flex-wrap: wrap; gap: 6px; margin: 8px 0 0; }
.pick button.small { min-height: 32px; font-family: var(--vp-font-family-mono); font-size: 13px; }
</style>
