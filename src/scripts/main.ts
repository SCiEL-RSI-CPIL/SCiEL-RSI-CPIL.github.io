// Page entry: page chrome and lazy mounting of figures.
// Each figure lives in src/figures/<name>.ts and exports `mount(): Promise<void> | void`.
// A figure's module (and its data) loads only when its root element
// comes within ~800px of the viewport.

import { initChrome } from "./chrome";
import { initSvgText } from "../lib/svg-text";

type Loader = () => Promise<{ mount: () => Promise<void> | void }>;

// [root element id, module]. Order matters only for modules that import each other.
const FIGURES: [string, Loader][] = [
  ["hero", () => import("../figures/disk")],
  ["cost", () => import("../figures/cost")],
  ["climb", () => import("../figures/climb")],
  ["methods", () => import("../figures/methods")],
  ["ctest", () => import("../figures/culture")],
  ["edits", () => import("../figures/progress")],
];

function mountLazily(): void {
  const pending = new Map<Element, Loader>();
  for (const [id, load] of FIGURES) {
    const n = document.getElementById(id);
    if (n) pending.set(n, load);
    else console.warn(`figure root #${id} not on this page`);
  }
  const start = (n: Element) => {
    const load = pending.get(n);
    if (!load) return;
    pending.delete(n);
    load()
      .then((m) => m.mount())
      .catch((err) => console.error(`figure #${n.id} failed`, err));
  };
  if (typeof IntersectionObserver === "undefined") {
    [...pending.keys()].forEach(start);
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          io.unobserve(e.target);
          start(e.target);
        }
      }
    },
    { rootMargin: "800px 0px" },
  );
  pending.forEach((_, n) => io.observe(n));
}

initChrome();
initSvgText();
mountLazily();
