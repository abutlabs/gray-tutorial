<!-- Lesson 16.7: an operand as a parcel: the kind, the report's parts and the digest's, over
     the bytes they become. The model is in operand-parcel.ts; Parcel.vue draws it. -->
<script setup lang="ts">
import Parcel from "./Parcel.vue";
import { OPERAND_PARCEL } from "./operand-parcel.ts";
</script>

<template>
  <Parcel :parcel="OPERAND_PARCEL" />
</template>
