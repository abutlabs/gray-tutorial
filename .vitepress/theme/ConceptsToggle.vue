<!-- The concepts-only switch, at the top of every lesson (concepts.ts). -->
<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRoute } from "vitepress";
import { conceptsOn, setConcepts, showInAddress } from "./concepts.ts";

const route = useRoute();
// lessons only: their addresses are a part's folder, then a numbered lesson
const isLesson = computed(() => /\/\d\d-[^/]+\/\d\d-/.test(route.path));
const on = ref(false);
onMounted(() => { on.value = conceptsOn(); showInAddress(on.value); });
// moving to another page drops the address's ?concepts: put it back, so any page can be shared folded
watch(() => route.path, () => showInAddress(conceptsOn()), { flush: "post" });

function toggle() {
  on.value = !on.value;
  setConcepts(on.value);
}
</script>

<template>
  <div v-if="isLesson" class="concepts-toggle">
    <button type="button" role="switch" :aria-checked="on" @click="toggle">
      <span class="track" :class="{ on }"><span class="knob" /></span>
      Concepts only
    </button>
    <span class="hint">{{ on ? "Code is folded: tap a snippet's label to open it. Copy the address to share it this way." : "Fold the code, and read the ideas first." }}</span>
  </div>
</template>

<style scoped>
.concepts-toggle {
  display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
  margin: 0 0 20px; font-size: 14px; color: var(--vp-c-text-2);
}
button {
  display: inline-flex; align-items: center; gap: 8px; min-height: 32px; padding: 2px 12px 2px 6px;
  border: 1px solid var(--vp-c-divider); border-radius: 16px; font-weight: 600; color: var(--vp-c-text-1);
}
button:hover { border-color: var(--vp-c-brand-1); }
.track {
  position: relative; width: 30px; height: 18px; border-radius: 9px;
  background: var(--vp-c-default-3); transition: background 0.2s;
}
.track.on { background: var(--vp-c-brand-1); }
.knob {
  position: absolute; top: 2px; left: 2px; width: 14px; height: 14px; border-radius: 50%;
  background: var(--vp-c-white); transition: left 0.2s;
}
.track.on .knob { left: 14px; }
</style>
