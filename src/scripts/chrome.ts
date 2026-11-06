// Page chrome: copy buttons, the mobile contents toggle
// and the scroll-tracking section links in the top bar.


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

export function initChrome(): void {
  copyButtons();
}
