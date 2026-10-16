<!-- Lesson 4.4: the tiny vector's disputes as a parcel: verdicts and their votes, culprits,
     faults. The model is in disputes-parcel.ts; Parcel.vue draws it. -->
<script setup lang="ts">
import Parcel from "./Parcel.vue";
import { DISPUTES } from "./disputes-parcel.ts";
</script>

<template>
  <Parcel :parcel="DISPUTES" />
</template>
