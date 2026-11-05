// Page chrome: copy buttons, the mobile contents toggle
// and the scroll-tracking section links in the top bar.

import { el } from "../lib/core";

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
  copyButtons();
  toc();
}
