
const fmt = (t: number) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`;

interface Source {
  time(): number;
  paused(): boolean;
  play(): void;
  pause(): void;
  seek(t: number): void;
  onChange(f: () => void): void;
}

function videoSource(v: HTMLVideoElement): Source {
  return {
    time: () => v.currentTime,
    paused: () => v.paused,
    play: () => void v.play().catch(() => {}),
    pause: () => v.pause(),
    seek: (t) => (v.currentTime = t),
    onChange: (f) => ["timeupdate", "play", "pause", "seeked", "loadedmetadata", "ended"].forEach((e) => v.addEventListener(e, f)),
  };
}

declare global {
  interface Window {
    YT?: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

function loadYouTubeApi(): Promise<any> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  return new Promise((resolve) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve(window.YT);
    };
    const s = document.createElement("script");
    s.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(s);
  });
}

async function youtubeSource(host: HTMLElement): Promise<Source> {
  const YT = await Promise.race([
    loadYouTubeApi(),
    new Promise<never>((_, rej) => setTimeout(() => rej(new Error("YouTube API did not load")), 6000)),
  ]);
  const listeners: (() => void)[] = [];
  let state = -1;
  const player = await new Promise<any>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("YouTube player not ready")), 8000);
    const p = new YT.Player(host, {
      videoId: host.dataset.yt,
      width: "100%",
      height: "100%",
      host: "https://www.youtube-nocookie.com",
      playerVars: { controls: 0, disablekb: 1, modestbranding: 1, rel: 0, playsinline: 1, mute: 1, iv_load_policy: 3, fs: 0, origin: location.origin },
      events: {
        onReady: () => {
          clearTimeout(t);
          resolve(p);
        },
        onError: (e: { data: number }) => {
          clearTimeout(t);
          reject(new Error("YouTube error " + e.data));
        },
        onStateChange: (e: { data: number }) => {
          state = e.data;
          listeners.forEach((f) => f());
        },
      },
    });
  });
  player.mute();
  return {
    time: () => player.getCurrentTime?.() ?? 0,
    paused: () => state !== YT.PlayerState.PLAYING && state !== YT.PlayerState.BUFFERING,
    play: () => player.playVideo(),
    pause: () => player.pauseVideo(),
    seek: (t) => player.seekTo(t, true),
    onChange: (f) => listeners.push(f),
  };
}

function localVideo(stage: HTMLElement): HTMLVideoElement {
  const v = document.createElement("video");
  v.className = "film-video";
  v.src = stage.dataset.src!;
  v.poster = stage.dataset.poster!;
  v.muted = true;
  v.playsInline = true;
  v.preload = "metadata";
  stage.querySelectorAll(".film-yt, iframe, .film-poster").forEach((n) => n.remove());
  stage.appendChild(v);
  return v;
}

export async function initFilm(): Promise<void> {
  const root = document.getElementById("film");
  if (!root) return;
  const play = root.querySelector<HTMLButtonElement>(".film-play")!;
  const bar = root.querySelector<HTMLElement>(".film-bar")!;
  const time = root.querySelector<HTMLElement>(".film-time")!;
  const segs = [...bar.querySelectorAll<HTMLElement>(".film-seg")];
  const fills = segs.map((s) => s.querySelector<HTMLElement>("b")!);
  const span = segs.map((s) => [Number(s.dataset.a), Number(s.dataset.b)] as const);
  const total = Number(root.dataset.duration);
  const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const stage = root.querySelector<HTMLElement>(".film-stage")!;
  const ytHost = root.querySelector<HTMLElement>(".film-yt");
  let src: Source;
  if (ytHost) {
    try {
      src = await youtubeSource(ytHost);
      src.onChange(() => {
        if (!src.paused()) stage.classList.add("yt-live");
      });
    } catch (err) {
      console.warn("film: playing the local file instead of YouTube:", err);
      src = videoSource(localVideo(stage));
    }
  } else {
    src = videoSource(root.querySelector<HTMLVideoElement>(".film-video")!);
  }

  let wanted = !reduced;
  let visible = false;
  let on = -1;
  const draw = () => {
    const t = src.time();
    span.forEach(([a, b], j) => {
      fills[j].style.width = `${Math.max(0, Math.min(1, (t - a) / (b - a))) * 100}%`;
    });
    const j = span.findIndex(([a, b]) => t >= a && t < b);
    if (j !== on) {
      if (on >= 0) segs[on].classList.remove("on");
      if (j >= 0) segs[j].classList.add("on");
      on = j;
    }
    bar.setAttribute("aria-valuenow", t.toFixed(1));
    time.textContent = `${fmt(t)} / ${fmt(total)}`;
    root.classList.toggle("playing", !src.paused());
    play.setAttribute("aria-label", src.paused() ? "Play" : "Pause");
  };
  const sync = () => (wanted && visible ? src.play() : src.pause());
  const seek = (t: number, start = false) => {
    src.seek(Math.max(0, Math.min(total - 0.05, t)));
    if (start) wanted = true;
    draw();
    sync();
  };

  src.onChange(draw);
  let raf = 0;
  const loop = () => {
    draw();
    raf = requestAnimationFrame(loop);
  };
  src.onChange(() => {
    cancelAnimationFrame(raf);
    if (!src.paused()) raf = requestAnimationFrame(loop);
  });

  const toggle = () => {
    wanted = src.paused();
    sync();
  };
  play.addEventListener("click", toggle);
  stage.addEventListener("click", toggle);

  bar.addEventListener("click", (e) => {
    const target = e.target as HTMLElement;
    const seg = target.closest<HTMLElement>(".film-seg");
    const j = seg ? Number(seg.dataset.j) : segs.findIndex((s) => s.getBoundingClientRect().right >= e.clientX);
    if (j < 0) return;
    const [a, b] = span[j];
    const onBar = !!target.closest("i");
    const r = segs[j].getBoundingClientRect();
    seek(onBar ? a + ((b - a) * (e.clientX - r.left)) / r.width : a, true);
  });
  bar.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      seek(src.time() + (e.key === "ArrowRight" ? 5 : -5));
      e.preventDefault();
    } else if (e.key === " " || e.key === "Enter") {
      toggle();
      e.preventDefault();
    }
  });

  document.querySelectorAll<HTMLAnchorElement>("a.tc[data-t]").forEach((a) => {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      root.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" });
      seek(Number(a.dataset.t), true);
    });
  });

  const m = location.hash.match(/^#t=(\d+(?:\.\d+)?)$/);
  if (m) {
    root.scrollIntoView({ block: "center" });
    seek(Number(m[1]), true);
  }

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(
      (es) => {
        visible = es[0].isIntersecting;
        sync();
      },
      { threshold: 0.35 },
    ).observe(root);
  } else {
    visible = true;
    sync();
  }
  draw();
}
