// Shared helpers for the figures (ported from legacy/assets/page.js).

// ---------------------------------------------------------------------------
// Colour tokens.
// Neutral colours (text, gridlines, panels) follow the page theme and are CSS custom properties,
// defined in src/styles/figure-theme.css. In SVG strings use them through `style="…"`
// (SVG presentation attributes do not accept var()), e.g.
//   `<line … style="stroke:${C.rule}"/>`  `<text … style="fill:${C.muted}">`
// For canvas / WebGL, read the resolved value with cssColor(C.rule).
// Series colours (demes, runs, operators) are fixed hues and stay plain hex.
// ---------------------------------------------------------------------------
export const C = {
  bg: "var(--fig-bg)", // #000      page background behind figures
  panel: "var(--fig-panel)", // #0B0B0C  raised panels, tooltips
  soft: "var(--fig-soft)", // #1C1C1E  faint gridlines, fills
  rule: "var(--fig-rule)", // #2C2C2E  gridlines, rings, borders
  ruleStrong: "var(--fig-rule-strong)", // #48484D
  faint: "var(--fig-faint)", // #636366 / #8E8E93  de-emphasised marks
  muted: "var(--fig-muted)", // #98989D  axis labels, secondary text
  ink2: "var(--fig-ink2)", // #C7C7CC  body text inside figures
  ink: "var(--fig-ink)", // #F5F5F7  primary text / bright marks
  accent: "var(--fig-accent)", // #0A84FF
  chord: "var(--fig-chord)", // #E0637F  a finding passed between demes
  up: "var(--fig-up)", // #3DAE7C
  down: "var(--fig-down)", // #E5484D
  warn: "var(--fig-warn)", // #E8A33D
} as const;

/** Resolve a `var(--x)` token (or any CSS colour) to a concrete colour string, for canvas/WebGL. */
export function cssColor(token: string, el: Element = document.documentElement): string {
  const m = /^var\((--[^)]+)\)$/.exec(token);
  if (!m) return token;
  return getComputedStyle(el).getPropertyValue(m[1]).trim() || "#888";
}

/** Deme colours, indexed by 0-based deme. */
export const DEME_COLORS = ["#E8A33D", "#3DAE7C", "#0A84FF", "#A66BE0", "#2BB3C0", "#D67AB1", "#D1B23F", "#4F7BE8"];
export function demeColor(i: number | null | undefined): string {
  return DEME_COLORS[(i || 0) % DEME_COLORS.length];
}

/** Reader-facing names for edit operators. */
export const OP_NAMES: Record<string, string> = {
  diff: "diff",
  full_rewrite: "rewrite",
  cross: "cross",
  idea: "idea",
  error_repair: "repair",
  fix: "repair",
  seed: "seed",
};
export const OP_COLORS: Record<string, string> = {
  diff: "#0A84FF",
  full_rewrite: "#E8A33D",
  cross: "#3DAE7C",
  idea: "#A66BE0",
  seed: "#8E8E93",
};
export function opName(op: string | null | undefined): string {
  return op ? OP_NAMES[op] || op : "";
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------
export function esc(s: unknown): string {
  return String(s == null ? "" : s).replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] as string,
  );
}
/** Score to four decimals, or an em dash. */
export function f4(x: number | null | undefined): string {
  return x == null ? "—" : (+x).toFixed(4);
}
/** Digits of agreement with the best known value (score 1). */
export function dig(s: number): number {
  return -Math.log10(Math.max(1 - s, 1e-5));
}
export function sup(k: number): string {
  return k ? "10⁻" + k : "1";
}

export function el<T extends HTMLElement = HTMLElement>(id: string): T {
  const n = document.getElementById(id);
  if (!n) throw new Error(`#${id} not found`);
  return n as T;
}

/** Horizontal gridlines labelled by digits of agreement, pushed onto an SVG string buffer. */
export function axisY(
  s: string[],
  L: number,
  W: number,
  Rr: number,
  Y: (d: number) => number,
  lo: number,
  hi: number,
): void {
  for (let g = Math.ceil(lo); g <= hi; g++) {
    s.push(
      `<line x1="${L}" x2="${W - Rr}" y1="${Y(g)}" y2="${Y(g)}" style="stroke:${C.rule}"/>` +
        `<text x="${L - 10}" y="${Y(g) + 4}" style="fill:${C.muted}" font-size="11" text-anchor="end">` +
        (g >= 5 ? "best known" : (1 - Math.pow(10, -g)).toFixed(Math.max(1, g))) +
        "</text>",
    );
  }
}

// ---------------------------------------------------------------------------
// Visibility: animation loops should only draw while their figure is on screen.
// ---------------------------------------------------------------------------
const visible = new WeakMap<Element, boolean>();
const visObserver =
  typeof IntersectionObserver !== "undefined"
    ? new IntersectionObserver(
        (entries) => entries.forEach((e) => visible.set(e.target, e.isIntersecting)),
        { rootMargin: "200px" },
      )
    : null;

/** True while `n` is within 200px of the viewport and the tab is visible. */
export function isVisible(n: Element): boolean {
  if (!visObserver) return true;
  if (!visible.has(n)) {
    visible.set(n, false);
    visObserver.observe(n);
  }
  return !!visible.get(n) && !document.hidden;
}

export const prefersReducedMotion = () =>
  typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
