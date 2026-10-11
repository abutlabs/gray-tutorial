import DefaultTheme from "vitepress/theme";
import { useRoute, type Theme } from "vitepress";
import { onMounted, watch } from "vue";
import { listenForKeys, revealActiveLesson } from "./keys.ts";
import { listenForZoom, makePicturesFocusable } from "./zoom.ts";
import "./custom.css";

export default {
  extends: DefaultTheme,
  enhanceApp({ router }) {
    if (typeof window === "undefined") return;
    listenForKeys();
    listenForZoom();
    router.onAfterRouteChange = () => { revealActiveLesson(); };
  },
  setup() {
    const route = useRoute();
    onMounted(() => {
      revealActiveLesson();
      makePicturesFocusable();
    });
    // after each new page is in the DOM
    watch(() => route.path, makePicturesFocusable, { flush: "post" });
  },
} satisfies Theme;
