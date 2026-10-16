<!-- Lesson 3.1: the tiny work_package vector as a parcel: a permission slip stapled to the
     front, a postmark saying how the chain looked, and the jobs inside. The model is in
     work-package.ts; Parcel.vue draws it. -->
<script setup lang="ts">
import Parcel from "./Parcel.vue";
import { PARCEL } from "./work-package.ts";
</script>

<template>
  <Parcel :parcel="PARCEL" />
</template>
