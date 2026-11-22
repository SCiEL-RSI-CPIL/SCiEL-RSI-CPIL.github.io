
export interface Section {
  id: string;
  title: string;
  short: string;
}

export const SECTIONS: Section[] = [
  { id: "idea", title: "SCiEL learns from the experience it produces itself", short: "How SCiEL works" },
  { id: "steering", title: "The run's own experience steers the next attempt", short: "Learned steering" },
  { id: "results", title: "Recent results", short: "Recent results" },
  { id: "why", title: "Why a population with culture?", short: "Why a population with culture?" },
  { id: "culture", title: "A finding from another group raises the chance an edit helps from 54% to 62%", short: "Does culture help?" },
  { id: "top", title: "Near the best program most edits stop helping, and that is where the budget goes", short: "Why the last digits are hard" },
  { id: "limits", title: "Limits and future work", short: "Limits and future work" },
  { id: "related", title: "Related work", short: "Related work" },
  { id: "open", title: "Open questions", short: "Open questions" },
];

export const sectionNumber = (id: string) => String(SECTIONS.findIndex((s) => s.id === id) + 1).padStart(2, "0");
