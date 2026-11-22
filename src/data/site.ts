
export interface Author {
  name: string;
  href?: string;
}

export const AUTHORS: Author[] = [
  { name: "Arina Kharlamova", href: "https://scholar.google.com/citations?user=-3GbddYAAAAJ" },
  { name: "Jikun Kang", href: "https://scholar.google.com/citations?user=-hj96MMAAAAJ" },
  { name: "Yusheng Zhao", href: "https://scholar.google.com/citations?user=shacGAsAAAAJ" },
  { name: "Xue Liu", href: "https://en.wikipedia.org/wiki/Steve_Liu" },
  { name: "Bowei He", href: "https://scholar.google.com/citations?user=1cH0A9cAAAAJ" },
];

export const SITE = {
  title:
    "Let Them Get Better at Getting Better: Recursive Self-Improvement (RSI) through Cultural Transmission",
  shortTitle: "SCiEL",
  date: "September 20, 2026",
  description:
    "A system built on a frozen 27B model that keeps improving from the experience it produces itself: what one group of programs learns is tested, passed on, and kept only if it helps where it lands.",
  url: "https://sciel-rsi-cpil.github.io/",
  ogImage: "https://sciel-rsi-cpil.github.io/og-card.png",
  authors: AUTHORS,
  affiliations: [
    { name: "CPIL", full: "Cyber-Physical Intelligence Lab" },
    { name: "MBZUAI", full: "Mohamed bin Zayed University of Artificial Intelligence" },
  ],
};

export const BIBTEX_AUTHORS = AUTHORS.map((a) => a.name).join(" and ");
