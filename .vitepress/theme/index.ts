import DefaultTheme from "vitepress/theme";
import { useRoute, type Theme } from "vitepress";
import { onMounted, watch } from "vue";
import { listenForKeys, revealActiveLesson } from "./keys.ts";
import { listenForZoom, makePicturesFocusable } from "./zoom.ts";
import { listenForResize, placeSideArrows } from "./side-arrows.ts";
import { reloadOnStaleBuild } from "./stale.ts";
import BitPlaces from "./BitPlaces.vue";
import CompactNatural from "./CompactNatural.vue";
import TwoBytes from "./TwoBytes.vue";
import HexByte from "./HexByte.vue";
import FixedWidth from "./FixedWidth.vue";
import CoreBitfield from "./CoreBitfield.vue";
import AssuranceGrid from "./AssuranceGrid.vue";
import "./custom.css";

export default {
  extends: DefaultTheme,
  enhanceApp({ app, router }) {
    // the lessons' widgets, placed in a lesson as <HexByte /> and so on (WRITING.md, Interactive)
    app.component("HexByte", HexByte); // 1.1
    app.component("FixedWidth", FixedWidth); // 2.1
    app.component("BitPlaces", BitPlaces); // 2.2
    app.component("TwoBytes", TwoBytes); // 2.2
    app.component("CompactNatural", CompactNatural); // 2.2
    app.component("CoreBitfield", CoreBitfield); // 4.2
    app.component("AssuranceGrid", AssuranceGrid); // 11.1
    if (typeof window === "undefined") return;
    reloadOnStaleBuild();
    listenForKeys();
    listenForZoom();
    listenForResize();
    router.onAfterRouteChange = () => { revealActiveLesson(); };
  },
  setup() {
    const route = useRoute();
    onMounted(() => {
      revealActiveLesson();
      makePicturesFocusable();
      placeSideArrows();
    });
    // after each new page is in the DOM
    watch(() => route.path, () => {
      makePicturesFocusable();
      placeSideArrows();
    }, { flush: "post" });
  },
} satisfies Theme;
