// "Culture is a tree with chords": the culture disk of the selected run, replayed attempt by attempt,
// with its findings and legend. Ported from legacy/assets/replay.js.

import { C, demeColor, el, esc, isVisible } from "../lib/core";
import { loadRun, programsById, type Run } from "../lib/data";
import { currentRun, onRunChange } from "../lib/run-state";
import { chordLabel, hover } from "../lib/tooltip";
import { ARENA_URL, demeName, runName } from "../data/names";
import { diskSvg } from "./disk";

const runLink = (id: string) => `<a class="xp" href="${ARENA_URL}" target="_blank" rel="noopener">${esc(runName(id))}</a>`;

/**
 * Findings are model-written and sometimes cite programs by internal id ("p54"). Replace each
 * cited program with its deme and generation.
 */
function scrubIds(text: string, r: Run): string {
  const by = programsById(r);
  return text.replace(/\bp\d+\b/g, (id) => {
    const p = by.get(id);
    return p ? `program (${demeName(p[2])}, generation ${p[3]})` : "a program";
  });
}

let run: Run;
/** Draw programs up to this attempt; null draws them all. */
let tmax: number | null = null;
let looping = false;
let timer: ReturnType<typeof setInterval> | null = null;
let hold: ReturnType<typeof setTimeout> | null = null;

const maxAttempt = (r: Run) => Math.max(...r.programs.map((p) => p[6] || 0));

function draw(): void {
  const f = el("disk");
  f.innerHTML = diskSvg(run, 720, tmax);
  chordLabel(f);
  hover(f, run);
  const shownN = run.programs.filter((p) => tmax == null || (p[6] || 0) <= tmax).length;
  el("tlabel").textContent = `attempt ${tmax == null ? maxAttempt(run) : tmax} · ${shownN} programs`;
}

function stop(): void {
  if (timer) clearInterval(timer);
  timer = null;
  if (hold) clearTimeout(hold);
}

function play(): void {
  stop();
  looping = true;
  el("play").textContent = "Pause";
  const slider = el<HTMLInputElement>("tslider");
  const mx = +slider.max;
  const root = el("disk");
  tmax = 0;
  timer = setInterval(() => {
    if (!isVisible(root)) return; // hold the frame while off screen
    tmax = Math.min(mx, (tmax ?? 0) + Math.max(1, Math.round(mx / 160)));
    slider.value = String(tmax);
    draw();
    if (tmax >= mx) {
      if (timer) clearInterval(timer);
      timer = null;
      hold = setTimeout(() => {
        if (looping) play();
      }, 2600);
    }
  }, 70);
}

function show(r: Run): void {
  run = r;
  const mx = maxAttempt(r);
  const slider = el<HTMLInputElement>("tslider");
  slider.max = String(mx);
  slider.value = String(mx);
  tmax = null;
  draw();
  if (looping) play();

  const rose = r.transfers.filter((t) => t.rose).length;
  const demes = [...new Set(r.programs.map((p) => p[2]))].sort((a, b) => a - b);
  el("s-disk").innerHTML = r.cells.length
    ? `In ${runLink(r.id)} the ${demes.length} demes grew ${r.programs.length} programs. ` +
      `${r.cells.length} research cells wrote ${r.nfind} findings, delivered ${r.delivered} times. ` +
      `${r.transfers.length} reached another deme as a chord, and ${rose} of those raised the child there above its parent.`
    : `In ${runLink(r.id)} research cells were off: the demes grew ${r.programs.length} programs as separate trees and nothing crossed between them. ` +
      "Compare with an autocorrelation run, where chords appear.";

  el("findings").innerHTML = r.findings.length
    ? r.findings
        .slice(0, 5)
        .map((x) => {
          const t = scrubIds(x.text || "", r);
          return (
            `<div class="row">${esc(t.length > 230 ? t.slice(0, 230) + "…" : t)}` +
            `<div class="m">${demeName(x.island)} · delivered ${x.delivered || 0} · ${esc(x.status)} · ${esc(x.kind)}</div></div>`
          );
        })
        .join("")
    : '<div class="row muted">No research cells in this run.</div>';

  el("diskleg").innerHTML =
    demes.map((k) => `<span><i style="background:${demeColor(k)}"></i>${demeName(k)}</span>`).join("") +
    `<span><i class="ln" style="background:${C.chord}"></i>finding, child improved</span><span><i class="dash"></i>finding, child did not</span>`;
}

export async function mount(): Promise<void> {
  show(await currentRun());

  el("tslider").addEventListener("input", (e) => {
    looping = false;
    stop();
    el("play").textContent = "Play";
    tmax = +(e.target as HTMLInputElement).value;
    draw();
  });
  el("play").addEventListener("click", (e) => {
    if (looping) {
      looping = false;
      stop();
      (e.currentTarget as HTMLElement).textContent = "Play";
    } else play();
  });
  // Start the replay the first time the disk is well into view.
  const root = el("disk");
  const io = new IntersectionObserver(
    (entries) => {
      if (entries.some((en) => en.isIntersecting) && !looping && !root.dataset.on) {
        root.dataset.on = "1";
        io.disconnect();
        play();
      }
    },
    { threshold: 0.3 },
  );
  io.observe(root);
  onRunChange(async (id) => show(await loadRun(id)));
}
