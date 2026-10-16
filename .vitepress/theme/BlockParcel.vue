<!-- Part 4's summary: the tiny test vector's block as a parcel, the header and the five
     extrinsic bags, every part tappable down to its bytes. The model is in block-parcel.ts;
     Parcel.vue draws it. -->
<script setup lang="ts">
import Parcel from "./Parcel.vue";
import { BLOCK_PARCEL } from "./block-parcel.ts";
</script>

<template>
  <Parcel :parcel="BLOCK_PARCEL" />
</template>
