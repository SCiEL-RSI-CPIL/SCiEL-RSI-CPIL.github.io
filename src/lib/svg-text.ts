// Chart text at a fixed on-screen size.
// Figures draw SVG in a fixed viewBox and let it scale with the column, which also scales the text:
// an 11-unit label in a 1160-unit chart shown 700px wide renders at under 7px. Each figure SVG gets
// --k = (viewBox width) / (rendered width), and figures.css sets `svg text` to var(--fs-fig) × --k,
// so labels render at the same size as the rest of the figure text whatever the chart's width.

const ro = new ResizeObserver((entries) => {
  for (const e of entries) setK(e.target as SVGSVGElement, e.contentRect.width);
});

function setK(svg: SVGSVGElement, w: number): void {
  const vb = svg.viewBox?.baseVal;
  if (!vb || !vb.width || !w) return;
  svg.style.setProperty("--k", (vb.width / w).toFixed(4));
}

function watch(root: ParentNode): void {
  const list = root instanceof SVGSVGElement ? [root] : root.querySelectorAll<SVGSVGElement>(".figure svg");
  for (const svg of list) {
    if (!svg.closest(".figure") || !svg.getAttribute("viewBox")) continue;
    setK(svg, svg.getBoundingClientRect().width);
    ro.observe(svg);
  }
}

export function initSvgText(): void {
  watch(document);
  new MutationObserver((records) => {
    for (const r of records) {
      r.addedNodes.forEach((n) => {
        if (n instanceof SVGSVGElement || n instanceof HTMLElement) watch(n);
      });
      r.removedNodes.forEach((n) => {
        if (n instanceof SVGSVGElement) ro.unobserve(n);
        else if (n instanceof HTMLElement) n.querySelectorAll("svg").forEach((s) => ro.unobserve(s));
      });
    }
  }).observe(document.querySelector(".article") ?? document.body, { childList: true, subtree: true });
}
