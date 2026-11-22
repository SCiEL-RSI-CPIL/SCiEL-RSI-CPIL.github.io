

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

function copyButtons(): void {
  document.querySelectorAll<HTMLButtonElement>("button[data-copy]").forEach((b) => {
    b.addEventListener("click", () => copy(b, document.getElementById(b.dataset.copy || "")?.textContent || ""));
  });
}

function tocRail(): void {
  const rail = document.querySelector<HTMLElement>(".toc-rail");
  if (!rail || typeof IntersectionObserver === "undefined") return;
  const links = new Map<string, HTMLAnchorElement>();
  rail.querySelectorAll<HTMLAnchorElement>("a[data-sec]").forEach((a) => links.set(a.dataset.sec!, a));
  const heads = [...links.keys()].map((id) => document.getElementById(id)).filter((n): n is HTMLElement => !!n);
  const mark = () => {
    let cur = heads[0]?.id;
    for (const h of heads) if (h.getBoundingClientRect().top < window.innerHeight * 0.3) cur = h.id;
    links.forEach((a, id) => a.classList.toggle("on", id === cur));
  };
  addEventListener("scroll", mark, { passive: true });
  mark();
  const covering = new Set<Element>();
  const io = new IntersectionObserver(
    (es) => {
      es.forEach((e) => (e.isIntersecting ? covering.add(e.target) : covering.delete(e.target)));
      rail.classList.toggle("away", covering.size > 0);
    },
    { rootMargin: "-80px 0px -40% 0px" },
  );
  document.querySelectorAll(".masthead, .article > .wide, .article > .full").forEach((n) => io.observe(n));
}

function labelCells(): void {
  document.querySelectorAll<HTMLTableElement>(".article table").forEach((t) => {
    const heads = [...t.querySelectorAll("thead th")].map((th) => th.textContent?.trim() ?? "");
    t.querySelectorAll("tbody tr").forEach((tr) =>
      [...tr.children].forEach((td, i) => td.setAttribute("data-label", heads[i] ?? "")),
    );
  });
}

export function initChrome(): void {
  copyButtons();
  labelCells();
  tocRail();
}
