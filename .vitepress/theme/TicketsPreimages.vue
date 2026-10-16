<!-- Lesson 4.1: the tiny vectors' tickets and preimages bags as parcels: a count, then each
     item, each item's fields. The models are in tickets-preimages.ts; Parcel.vue draws them. -->
<script setup lang="ts">
import { ref } from "vue";
import Parcel from "./Parcel.vue";
import { BAGS } from "./tickets-preimages.ts";

const which = ref(0);
</script>

<template>
  <div class="tickets-preimages">
    <Parcel :parcel="BAGS[which].parcel">
      <template #controls>
        <div class="pick" role="group" aria-label="which bag">
          <button v-for="(b, k) in BAGS" :key="b.name" class="small" :class="{ chosen: which === k }" :aria-pressed="which === k" @click="which = k">{{ b.name }}</button>
        </div>
      </template>
    </Parcel>
  </div>
</template>

<style scoped>
.pick { display: flex; flex-wrap: wrap; gap: 6px; margin: 8px 0 0; }
.pick button.small { min-height: 32px; font-family: var(--vp-font-family-mono); font-size: 13px; }
</style>
