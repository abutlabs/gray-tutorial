<!-- A widget's sentence, its bits and bytes in their units' colours (units.ts, unitParts):
     "16 in 4 bytes: 00 00 00 10" shows the bytes teal, as the lessons' own code does. -->
<script setup lang="ts">
import { computed } from "vue";
import { unitParts, WHOLE } from "./units.ts";

const props = defineProps<{ text: string }>();
const parts = computed(() => unitParts(props.text));
</script>

<template><template v-for="(p, n) in parts" :key="n"><code v-if="p.unit" :class="[p.unit, { whole: p.text.length <= WHOLE }]">{{ p.text }}</code><template v-else>{{ p.text }}</template></template></template>
