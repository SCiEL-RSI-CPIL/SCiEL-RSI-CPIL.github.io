
export interface Chapter {
  t: number;
  label: string;
  title: string;
}

export const FILM = {
  youtube: "0H6aooDj3Ss",
  src: "/video/sciel-film.mp4",
  poster: "/video/sciel-film-poster.jpg",
  duration: 223.6,
  chapters: [
    { t: 0, label: "Results", title: "Recent results from one open 27B model" },
    { t: 24, label: "One rule, three groups", title: "One learned rule serves the largest group best; teaching each other changes that" },
    { t: 50, label: "One real run", title: "One real run: demes, findings, and the learned layers that steer it" },
    { t: 69, label: "Bandits", title: "Bandits bet on the kinds of edit that have just paid off" },
    { t: 79, label: "World model", title: "The world model forecasts what is likely to help" },
    { t: 99, label: "Step policy", title: "The step policy moves the odds one bounded step" },
    { t: 119, label: "Cells", title: "Research cells write tools; findings are kept only where they help" },
    { t: 130, label: "Demes", title: "Which deme goes next" },
    { t: 140, label: "Steps", title: "Most attempts do not help; the best so far climbs in steps" },
    { t: 153, label: "Tao", title: "A recent example: Terence Tao's list of optimization constants" },
    { t: 159, label: "Constant 1d", title: "Constant 1d in 3D: every attempt of one run, and the bounds published since 2010" },
    { t: 197, label: "Records", title: "Where one 27B model beat the published value" },
    { t: 215, label: "Claim", title: "A relatively small, frozen model can keep getting better from its own experience" },
  ] as Chapter[],
};
