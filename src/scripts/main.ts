
import { initChrome } from "./chrome";
import { initSvgText } from "../lib/svg-text";
import { initFilm } from "./film";

type Loader = () => Promise<{ mount: () => Promise<void> | void }>;

const FIGURES: [string, Loader][] = [
  ["hero", () => import("../figures/disk")],
  ["map3d", () => import("../figures/relief")],
  ["mech3d", () => import("../figures/compare")],
  ["steps", () => import("../figures/steps")],
  ["cost", () => import("../figures/cost")],
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
initFilm();
initSvgText();
mountLazily();

const views = document.querySelector<HTMLElement>(".masthead .views");
if (views) {
  fetch(`https://musyalyusya.goatcounter.com/counter/${encodeURIComponent("/")}.json`)
    .then((r) => (r.ok ? r.json() : null))
    .then((d: { count: string } | null) => {
      const n = Number(d?.count.replace(/\D/g, ""));
      if (n >= 1000) {
        views.textContent = ` · ${n.toLocaleString("en-US")} views`;
        views.hidden = false;
      }
    })
    .catch(() => {});
}
