import type { MonsterId } from "./balance";
import type { QuestProgress } from "./types";

/** Regular monsters, easiest realm first. Bosses are not quest targets. */
export const QUEST_KINDS: MonsterId[] = [
  "slug",
  "frog",
  "birdie",
  "mole",
  "crag",
  "dart",
  "frost",
  "icehop",
  "gale",
  "pebble",
  "leaper",
  "hawk",
  "ember",
  "pink",
  "bat",
  "ooze",
  "mutant",
  "wretch",
  "acolyte",
  "herald",
  "seraph",
  "rat",
  "skfrog",
  "vulture",
];

export const QUEST_COUNTS = [50, 250, 500, 1000] as const;
/** 27 monsters × 4 hunts, then 14 harder hunts. The Flaming Phoenix is quest 122. */
export const MAIN_QUESTS = 122;

const EXTRA_KINDS: MonsterId[] = [
  "leaper",
  "hawk",
  "ember",
  "pink",
  "bat",
  "ooze",
  "mutant",
  "wretch",
  "acolyte",
  "herald",
  "seraph",
  "rat",
  "skfrog",
  "vulture",
];
const EXTRA_NEEDS = [1500, 2000, 2500, 3000, 4000, 5000, 6500, 8000, 10000, 12000, 15000, 18000, 22000, 30000];

type QuestStep = { kind: MonsterId; need: number };

function ladder(): QuestStep[] {
  const steps: QuestStep[] = [];
  for (const kind of QUEST_KINDS) for (const need of QUEST_COUNTS) steps.push({ kind, need });
  for (let i = 0; i < EXTRA_KINDS.length && steps.length < MAIN_QUESTS; i++) {
    steps.push({ kind: EXTRA_KINDS[i]!, need: EXTRA_NEEDS[i] ?? 30000 });
  }
  return steps;
}

const STEPS = ladder();

export function monsterName(kind: MonsterId) {
  return NAMES[kind];
}

export function freshQuest(): QuestProgress {
  return { step: 0, kills: 0, accepted: false, repeat: 0 };
}

function stepOf(q: QuestProgress): QuestStep {
  if (q.step >= MAIN_QUESTS) return STEPS[STEPS.length - 1]!;
  return STEPS[q.step] ?? STEPS[STEPS.length - 1]!;
}

export function questMonster(q: QuestProgress): MonsterId {
  return stepOf(q).kind;
}

export function questNeed(q: QuestProgress) {
  const base = stepOf(q).need;
  if (q.step >= MAIN_QUESTS) return base * 2 ** (q.repeat + 1);
  return base;
}

const NAMES: Record<MonsterId, string> = {
  slug: "Forest Slug",
  frog: "Forest Frog",
  birdie: "Songbird",
  mole: "Cave Mole",
  crag: "Cave Spider",
  dart: "Spark Wisp",
  frost: "Ice Seal",
  icehop: "Yeti",
  gale: "Flying Snowball",
  pebble: "Grove Fawn",
  leaper: "Grove Gnome",
  hawk: "Flying Fairy",
  ember: "Ember",
  pink: "Magma Hopper",
  bat: "Flaming Bat",
  ooze: "Acid Serpent",
  mutant: "Mutant Wolf",
  wretch: "Red Flying Demon",
  acolyte: "Asgard Acolyte",
  herald: "Asgard Herald",
  seraph: "Asgard Vulture",
  rat: "Skeleton Rat",
  skfrog: "Skeleton Frog",
  vulture: "Skeleton Vulture",
};

/** Vulture hunts are only the Hel Nightmare flock. */
export function questMap(q: QuestProgress): string | null {
  return questMonster(q) === "vulture" ? "death-nightmare" : null;
}

export function questBlurb(q: QuestProgress) {
  const name = monsterName(questMonster(q));
  const where = questMap(q) ? " on the Hel Nightmare map" : "";
  if (q.step >= MAIN_QUESTS) return `Repeat hunt: ${questNeed(q)} ${name}${where}.`;
  return `Hunt ${questNeed(q)} ${name}${where}.`;
}

export function questReward(q: QuestProgress) {
  const idx = q.step >= MAIN_QUESTS ? QUEST_KINDS.length - 1 : Math.floor(q.step / QUEST_COUNTS.length);
  const need = questNeed(q);
  return Math.round((220 + idx * 110) * (need / 50));
}

export function questReady(q: QuestProgress) {
  return q.accepted && q.kills >= questNeed(q);
}
