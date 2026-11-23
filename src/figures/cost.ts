
import { el, esc } from "../lib/core";
import { loadOverview, type Overview } from "../lib/data";
import { sortRuns } from "../data/names";

type Mode = "cost" | "calls" | "gpus" | "size";

type Val = [number, number] | string;
interface Sys { name: string; task: string; model: string; cost: Val; calls: Val; gpus: Val; size: Val; ours?: boolean; costNote?: string; sizeNote?: string; gpuNote?: string; noRatio?: Mode[] }
const API = "closed model via API";
function race(o: Overview, mode: Mode): string {
  const end = (k: 1 | 2) => sortRuns(o.order).map((id) => { const st = o.runs[id].steps; return st[st.length - 1][k]; });
  const SYS: Sys[] = [
    { name: "SCiEL", task: "math constants, circle packing", model: "Qwen3.8-27B, open, frozen", cost: [Math.min(...end(1)), Math.max(...end(1))], calls: [Math.min(...end(2)), Math.max(...end(2))], gpus: [2, 2], gpuNote: "2 GPUs, shared by parallel runs", size: [27, 27], ours: true },
    { name: "Red Queen Gödel Machine", task: "RL reward design", model: "Nemotron 3 Ultra", cost: [24, 27], calls: "not reported", gpus: "not reported", size: "not reported" },
    { name: "Hyperagents", task: "agent design", model: "Claude Sonnet 4.5", cost: [104, 104], costNote: "≈ $104, estimated by others", calls: "not reported", gpus: API, size: "undisclosed" },
    { name: "TTT-Discover", task: "math, kernels, AtCoder", model: "gpt-oss-120b, RL during the run", cost: [200, 500], costNote: "a few hundred $ per problem", calls: [25600, 25600], gpus: "trains via the Tinker API", size: [120, 120], sizeNote: "120B (5.1B active)", noRatio: ["size"] },
    { name: "ThetaEvolve", task: "math", model: "8B, RL during the run", cost: "not reported", calls: "not reported", gpus: [8, 8], size: [8, 8] },
    { name: "MASS", task: "agent self-supervision", model: "trained during the run", cost: "not reported", calls: "not reported", gpus: [6, 6], size: "not reported" },
    { name: "Huxley–Gödel Machine", task: "Polyglot", model: "Qwen3-Coder-480B", cost: [5000, 5000], costNote: "≈ $5,000 for all its experiments", calls: "not reported", gpus: "not reported", size: [480, 480], sizeNote: "480B (35B active)", noRatio: ["cost", "size"] },
    { name: "SICA", task: "coding benchmarks", model: "Claude 3.5 Sonnet + o3-mini", cost: [7000, 7000], costNote: "≈ $7,000 per run", calls: "not reported", gpus: API, size: "undisclosed" },
    { name: "Darwin Gödel Machine", task: "SWE-bench", model: "Claude 3.5 Sonnet", cost: [22000, 22000], costNote: "≈ $22,000 per run", calls: "not reported", gpus: API, size: "undisclosed" },
    { name: "Dream-RSI", task: "math, kernels, harness", model: "Gemini 3.1 Pro, Claude Opus 4.8", cost: [100000, 100000], costNote: "> $100,000, one search, estimated", calls: [1100, 1100], gpus: API, size: "undisclosed", noRatio: ["cost"] },
  ];
  const AX: Record<Mode, { lo: number; hi: number; fmt: (v: number) => string; title: string; word: string }> = {
    cost: { lo: -0.6, hi: 5, fmt: (v) => "$" + (v < 1 ? v.toFixed(1) : v >= 1000 ? v / 1000 + "k" : v), title: "cost of one run at API list prices, log scale", word: "cheaper" },
    calls: { lo: 1.8, hi: 4.7, fmt: (v) => (v >= 1000 ? v / 1000 + "k" : String(v)), title: "model calls for one run, log scale", word: "fewer calls" },
    gpus: { lo: 0, hi: 1.1, fmt: (v) => String(v), title: "GPUs the run needs, log scale", word: "fewer GPUs" },
    size: { lo: 0.7, hi: 2.9, fmt: (v) => v + "B", title: "total parameters of the model, log scale", word: "smaller" },
  };
  const ax = AX[mode];
  const W = 1000, L = 360, R = 220, rowH = 44, T = 16;
  const X = (v: number) => L + ((Math.log10(v) - ax.lo) / (ax.hi - ax.lo)) * (W - L - R);
  const H = T + SYS.length * rowH + 48;
  const s = [`<svg viewBox="0 0 ${W} ${H}" class="race" role="img" aria-label="Recursive self-improvement systems: ${ax.title}">`];
  for (let e = Math.ceil(ax.lo); e <= Math.floor(ax.hi); e++) {
    const v = 10 ** e;
    s.push(`<line x1="${X(v)}" x2="${X(v)}" y1="${T - 6}" y2="${T + SYS.length * rowH}" stroke="#e1e4ea"/>`);
    s.push(`<text x="${X(v)}" y="${T + SYS.length * rowH + 18}" class="r-t" text-anchor="middle">${ax.fmt(v)}</text>`);
  }
  s.push(`<text x="${(L + W - R) / 2}" y="${T + SYS.length * rowH + 38}" class="r-t" text-anchor="middle">${ax.title}</text>`);
  const ours = SYS[0][mode] as [number, number];
  s.push(`<line x1="${X(ours[1])}" x2="${X(ours[1])}" y1="${T + rowH - 4}" y2="${T + SYS.length * rowH}" stroke="#1f5fc9" stroke-dasharray="3 3" stroke-opacity=".6"/>`);
  SYS.forEach((x, i) => {
    const y = T + i * rowH + rowH / 2;
    if (x.ours) s.push(`<rect x="-4" y="${y - rowH / 2 + 3}" width="${W + 4}" height="${rowH - 6}" rx="8" fill="#ffd600" fill-opacity=".22"/>`);
    s.push(`<text x="6" y="${y - 3}" class="r-name">${esc(x.name)}<tspan class="r-sub" dx="8">${esc(x.task)}</tspan></text><text x="6" y="${y + 13}" class="r-sub">${esc(x.model)}</text>`);
    const v = x[mode];
    const col = x.ours ? "#1f5fc9" : "#a63d3d";
    if (typeof v === "string") {
      s.push(`<text x="${L}" y="${y + 5}" class="r-n">${esc(v)}</text>`);
      return;
    }
    const [a, b2] = v;
    if (a === b2) s.push(`<circle cx="${X(a)}" cy="${y}" r="${x.ours ? 8 : 6.5}" fill="${col}"/>`);
    else s.push(`<rect x="${X(a) - 6}" y="${y - 7}" width="${X(b2) - X(a) + 12}" height="14" rx="7" fill="${col}" fill-opacity="${x.ours ? 0.85 : 0.18}" stroke="${col}"/>`);
    const num = (n: number) => (mode === "cost" ? "$" + (n < 10 ? n.toFixed(2) : n.toLocaleString("en-US")) : mode === "size" ? n + "B" : mode === "gpus" ? n + " GPUs" : n.toLocaleString("en-US"));
    const label = mode === "cost" && x.costNote ? x.costNote : mode === "size" && x.sizeNote ? x.sizeNote : mode === "gpus" && x.gpuNote ? x.gpuNote : a === b2 ? num(a) : num(a) + "–" + num(b2).replace("$", "");
    const text = label + (mode === "calls" && x.name === "Dream-RSI" ? " (at most)" : "");
    const left = X(b2) + 16 + text.length * 7.2 > W;
    s.push(`<text x="${left ? X(a) - 16 : X(b2) + 16}" y="${y + 5}" class="r-v" fill="${col}"${left ? ' text-anchor="end"' : ""}>${esc(text)}</text>`);
    if (x.ours || a <= ours[1] || x.noRatio?.includes(mode)) return;
    const r = a / ours[1];
    const r2 = r >= 1000 ? Math.round(r / 10 ** (String(Math.round(r)).length - 2)) * 10 ** (String(Math.round(r)).length - 2) : r >= 10 ? Math.round(r) : Math.round(r * 10) / 10;
    const txt = `${r2.toLocaleString("en-US")}× ${ax.word}`;
    const tw = 12 + txt.length * 6.9;
    const xa = X(ours[1]) + 3, xb = X(a) - 9, mx = (xa + xb) / 2;
    s.push(`<line x1="${xa}" x2="${xb}" y1="${y}" y2="${y}" stroke="#1a1a1a" stroke-width="1.1"/><path d="M${xa} ${y} l6 -3.5 v7 z M${xb} ${y} l-6 -3.5 v7 z" fill="#1a1a1a"/>` +
      (xb - xa > tw + 24
        ? `<rect x="${mx - tw / 2}" y="${y - 11}" width="${tw}" height="22" rx="11" fill="#ffd600"/><text x="${mx}" y="${y + 4.5}" class="r-x" text-anchor="middle">${txt}</text>`
        : `<rect x="${xa}" y="${y - 30}" width="${tw}" height="20" rx="10" fill="#ffd600"/><text x="${xa + tw / 2}" y="${y - 15.5}" class="r-x" text-anchor="middle">${txt}</text>`));
  });
  s.push("</svg>");
  return s.join("");
}

function render(o: Overview, mode: Mode): void {
  const what = ({ cost: "what it costs", calls: "how many model calls", gpus: "how many GPUs", size: "how large a model" } as Record<Mode, string>)[mode];
  el("cost").innerHTML = `<p class="race-h">One run of a recursive self-improvement system: ${what}</p>${race(o, mode)}`;
  el("costleg").innerHTML = "";
}

export async function mount(): Promise<void> {
  const o = await loadOverview();
  let mode: Mode = "cost";
  const draw = () => render(o, mode);
  const seg = el("cxm");
  seg.addEventListener("click", (e) => {
    const b = (e.target as Element).closest("button");
    if (!b) return;
    mode = b.dataset.m as Mode;
    for (const x of seg.children) x.classList.toggle("on", x === b);
    draw();
  });
  draw();
}
