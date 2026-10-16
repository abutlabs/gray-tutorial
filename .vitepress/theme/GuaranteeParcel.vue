<!-- Lesson 4.3: the tiny vector's guarantee as a parcel: the report, the slot, the
     signatures. The model is in guarantee-parcel.ts; Parcel.vue draws it. -->
<script setup lang="ts">
import Parcel from "./Parcel.vue";
import { GUARANTEE } from "./guarantee-parcel.ts";
</script>

<template>
  <Parcel :parcel="GUARANTEE" />
</template>
