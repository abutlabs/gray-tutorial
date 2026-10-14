// The eye on a snippet's code block (config.ts, eyeButtons): a tap swaps the snippet for the
// whole file after it, its changed lines marked, and a tap on the whole file's eye swaps back.
// The whole file is fetched on the first tap (../whole.ts) and kept right after the snippet;
// a class on the snippet says which of the two shows.

const SHOWING = "showing-whole";

export function listenForEyeTaps(): void {
  document.addEventListener("click", async (event) => {
    const eye = (event.target as Element).closest?.<HTMLButtonElement>(".vp-doc button.eye");
    const block = eye?.parentElement;
    if (!eye || !block) return;
    const snippet = block.classList.contains("whole-file") ? block.previousElementSibling : block;
    if (!snippet) return;
    let whole = snippet.nextElementSibling;
    if (!whole?.classList.contains("whole-file")) {
      if (eye.dataset.loading) return; // a second tap while the first is fetching
      eye.dataset.loading = "yes";
      const loaded = await fetchWhole(eye.dataset.whole ?? "");
      delete eye.dataset.loading;
      if (!loaded) return;
      snippet.insertAdjacentHTML("afterend", loaded);
      whole = snippet.nextElementSibling!;
    }
    const showWhole = !snippet.classList.contains(SHOWING);
    snippet.classList.toggle(SHOWING, showWhole);
    const shown = showWhole ? whole : snippet;
    // the eye just tapped went with its block: keep the keyboard on the one now showing
    shown.querySelector<HTMLButtonElement>("button.eye")?.focus({ preventScroll: true });
    // the whole file opens where the snippet was: if its first changed line is off screen,
    // bring it to the middle, where the snippet's lines were being read
    const changed = showWhole ? whole.querySelector(".line.highlighted") : null;
    const at = changed?.getBoundingClientRect();
    if (changed && at && (at.top < 0 || at.bottom > window.innerHeight)) changed.scrollIntoView({ block: "center" });
  });
}

// the site's own file, as the build wrote it; offline or missing, the snippet just stays
async function fetchWhole(src: string): Promise<string | undefined> {
  try {
    const response = await fetch(src);
    const html = response.ok ? await response.text() : "";
    return html.startsWith("<div") ? html : undefined;
  } catch {
    return undefined;
  }
}
