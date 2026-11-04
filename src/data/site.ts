// Page-level metadata. The author list below is the single source for the byline,
// <meta name="author">, JSON-LD, the OG card and the citation block.

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
  url: "https://sciel-rsi-cpil.github.io/",
  ogImage: "https://sciel-rsi-cpil.github.io/og-card.png",
  authors: AUTHORS,
  affiliations: [
    { name: "CPIL", full: "Cyber-Physical Intelligence Lab" },
    { name: "MBZUAI", full: "Mohamed bin Zayed University of Artificial Intelligence" },
  ],
};

/** "Arina Kharlamova and Jikun Kang and …", for BibTeX. */
export const BIBTEX_AUTHORS = AUTHORS.map((a) => a.name).join(" and ");
