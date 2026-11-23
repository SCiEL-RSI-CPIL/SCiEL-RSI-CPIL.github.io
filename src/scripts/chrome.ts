

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

function tryRunTabs(): void {
  const tabs = [...document.querySelectorAll<HTMLButtonElement>(".tr-tabs [role=tab]")];
  const show = (b: HTMLButtonElement) => {
    tabs.forEach((t) => {
      const on = t === b;
      t.setAttribute("aria-selected", String(on));
      t.classList.toggle("on", on);
      t.tabIndex = on ? 0 : -1;
      const pane = document.getElementById(t.getAttribute("aria-controls") || "");
      if (pane) pane.hidden = !on;
    });
  };
  tabs.forEach((b, j) => {
    b.addEventListener("click", () => show(b));
    b.addEventListener("keydown", (e) => {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      const next = tabs[(j + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length];
      show(next);
      next.focus();
      e.preventDefault();
    });
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


function clips(): void {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.querySelectorAll<HTMLElement>(".clip").forEach((box) => {
    const v = box.querySelector("video");
    const still = box.querySelector<HTMLImageElement>(".clip-still");
    const btn = box.querySelector<HTMLButtonElement>(".clip-replay");
    if (!v || !still || !btn) return;
    const end = Number(v.dataset.end) || Infinity;
    const done = () => {
      v.pause();
      still.hidden = false;
      btn.hidden = false;
    };
    const play = () => {
      still.hidden = true;
      btn.hidden = true;
      v.currentTime = 0;
      v.play().catch(done);
    };
    v.addEventListener("timeupdate", () => {
      if (v.currentTime >= end) done();
    });
    v.addEventListener("ended", done);
    btn.addEventListener("click", play);
    if (reduce) return done();
    const io = new IntersectionObserver(
      (es) => {
        if (!es.some((e) => e.isIntersecting)) return;
        io.disconnect();
        play();
      },
      { threshold: 0.5 },
    );
    io.observe(box);
  });
}

function terms(): void {
  const chips = [...document.querySelectorAll<HTMLButtonElement>(".defs-chips [role=tab]")];
  chips.forEach((b) => {
    b.addEventListener("click", () => {
      chips.forEach((c) => {
        const on = c === b;
        c.classList.toggle("on", on);
        c.setAttribute("aria-selected", String(on));
        const pane = document.getElementById(c.getAttribute("aria-controls") || "");
        if (pane) pane.hidden = !on;
      });
    });
  });
}

export function initChrome(): void {
  copyButtons();
  terms();
  clips();
  tryRunTabs();
  tocRail();
}
