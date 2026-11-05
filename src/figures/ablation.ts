// Figure 7: what each part of SCiEL is worth on the toy landscape. Four switches (the bold parts of
// Figure 2); 30 trials of 200 evaluations each, one dot per trial, filled where it reached the summit.
// Below, the four single removals are always listed, so the result reads without touching anything.

import { C, el, esc } from "../lib/core";
import { makeWorld, runMode, type ModeOptions } from "./toy";

const TRIALS = 30;
const BUDGET = 200;
type Part = keyof ModeOptions;
const PARTS: [Part, string][] = [
  ["policy", "Learned policy"],
  ["world", "World model"],
  ["culture", "Culture"],
  ["research", "Research cells"],
];

const W = makeWorld();
const cache = new Map<string, boolean[]>();
function trials(opt: ModeOptions): boolean[] {
  const key = PARTS.map(([p]) => (opt[p] === false ? 0 : 1)).join("");
  let t = cache.get(key);
  if (!t) {
    t = Array.from({ length: TRIALS }, (_, k) => runMode(W, "sciel", BUDGET, 500 + k, opt).best > 0.95);
    cache.set(key, t);
  }
  return t;
}

export function mount(): void {
  const root = el("ablate");
  const on: Record<Part, boolean> = { policy: true, world: true, culture: true, research: true };
  root.innerHTML =
    `<div class="ab-switch" role="group" aria-label="Parts of SCiEL">${PARTS.map(
      ([p, name]) => `<button type="button" class="on" data-p="${p}" aria-pressed="true"><i></i>${esc(name)}</button>`,
    ).join("")}</div>` +
    `<div class="ab-main"><p class="ab-num"><b></b><span></span></p><div class="ab-dots"></div></div>` +
    `<div class="hb ab-list"></div>`;
  const num = root.querySelector<HTMLElement>(".ab-num b")!;
  const sub = root.querySelector<HTMLElement>(".ab-num span")!;
  const dots = root.querySelector<HTMLElement>(".ab-dots")!;
  const list = root.querySelector<HTMLElement>(".ab-list")!;

  // The always-visible summary: all parts, then each part removed alone.
  const rows: [string, ModeOptions][] = [
    ["All four parts", {}],
    ...PARTS.map(([p, name]) => [`without ${name.toLowerCase()}`, { [p]: false }] as [string, ModeOptions]),
  ];
  const keyOf = (opt: ModeOptions) => PARTS.map(([p]) => (opt[p] === false ? 0 : 1)).join("");

  const paint = () => {
    const opt: ModeOptions = Object.fromEntries(PARTS.map(([p]) => [p, on[p]]));
    const t = trials(opt);
    const n = t.filter(Boolean).length;
    const off = PARTS.filter(([p]) => !on[p]).map(([, name]) => name.toLowerCase());
    num.textContent = `${n} of ${TRIALS}`;
    sub.textContent = off.length ? `trials reach the summit without ${off.join(" and ")}` : "trials reach the summit with every part on";
    dots.innerHTML = t.map((ok) => `<i class="${ok ? "ok" : ""}"></i>`).join("");
    root.querySelectorAll<HTMLButtonElement>(".ab-switch button").forEach((b) => {
      const p = b.dataset.p as Part;
      b.classList.toggle("on", on[p]);
      b.setAttribute("aria-pressed", String(on[p]));
    });
    const cur = keyOf(opt);
    list.innerHTML =
      `<h4>Remove one part at a time</h4>` +
      rows
        .map(([label, o]) => {
          const m = trials(o).filter(Boolean).length;
          const em = keyOf(o) === cur;
          return (
            `<div class="hb-row${em ? " em" : ""}"><span class="l">${esc(label)}</span>` +
            `<span class="hb-track"><i style="width:${((m / TRIALS) * 100).toFixed(1)}%;background:${em ? C.accent : "rgba(58,110,165,.45)"}"></i></span>` +
            `<span class="v">${m} of ${TRIALS}</span></div>`
          );
        })
        .join("");
  };
  root.querySelector(".ab-switch")!.addEventListener("click", (e) => {
    const b = (e.target as Element).closest<HTMLButtonElement>("button");
    if (!b) return;
    const p = b.dataset.p as Part;
    on[p] = !on[p];
    paint();
  });
  paint();
}
