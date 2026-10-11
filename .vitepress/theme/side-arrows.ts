// Big arrows in the margins, as the Rust Book has: the previous lesson on the left, the next on
// the right. Only where there's room beside the text and the outline (1728px wide and up on
// this layout); everywhere else the pager at the bottom and the arrow keys do the same job.
// Each arrow is the pager's own link, so it goes where the pager goes.

const ROOM = 80; // the margin an arrow needs, in px
const WIDTH = 56; // an arrow's width, in px (custom.css)

/** The middle of the margin on one side of the text, or null if it's too narrow for an arrow. */
function margin(side: "prev" | "next"): number | null {
  const doc = document.querySelector(".vp-doc")?.getBoundingClientRect();
  if (!doc) return null;
  if (side === "prev") {
    const sidebar = document.querySelector(".VPSidebar")?.getBoundingClientRect();
    const from = sidebar && sidebar.width > 0 ? Math.max(sidebar.right, 0) : 0;
    return doc.left - from >= ROOM ? (from + doc.left) / 2 : null;
  }
  const aside = document.querySelector(".VPDocAside")?.getBoundingClientRect();
  const from = aside && aside.width > 0 ? aside.right : doc.right;
  return innerWidth - from >= ROOM ? (from + innerWidth) / 2 : null;
}

/** Puts the arrows where they belong for this page and this window, or hides them. */
export function placeSideArrows(): void {
  for (const side of ["prev", "next"] as const) {
    let arrow = document.getElementById(`side-arrow-${side}`) as HTMLAnchorElement | null;
    if (!arrow) {
      arrow = document.createElement("a");
      arrow.id = `side-arrow-${side}`;
      arrow.className = `side-arrow ${side}`;
      arrow.textContent = side === "prev" ? "‹" : "›";
      document.body.append(arrow);
    }
    const pager = document.querySelector<HTMLAnchorElement>(`.VPDocFooter .pager-link.${side}`);
    const middle = margin(side);
    arrow.hidden = !pager || middle === null;
    if (!pager || middle === null) continue;
    arrow.href = pager.href;
    const title = `${side === "prev" ? "Previous" : "Next"}: ${pager.querySelector(".title")?.textContent ?? ""}`;
    arrow.title = title;
    arrow.setAttribute("aria-label", title);
    arrow.style.left = `${Math.round(middle - WIDTH / 2)}px`;
  }
}

export function listenForResize(): void {
  addEventListener("resize", () => placeSideArrows());
}
