// Concepts only: a reader who wants the Gray Paper's ideas first, the code later (on a phone,
// say), folds every code block away. A snippet keeps its label line, which a tap opens and
// closes; the byte tables and a run's output stay, since they show the concept. The choice
// is kept in the browser, and the <head> script in config.ts applies it before the page
// draws, so a folded page never flashes its code first.

export const KEY = "the-gray-tutor:concepts";
const CLASS = "concepts";

/** Whether the page is in concepts-only mode. */
export const conceptsOn = (): boolean => document.documentElement.classList.contains(CLASS);

/** Turns concepts-only mode on or off, and remembers it. */
export function setConcepts(on: boolean): void {
  document.documentElement.classList.toggle(CLASS, on);
  try {
    localStorage.setItem(KEY, on ? "on" : "off");
  } catch {} // no storage (a private window): it lasts until the page is closed
}

/** In concepts-only mode, a tap on a snippet's label shows or folds its code. */
export function listenForSnippetTaps(): void {
  document.addEventListener("click", (event) => {
    if (!conceptsOn()) return;
    const label = (event.target as Element).closest?.(".vp-doc p.snippet-label:not(.output)");
    if (!label) return;
    event.preventDefault(); // its links (the legend, the snippet's own anchor) wait for full mode
    label.classList.toggle("shown");
    label.setAttribute("aria-expanded", String(label.classList.contains("shown")));
  });
}
