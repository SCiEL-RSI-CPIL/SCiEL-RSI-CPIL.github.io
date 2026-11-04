// Page chrome: the "Run SCiEL on your problem" steps, copy buttons, the mobile contents toggle
// and the scroll-tracking section links in the top bar.

import { el, esc } from "../lib/core";

const REPO = "git clone https://github.com/Doldrums/sciel && cd sciel";
const START: Record<"api" | "local", { steps: [string, string][]; note: string }> = {
  api: {
    steps: [
      ["Install the release wheel", "pip install sciel-0.19.0-py3-none-any.whl"],
      ["Set a model key", "export ANTHROPIC_API_KEY=…   # or OPENROUTER_API_KEY"],
      ["Start, then pick the demo, your program or a run to continue", "sciel"],
      ["Or improve one file with solve() and score()", "sciel solve.py --budget 40"],
      ["Or turn a folder of papers, notebooks or data into a checked task", 'sciel task ./materials --note "what to improve"'],
    ],
    note: "With no arguments sciel finds the key, takes the default profile and asks what to improve. Python 3.11–3.14 on Linux or macOS.",
  },
  local: {
    steps: [
      ["Install from the code", REPO + ' && pip install -e ".[tasks]"'],
      ["Serve any open model behind an OpenAI-compatible API", "vllm serve <model> --port 8000"],
      [
        "Point a run at it",
        "cat > local.yaml <<EOF\nextends: configs/circle.yaml\nllm: {api_base: http://127.0.0.1:8000/v1, api_key_env: LOCAL_LLM_KEY, models: [<model>]}\nEOF\nexport LOCAL_LLM_KEY=local",
      ],
      ["Run and watch", "sciel run local.yaml --tasks-root ./tasks"],
    ],
    note: "Our runs use Qwen3.8-27B on two H100s this way. A local model costs electricity rather than tokens.",
  },
};

/** The "Run SCiEL on your problem" steps: API key vs local model, with copy buttons. */
function runSteps(): void {
  const mode = document.getElementById("tmode");
  if (!mode) return;
  const show = (k: "api" | "local") => {
    const d = START[k];
    el("tsteps").innerHTML = d.steps
      .map(
        ([what, cmd]) =>
          `<li><span>${esc(what)}</span><div class="cmd"><pre>${esc(cmd)}</pre>` +
          `<button class="cp" type="button" data-c="${esc(cmd)}">Copy</button></div></li>`,
      )
      .join("");
    el("tnote").textContent = d.note;
    for (const b of mode.children) b.classList.toggle("on", (b as HTMLElement).dataset.k === k);
  };
  mode.addEventListener("click", (e) => {
    const b = (e.target as Element).closest("button");
    if (b) show(b.dataset.k as "api" | "local");
  });
  el("tsteps").addEventListener("click", (e) => {
    const b = (e.target as Element).closest<HTMLButtonElement>("button.cp");
    if (b) copy(b, b.dataset.c || "");
  });
  show("api");
}

function copy(button: HTMLButtonElement, text: string): void {
  if (!navigator.clipboard) return;
  navigator.clipboard.writeText(text).then(() => {
    const was = button.textContent;
    button.textContent = "Copied";
    setTimeout(() => {
      button.textContent = was;
    }, 1400);
  });
}

/** Buttons with data-copy="<element id>" copy that element's text (the BibTeX block). */
function copyButtons(): void {
  document.querySelectorAll<HTMLButtonElement>("button[data-copy]").forEach((b) => {
    b.addEventListener("click", () => copy(b, document.getElementById(b.dataset.copy || "")?.textContent || ""));
  });
}

function toc(): void {
  const toc = el("toc");
  const mtoc = el("mtoc");
  const close = () => {
    toc.classList.remove("open");
    mtoc.setAttribute("aria-expanded", "false");
  };
  mtoc.addEventListener("click", (e) => {
    e.stopPropagation();
    mtoc.setAttribute("aria-expanded", String(toc.classList.toggle("open")));
  });
  toc.addEventListener("click", (e) => {
    if ((e.target as Element).closest("a")) close();
  });
  document.addEventListener("click", (e) => {
    if (!(e.target as Element).closest("nav.top")) close();
  });

  const nav = el("nav");
  const links = [...toc.querySelectorAll<HTMLAnchorElement>("a")];
  const secs = links.map((a) => document.querySelector(a.getAttribute("href") || ""));
  const onScroll = () => {
    nav.classList.toggle("scrolled", scrollY > 8);
    const y = scrollY + 220;
    let on = -1;
    secs.forEach((s, k) => {
      if (s && s.getBoundingClientRect().top + scrollY <= y) on = k;
    });
    links.forEach((a, k) => {
      const was = a.classList.contains("on");
      a.classList.toggle("on", k === on);
      if (k === on && !was) a.scrollIntoView({ block: "nearest", inline: "nearest" });
    });
  };
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();
}

export function initChrome(): void {
  runSteps();
  copyButtons();
  toc();
}
