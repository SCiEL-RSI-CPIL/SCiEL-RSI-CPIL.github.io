// Program tooltips and the "finding passed on" chord label (ported from legacy/assets/page.js).
// Tooltips never show internal program IDs; they describe a program by deme, generation and edit.

import { demeName } from "../data/names";
import { programsById, type Program, type Run } from "./data";
import { esc, f4, opName } from "./core";

export function tipFor(tip: HTMLElement, p: Program | undefined): void {
  if (!p) {
    tip.hidden = true;
    return;
  }
  const [, parent, deme, gen, score, , attempt, op, idea] = p;
  const meta = [
    demeName(deme),
    `generation ${gen}`,
    parent ? opName(op) : "seed",
    attempt != null ? `attempt ${attempt}` : "",
  ].filter(Boolean);
  tip.innerHTML =
    `<div class="t-n">${score != null ? f4(score) : "no score"}</div>` +
    `<div class="t-m">${meta.join(" · ")}</div>` +
    (idea ? `<div class="t-i">${esc(idea)}</div>` : "");
  tip.hidden = false;
}

export function placeTip(box: Element, tip: HTMLElement, e: MouseEvent): void {
  const b = box.getBoundingClientRect();
  let x = e.clientX - b.left + 16;
  let y = e.clientY - b.top + 16;
  if (x + 340 > b.width) x = Math.max(0, x - 360);
  if (y + 150 > b.height) y = Math.max(0, y - 170);
  tip.style.left = x + "px";
  tip.style.top = y + "px";
}

/** Get (or create) the `.tip` element inside a figure. */
export function ensureTip(fig: HTMLElement): HTMLElement {
  let tip = fig.querySelector<HTMLElement>(".tip");
  if (!tip) {
    tip = document.createElement("div");
    tip.className = "tip";
    tip.hidden = true;
    fig.appendChild(tip);
  }
  return tip;
}

/** Show a program tooltip for any element under `fig` that carries data-id. */
export function hover(fig: HTMLElement, r: Run): void {
  const tip = ensureTip(fig);
  const by = programsById(r);
  fig.onmousemove = (e) => {
    const t = e.target as Element | null;
    const id = t && t.getAttribute && t.getAttribute("data-id");
    if (!id) {
      tip.hidden = true;
      return;
    }
    tipFor(tip, by.get(id));
    placeTip(fig, tip, e);
  };
  fig.onmouseleave = () => {
    tip.hidden = true;
  };
}

