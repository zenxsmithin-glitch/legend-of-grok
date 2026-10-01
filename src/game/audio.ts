type Theme = "title" | "city" | "forest" | "fire" | "death" | "jail";

const SCALES: Record<Exclude<Theme, "title">, number[]> = {
  forest: [262, 294, 330, 392, 440, 392, 330, 294],
  fire: [196, 233, 277, 311, 370, 311, 247, 220],
  death: [131, 156, 196, 233, 196, 155, 131, 110],
  city: [330, 392, 440, 494, 523, 494, 440, 392],
  jail: [110, 123, 110, 98],
};

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let musicGain: GainNode | null = null;
let sfxGain: GainNode | null = null;
let unlocked = false;
let muted = false;
let theme: Theme = "city";
let step = 0;
let nextNote = 0;
let titleLoop = 0;

/** Client-only soundtrack. Other players do not share playback position. */
const MUSIC_VOL = 0.72;
const TRACK_SRC: Partial<Record<TrackId, string>> = {
  main: "/assets/audio/main-theme.mp3",
  asgard: "/assets/audio/asgard-theme.mp3",
  nightmare: "/assets/audio/nightmare-boss.mp3",
};
type TrackId = "main" | "asgard" | "nightmare" | "boss";

let currentTrack: TrackId | null = null;
const players = new Map<TrackId, HTMLAudioElement>();

function musicEl(id: TrackId): HTMLAudioElement | null {
  const src = TRACK_SRC[id];
  if (!src || typeof Audio === "undefined") return null;
  let el = players.get(id);
  if (!el) {
    el = new Audio(src);
    el.loop = true;
    el.preload = "auto";
    el.volume = muted ? 0 : MUSIC_VOL;
    el.addEventListener("ended", () => {
      if (currentTrack !== id || muted) return;
      el!.currentTime = 0;
      void el!.play().catch(() => {});
    });
    players.set(id, el);
  }
  return el;
}

function stopAudible() {
  for (const el of players.values()) el.pause();
}

/** Same track keeps its place. A different track starts over. Missing files stay silent. */
export function playTrack(next: TrackId | null) {
  if (next === currentTrack) {
    const el = next ? musicEl(next) : null;
    if (el && el.paused && !muted) void el.play().catch(() => {});
    return;
  }
  stopAudible();
  currentTrack = next;
  const el = next ? musicEl(next) : null;
  if (!el) return;
  el.currentTime = 0;
  el.volume = muted ? 0 : MUSIC_VOL;
  void el.play().catch(() => {});
}

export function syncMapMusic(map: { id: string; theme: string; boss?: string; bosses?: readonly string[] }) {
  const bosses = map.bosses ?? (map.boss ? [map.boss] : []);
  const lead = map.boss ?? bosses[0] ?? "";
  const has = (id: string) => lead === id || bosses.includes(id);
  if (map.id === "fenrir-pit" || has("fenrir") || map.id === "serpent-barge" || has("jormungand") || has("valkyrie")) {
    playTrack("nightmare");
    return;
  }
  if (map.id === "yggdrasil" || has("mimir") || has("freyja2") || map.theme === "asgard") {
    playTrack("asgard");
    return;
  }
  if (map.id.includes("nightmare") || lead) {
    playTrack("nightmare");
    return;
  }
  playTrack("main");
}

function ac(): AudioContext | null {
  if (!unlocked || !ctx || ctx.state !== "running") return null;
  return ctx;
}

function adoptBootContext() {
  const boot = window as Window & { __midgardAudio?: AudioContext; __midgardMaster?: GainNode };
  if (ctx || !boot.__midgardAudio) return;
  ctx = boot.__midgardAudio;
  master = boot.__midgardMaster ?? ctx.createGain();
  if (!boot.__midgardMaster) master.connect(ctx.destination);
  musicGain = ctx.createGain();
  sfxGain = ctx.createGain();
  musicGain.gain.value = 0.42;
  sfxGain.gain.value = 1.8;
  musicGain.connect(master);
  sfxGain.connect(master);
}

function poke() {
  if (!ctx || !master) return;
  try {
    const buf = ctx.createBuffer(1, 1, ctx.sampleRate);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(master);
    src.start();
  } catch {
    /* a locked phone ignores the first buffer */
  }
}

export function unlockAudio() {
  adoptBootContext();
  if (!ctx) {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new Ctor();
    master = ctx.createGain();
    musicGain = ctx.createGain();
    sfxGain = ctx.createGain();
    musicGain.gain.value = 0.42;
    sfxGain.gain.value = 1.8;
    musicGain.connect(master);
    sfxGain.connect(master);
    master.connect(ctx.destination);
  }
  unlocked = true;
  try {
    const session = (navigator as Navigator & { audioSession?: { type: string } }).audioSession;
    if (session) session.type = "playback";
  } catch {
    /* older browsers */
  }
  poke();
  if (ctx.state !== "running") {
    void ctx.resume().then(() => {
      poke();
    });
  }
}

export function setTheme(next: Theme) {
  if (theme !== next) step = 0;
  theme = next;
}

export function startTitleMusic() {
  unlockAudio();
  playTrack("main");
}

export function stopTitleMusic() {
  if (titleLoop) cancelAnimationFrame(titleLoop);
  titleLoop = 0;
}

export function toggleMute() {
  muted = !muted;
  if (musicGain && ctx) musicGain.gain.setTargetAtTime(muted ? 0 : 0.42, ctx.currentTime, 0.03);
  for (const el of players.values()) el.volume = muted ? 0 : MUSIC_VOL;
  return muted;
}

export function isMuted() {
  return muted;
}

function tone(freq: number, dur: number, type: OscillatorType, gain: number, slide = 0) {
  gain *= 2.6;
  const c = ac();
  if (!c || !sfxGain) return;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, c.currentTime);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), c.currentTime + dur);
  g.gain.setValueAtTime(gain, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
  o.connect(g);
  g.connect(sfxGain);
  o.start();
  o.stop(c.currentTime + dur + 0.02);
  o.onended = () => {
    o.disconnect();
    g.disconnect();
  };
}

function noise(dur: number, gain: number) {
  gain *= 2.6;
  const c = ac();
  if (!c || !sfxGain) return;
  const n = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, n, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const src = c.createBufferSource();
  src.buffer = buf;
  const g = c.createGain();
  g.gain.value = gain;
  const f = c.createBiquadFilter();
  f.type = "lowpass";
  f.frequency.value = 900;
  src.connect(f);
  f.connect(g);
  g.connect(sfxGain);
  src.start();
  src.onended = () => {
    src.disconnect();
    g.disconnect();
    f.disconnect();
  };
}

export function sfx(name: string) {
  const j = 0.94 + Math.random() * 0.12;
  switch (name) {
    case "jump":
      tone(420 * j, 0.12, "square", 0.12, 180);
      break;
    case "land":
      tone(140, 0.06, "triangle", 0.1);
      break;
    case "step":
      noise(0.04, 0.05);
      break;
    case "throw":
      tone(640 * j, 0.08, "square", 0.08, -200);
      break;
    case "hit":
      tone(220 * j, 0.08, "sawtooth", 0.1, -80);
      noise(0.05, 0.06);
      break;
    case "crit":
      tone(880, 0.1, "square", 0.12, 200);
      tone(1320, 0.14, "triangle", 0.08);
      break;
    case "stomp":
      tone(180, 0.1, "square", 0.14, -60);
      noise(0.08, 0.1);
      break;
    case "hurt":
      tone(160, 0.16, "sawtooth", 0.14, -90);
      break;
    case "death":
      tone(300, 0.4, "triangle", 0.16, -220);
      break;
    case "coin":
      tone(880, 0.07, "square", 0.08);
      tone(1320, 0.1, "square", 0.06);
      break;
    case "pickup":
      tone(520, 0.08, "triangle", 0.1, 200);
      break;
    case "level":
      fanfare(523, 0, 0.22, 0.07);
      fanfare(659, 0.09, 0.22, 0.07);
      fanfare(784, 0.18, 0.24, 0.08);
      fanfare(1046, 0.3, 0.42, 0.09);
      spark(0.16);
      spark(0.34);
      spark(0.52);
      break;
    case "potion":
      playPotionClip();
      break;
    case "buy":
      tone(500, 0.08, "triangle", 0.08);
      tone(750, 0.1, "triangle", 0.08);
      break;
    case "climb":
      noise(0.05, 0.04);
      break;
    case "block":
      tone(240, 0.08, "square", 0.12);
      noise(0.04, 0.08);
      break;
    case "ui":
      tone(660, 0.05, "square", 0.06);
      break;
    case "boss":
      tone(90, 0.4, "sawtooth", 0.16);
      tone(140, 0.45, "square", 0.08);
      break;
    case "portal":
      tone(400, 0.18, "sine", 0.1, 300);
      break;
    case "jail":
      tone(100, 0.3, "square", 0.12);
      break;
    default:
      break;
  }
}

function playPotionClip() {
  if (typeof Audio === "undefined") return;
  let clip = potionClip;
  if (!clip) {
    clip = new Audio("/assets/audio/potion.mp3");
    clip.preload = "auto";
    potionClip = clip;
  }
  clip.volume = 1;
  try {
    clip.currentTime = 0;
  } catch {
    /* still loading */
  }
  void clip.play().catch(() => {});
}

let potionClip: HTMLAudioElement | null = null;

function fanfare(freq: number, when: number, dur: number, gain: number) {
  gain *= 2.6;
  const c = ac();
  if (!c || !sfxGain) return;
  const t = c.currentTime + when;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = "triangle";
  o.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g);
  g.connect(sfxGain);
  o.start(t);
  o.stop(t + dur + 0.02);
  o.onended = () => {
    o.disconnect();
    g.disconnect();
  };
}

function spark(when: number) {
  const c = ac();
  if (!c || !sfxGain) return;
  const t = c.currentTime + when;
  const n = Math.floor(c.sampleRate * 0.08);
  const buf = c.createBuffer(1, n, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const src = c.createBufferSource();
  src.buffer = buf;
  const g = c.createGain();
  const f = c.createBiquadFilter();
  f.type = "highpass";
  f.frequency.value = 1800;
  g.gain.setValueAtTime(0.16, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
  src.connect(f);
  f.connect(g);
  g.connect(sfxGain);
  src.start(t);
  const o = c.createOscillator();
  const og = c.createGain();
  o.type = "sine";
  o.frequency.setValueAtTime(1600 + Math.random() * 700, t);
  o.frequency.exponentialRampToValueAtTime(700, t + 0.12);
  og.gain.setValueAtTime(0.0001, t);
  og.gain.exponentialRampToValueAtTime(0.16, t + 0.01);
  og.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
  o.connect(og);
  og.connect(sfxGain);
  o.start(t);
  o.stop(t + 0.16);
  o.onended = () => {
    o.disconnect();
    og.disconnect();
  };
}

function blip(freq: number, dur: number, type: OscillatorType, gain: number, cutoff = 2200, at?: number) {
  const c = ac();
  if (!c || !musicGain || freq <= 0) return;
  const t = at ?? c.currentTime;
  const o = c.createOscillator();
  const g = c.createGain();
  const f = c.createBiquadFilter();
  f.type = "lowpass";
  f.frequency.setValueAtTime(cutoff, t);
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  const attack = Math.min(0.02, dur * 0.2);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(dur, attack + 0.03));
  o.connect(f);
  f.connect(g);
  g.connect(musicGain);
  o.start(t);
  o.stop(t + dur + 0.05);
  o.onended = () => {
    o.disconnect();
    g.disconnect();
    f.disconnect();
  };
}

function kick() {
  const c = ac();
  if (!c || !musicGain) return;
  const t = c.currentTime;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = "sine";
  o.frequency.setValueAtTime(150, t);
  o.frequency.exponentialRampToValueAtTime(46, t + 0.12);
  g.gain.setValueAtTime(0.16, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
  o.connect(g);
  g.connect(musicGain);
  o.start(t);
  o.stop(t + 0.18);
  o.onended = () => {
    o.disconnect();
    g.disconnect();
  };
}

const CITY_LEAD = [
  523, 659, 784, 659, 880, 784, 659, 587, 784, 880, 1047, 880, 784, 659, 587, 523, 587, 698, 880, 784, 698, 659, 587, 523, 659, 784,
  659, 587, 523, 392, 440, 523,
];
const CITY_BASS = [131, 0, 131, 0, 98, 0, 98, 0, 110, 0, 110, 0, 98, 0, 131, 0, 87, 0, 87, 0, 131, 0, 98, 0, 110, 0, 98, 0, 73, 0, 131, 0];
const CITY_CHORDS = [
  [262, 330, 392],
  [220, 262, 330],
  [175, 220, 262],
  [196, 247, 294],
];

function playCity() {
  const i = step % CITY_LEAD.length;
  const lead = CITY_LEAD[i] ?? 0;
  const bass = CITY_BASS[i] ?? 0;
  blip(lead, 0.16, "square", 0.07, 1600);
  if (lead) blip(lead * 2, 0.05, "triangle", 0.025, 3200);
  blip(bass, 0.2, "triangle", 0.1, 420);
  if (i % 8 === 0) {
    const chord = CITY_CHORDS[Math.floor(i / 8) % CITY_CHORDS.length] ?? [];
    for (const n of chord) blip(n, 0.7, "sine", 0.035, 900);
  }
  if (i % 4 === 0) kick();
  step++;
  const c = ac();
  if (c) nextNote = c.currentTime + 0.1875;
}

const TITLE_BELLS = [
  1319, 1568, 1760, 2093, 2349, 2093, 1760, 1568, 1319, 1568, 2093, 2637, 2349, 2093, 1760, 1568, 1175, 1319, 1568, 1760, 2093, 1760,
  1568, 1319, 1568, 1976, 2349, 2637, 2349, 2093, 1760, 1568,
];

function chime(freq: number, when: number, gain: number) {
  const c = ac();
  if (!c || !musicGain || freq <= 0) return;
  const peak = Math.max(0.0002, gain);
  const strike = (multiple: number, amount: number, dur: number) => {
    const osc = c.createOscillator();
    const amp = c.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq * multiple, when);
    amp.gain.setValueAtTime(0.0001, when);
    amp.gain.exponentialRampToValueAtTime(peak * amount, when + 0.012);
    amp.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    osc.connect(amp);
    amp.connect(musicGain!);
    osc.start(when);
    osc.stop(when + dur + 0.02);
    osc.onended = () => {
      osc.disconnect();
      amp.disconnect();
    };
  };
  strike(1, 1, 0.55);
  strike(2.76, 0.28, 0.32);
  strike(4.02, 0.12, 0.16);
}

function playTitle() {
  const c = ac();
  if (!c) return;
  const when = Math.max(c.currentTime + 0.02, nextNote);
  const i = step % TITLE_BELLS.length;
  const freq = TITLE_BELLS[i] ?? 1568;
  const bloom = Math.min(1, 0.55 + step * 0.1);
  chime(freq, when, 0.05 * bloom);
  step++;
  nextNote = when + 0.17;
}

export function musicTick() {
  return;
}

if (typeof document !== "undefined") {
  const resumeSong = () => {
    if (!currentTrack || muted) return;
    const el = musicEl(currentTrack);
    if (el && el.paused) void el.play().catch(() => {});
  };
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && ctx?.state === "suspended") void ctx.resume();
    if (document.visibilityState === "visible") resumeSong();
  });
  window.addEventListener("pointerdown", resumeSong, true);
}
