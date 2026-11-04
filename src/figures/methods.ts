// "Why a population with culture?": how often each way of searching reaches the summit of a toy
// landscape with a trap and a narrow ridge, 30 trials of 200 evaluations each.

import { C, el, esc } from "../lib/core";
import { makeWorld, runMode, type Mode, type ModeOptions } from "./toy";

const TRIALS = 30;
const BUDGET = 200;

type Row = [label: string, mode: Mode, opt: ModeOptions, kind: "base" | "sciel" | "ablation"];
const GROUPS: [string, Row[]][] = [
  [
    "Four ways to search",
    [
      ["One model, 200 samples", "bestn", {}, "base"],
      ["One climber", "climber", {}, "base"],
      ["Five climbers, no sharing", "swarm", {}, "base"],
      ["SCiEL", "sciel", {}, "sciel"],
    ],
  ],
  [
    "SCiEL with one part removed",
    [
      ["without the learned policy", "sciel", { policy: false }, "ablation"],
      ["without the world model", "sciel", { world: false }, "ablation"],
      ["without culture", "sciel", { culture: false }, "ablation"],
      ["without research cells", "sciel", { research: false }, "ablation"],
    ],
  ],
];

function summits(mode: Mode, opt: ModeOptions): number {
  const W = makeWorld();
  let n = 0;
  for (let k = 0; k < TRIALS; k++) if (runMode(W, mode, BUDGET, 500 + k, opt).best > 0.95) n++;
  return n;
}

export function mount(): void {
  const html: string[] = ['<div class="hb">'];
  for (const [title, rows] of GROUPS) {
    html.push(`<h4>${esc(title)}</h4>`);
    for (const [label, mode, opt, kind] of rows) {
      const n = summits(mode, opt);
      const fill = kind === "sciel" ? C.accent : kind === "ablation" ? "rgba(58,110,165,.45)" : C.ruleStrong;
      html.push(
        `<div class="hb-row${kind === "sciel" ? " em" : ""}"><span class="l">${esc(label)}</span>` +
          `<span class="hb-track"><i style="width:${((n / TRIALS) * 100).toFixed(1)}%;background:${fill}"></i></span>` +
          `<span class="v">${n} of ${TRIALS}</span></div>`,
      );
    }
  }
  el("methods").innerHTML = html.join("") + "</div>";
}
