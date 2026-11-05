// Figure 2 (How SCiEL works): a highlight walks through the four stations of a step, and after
// station 4 the culture arcs redraw, so the order of the loop is visible without reading.
// Hovering or tapping a station holds it. Static under reduced motion.

import { el, isVisible, prefersReducedMotion } from "../lib/core";

export function mount(): void {
  const root = el("fw");
  const steps = [...root.querySelectorAll<HTMLElement>(".fw-steps li")];
  const arcs = [...root.querySelectorAll<SVGPathElement>(".fw-arc")];
  arcs.forEach((a) => a.style.setProperty("--len", String(Math.ceil(a.getTotalLength()))));
  const set = (k: number) => steps.forEach((s, i) => s.classList.toggle("on", i === k));
  if (prefersReducedMotion()) return;
  root.classList.add("anim");

  let k = -1;
  let held = false;
  steps.forEach((s, i) => {
    s.addEventListener("mouseenter", () => ((held = true), set(i)));
    s.addEventListener("mouseleave", () => (held = false));
    s.addEventListener("click", () => ((held = !held), set(i)));
  });
  setInterval(() => {
    if (held || !isVisible(root)) return;
    k = (k + 1) % steps.length;
    set(k);
    if (k === steps.length - 1) {
      root.classList.remove("send");
      void root.offsetWidth; // restart the arc animation
      root.classList.add("send");
    }
  }, 1400);
}
