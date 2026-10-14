// A page opened before a deploy still names the old build's files, and the ones it loads
// only when needed (the search box and its index, a page not visited yet) are gone once
// the new build replaces the site: the load fails, Vite fires vite:preloadError, and the
// search box would never open. Reloading the page fetches the new build. At most once a
// minute, so a file that is really missing can't make the page reload forever.

const KEY = "the-gray-tutor:reloaded-for-new-build";

export function reloadOnStaleBuild(): void {
  window.addEventListener("vite:preloadError", (event) => {
    let last = 0;
    try {
      last = Number(sessionStorage.getItem(KEY) ?? 0);
    } catch {} // no storage (a private window): reload anyway
    if (Date.now() - last < 60_000) return; // reloaded a moment ago: let the error show
    try {
      sessionStorage.setItem(KEY, String(Date.now()));
    } catch {}
    event.preventDefault();
    window.location.reload();
  });
}
