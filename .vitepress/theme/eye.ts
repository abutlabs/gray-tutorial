// An Add to / Replace in step on the page (../whole.ts): the whole file, its step's lines
// highlighted, then the snippet alone, hidden. The eye swaps one for the other; a fold's bar,
// "⋯ 42 unchanged lines", opens the lines it hides, which are in the page already.

const SHOWING_STEP = "showing-step";

export function listenForEyeTaps(): void {
  document.addEventListener("click", (event) => {
    const target = event.target as Element;
    const unfold = target.closest?.<HTMLButtonElement>(".vp-doc div.whole-step button.unfold");
    if (unfold) return open(unfold);
    const eye = target.closest?.<HTMLButtonElement>(".vp-doc button.eye");
    const block = eye?.parentElement;
    if (!eye || !block) return;
    const whole = block.classList.contains("whole-step") ? block : block.previousElementSibling;
    if (!whole?.classList.contains("whole-step")) return;
    const showStep = !whole.classList.contains(SHOWING_STEP);
    whole.classList.toggle(SHOWING_STEP, showStep);
    // the eye just tapped went with its block: keep the keyboard on the one now showing
    const shown = showStep ? whole.nextElementSibling : whole;
    shown?.querySelector<HTMLButtonElement>("button.eye")?.focus({ preventScroll: true });
  });
}

/** A fold's lines, shown where its bar was. */
function open(unfold: HTMLButtonElement): void {
  const bar = unfold.parentElement;
  const lines = bar?.nextElementSibling;
  if (!bar || !(lines instanceof HTMLElement) || !lines.classList.contains("folded")) return;
  lines.hidden = false;
  bar.remove();
}
