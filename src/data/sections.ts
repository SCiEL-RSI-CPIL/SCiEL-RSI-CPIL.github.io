// The article's numbered sections: one list drives the contents box and the <h2>s.

export interface Section {
  id: string;
  /** Heading in the article. */
  title: string;
}

export const SECTIONS: Section[] = [
  { id: "idea", title: "How SCiEL works" },
  { id: "results", title: "Results" },
  { id: "why", title: "Why a population with culture?" },
  { id: "culture", title: "Does culture help?" },
  { id: "top", title: "Why the last digits are hard" },
  { id: "related", title: "Related work" },
];

export const sectionNumber = (id: string) => String(SECTIONS.findIndex((s) => s.id === id) + 1).padStart(2, "0");
