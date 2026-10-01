import type { ItemInst } from "./types";
import { itemDef } from "./balance";

export type MountDef = {
  id: string;
  name: string;
  cost: number;
  speed: number;
  bound?: boolean;
  blurb: string;
};

export const MOUNTS: MountDef[] = [
  { id: "mount-eagle", name: "Bald Eagle", cost: 8, speed: 5, blurb: "A broad-winged eagle. Movement speed +5 while you hang on." },
  { id: "mount-condor", name: "Skeleton Condor", cost: 16, speed: 10, blurb: "Bone wings and a quiet glide. Movement speed +10." },
  { id: "mount-dragon", name: "Flying Dragon", cost: 24, speed: 15, blurb: "A young sky dragon. Movement speed +15." },
  { id: "mount-raven", name: "Evil Mutant Raven", cost: 32, speed: 20, blurb: "Too many eyes. Movement speed +20." },
  { id: "mount-demon-bat", name: "Demon Bat", cost: 40, speed: 25, blurb: "Half demon, half bat. Movement speed +25." },
  { id: "mount-phoenix", name: "Flaming Phoenix", cost: 8, speed: 25, bound: true, blurb: "On the stable for testing. Bound. Movement speed +25." },
  { id: "mount-wraith", name: "Flying Death Wraith", cost: 50, speed: 30, blurb: "A hooded undead with no wings, only a cloak of night. Movement speed +30." },
];

export const SKINS: { id: string; name: string; cents: number; desc: string }[] = [
  { id: "skin-ember", name: "Ember Plumage", cents: 499, desc: "Fire-feather tint for any mount you own." },
  { id: "skin-frost", name: "Frost Wyrm", cents: 499, desc: "Ice-scale tint. Bound to your account." },
  { id: "skin-royal", name: "Royal Gold", cents: 799, desc: "Gold leaf and white fire. Bound to your account." },
  { id: "skin-void", name: "Void Cloak", cents: 799, desc: "A starless wrap. Bound to your account." },
];

export type SkinRoll = { id: string; name: string; band: "High" | "Medium" | "Low"; weight: number; art: string; hang: "under" | "hammer" };

/** One shared roll. High 20%, Medium is 7% or 5%, Low 1%. Two rolls per Lucky Box. */
export const SKIN_ROLLS: SkinRoll[] = [
  { id: "skin-fairy", name: "Evil Flying Fairy", band: "High", weight: 20, art: "/assets/skins/fairy.png", hang: "under" },
  { id: "skin-angel", name: "Flying Angel", band: "High", weight: 20, art: "/assets/skins/angel.png", hang: "under" },
  { id: "skin-cloud", name: "Godly Arm", band: "High", weight: 20, art: "/assets/skins/cloud.png", hang: "under" },
  { id: "skin-snake", name: "Flying Snake", band: "High", weight: 20, art: "/assets/skins/snake.png", hang: "under" },
  { id: "skin-pegasus", name: "Pegasus", band: "Medium", weight: 5, art: "/assets/skins/pegasus.png", hang: "under" },
  { id: "skin-gryphon", name: "Gryphon", band: "Medium", weight: 5, art: "/assets/skins/gryphon.png", hang: "under" },
  { id: "skin-hammer", name: "Thor's Hammer", band: "Medium", weight: 7, art: "/assets/skins/hammer.png", hang: "under" },
  { id: "skin-chibi", name: "Chibi Valkyrie", band: "Low", weight: 1, art: "/assets/skins/chibi.png", hang: "under" },
  { id: "skin-gargoyle", name: "Gargoyle", band: "Low", weight: 1, art: "/assets/skins/gargoyle.png", hang: "under" },
  { id: "skin-dwarf-dragon", name: "Mutant Dragon Rider", band: "Low", weight: 1, art: "/assets/skins/dwarf-dragon.png", hang: "under" },
];

export function rollMountSkin() {
  const total = SKIN_ROLLS.reduce((sum, row) => sum + row.weight, 0);
  let n = Math.random() * total;
  for (const row of SKIN_ROLLS) {
    n -= row.weight;
    if (n <= 0) return row;
  }
  return SKIN_ROLLS[0]!;
}

export function skinRoll(id: string | undefined) {
  return SKIN_ROLLS.find((row) => row.id === id);
}

export function mountDef(id: string | undefined) {
  return MOUNTS.find((m) => m.id === id);
}

export function skinDef(id: string | undefined) {
  return SKINS.find((s) => s.id === id);
}

export function mountSpeed(id: string | undefined) {
  return mountDef(id)?.speed ?? 0;
}

/** Kids Baseball does not count. Every other throwing weapon is 1 credit per copy. */
export function projectileCredits(bag: ItemInst[]) {
  let n = 0;
  for (const it of bag) {
    const d = itemDef(it.id);
    if (!d?.proj || it.id === "kids-baseball") continue;
    n += it.qty ?? 1;
  }
  return n;
}
