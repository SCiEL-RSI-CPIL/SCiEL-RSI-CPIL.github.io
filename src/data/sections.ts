// The article's numbered sections: one list drives the top bar, the contents box and the <h2>s.

export interface Section {
  id: string;
  /** Short label for the top bar. */
  nav: string;
  /** Heading in the article. */
  title: string;
}

export const SECTIONS: Section[] = [
  { id: "idea", nav: "Idea", title: "Getting better at getting better" },
  { id: "results", nav: "Results", title: "Results" },
  { id: "why", nav: "Why culture", title: "Why a population with culture?" },
  { id: "culture", nav: "Does it help", title: "Does culture help?" },
  { id: "top", nav: "Near the top", title: "Why the last digits are hard" },
  { id: "related", nav: "Related", title: "Related work" },
  { id: "next", nav: "Next", title: "What comes next" },
];

export const sectionNumber = (id: string) => String(SECTIONS.findIndex((s) => s.id === id) + 1).padStart(2, "0");
