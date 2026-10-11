import DefaultTheme from "vitepress/theme";
import type { Theme } from "vitepress";
import { onMounted } from "vue";
import { listenForKeys, revealActiveLesson } from "./keys.ts";
import "./custom.css";

export default {
  extends: DefaultTheme,
  enhanceApp({ router }) {
    if (typeof window === "undefined") return;
    listenForKeys();
    router.onAfterRouteChange = () => { revealActiveLesson(); };
  },
  setup() {
    onMounted(() => revealActiveLesson());
  },
} satisfies Theme;
