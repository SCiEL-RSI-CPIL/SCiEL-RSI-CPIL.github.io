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
  { id: "results", nav: "Results", title: "Results so far" },
  { id: "why", nav: "Why culture", title: "Why not one model, one climber, or a swarm" },
  { id: "how", nav: "How it works", title: "How SCiEL works" },
  { id: "runs", nav: "The runs", title: "What the runs show" },
  { id: "weights", nav: "Weights", title: "Culture into weights" },
  { id: "use", nav: "Use it", title: "Use it on your problem" },
  { id: "related", nav: "Related", title: "How this differs from other self-improving systems" },
  { id: "open", nav: "Open", title: "Open questions" },
];

export const sectionNumber = (id: string) => String(SECTIONS.findIndex((s) => s.id === id) + 1).padStart(2, "0");
