import type { EquipSlot, HeroId, ItemInst, SaveState, StatKey } from "./types";

export const HEROES: { id: HeroId; name: string; blurb: string; bonus: StatKey }[] = [
  { id: "hermy", name: "Hermy", blurb: "A hooded wanderer. Luck walks with him.", bonus: "luck" },
  { id: "champo", name: "Champo", blurb: "A knight in silver plate.", bonus: "str" },
  { id: "tanya", name: "Tanya", blurb: "An assassin. Fast hands.", bonus: "agi" },
  { id: "trizzle", name: "Trizzle", blurb: "An elf of the old canopy.", bonus: "dex" },
  { id: "luna", name: "Luna", blurb: "A cleric with a sturdy heart.", bonus: "vit" },
  { id: "ezekiel", name: "Ezekiel", blurb: "Star-robed mage. A keen mind.", bonus: "int" },
  { id: "yeti", name: "Baby Yeti", blurb: "The jotunheim cub. Free after 10 reborns. +2 in every stat.", bonus: "vit" },
];

/** Baby Yeti stays locked until any hero on the account has reborn this many times. */
export const YETI_REBORNS = 10;
/** On so the cub can be tested. The 10-reborn lock still runs when this is false. */
export const YETI_TEST_UNLOCK = true;

export function yetiUnlocked(maxReborn: number) {
  return YETI_TEST_UNLOCK || maxReborn >= YETI_REBORNS;
}

export type ItemKind = "weapon" | "head" | "body" | "legs" | "acc" | "neck" | "ring" | "belt" | "earring" | "bracelet" | "charm" | "card" | "mount" | "skin" | "potion" | "gem" | "relic";
export type ShopId = "potion" | "item" | "auction";

export type CatalogItem = {
  id: string;
  name: string;
  kind: ItemKind;
  price: number;
  shop?: ShopId;
  def?: number;
  power?: number;
  sp?: number;
  speed?: number;
  proj?: string;
  heal?: number;
  restore?: number;
  str?: number;
  agi?: number;
  vit?: number;
  int?: number;
  dex?: number;
  luck?: number;
  bonusHp?: number;
  bonusSp?: number;
  desc: string;
  border?: string;
  monster?: string;
  boss?: string;
  epic?: boolean;
  bound?: boolean;
};

export const CATALOG: CatalogItem[] = [
  { id: "kids-baseball", name: "Kids Baseball", kind: "weapon", price: 400, shop: "auction", power: 36, sp: 2, speed: 560, proj: "baseball", desc: "A scuffed ball. Weak, but it flies." },
  { id: "ancient-rock", name: "Ancient Rock", kind: "weapon", price: 2200, shop: "auction", power: 70, sp: 4, speed: 480, proj: "rock", desc: "Heavy stone from a buried altar." },
  { id: "icicles", name: "Icicles", kind: "weapon", price: 7000, shop: "auction", power: 120, sp: 5, speed: 620, proj: "icicle", desc: "Cold needles that never melt." },
  { id: "fire-balls", name: "Fire Balls", kind: "weapon", price: 32000, shop: "auction", power: 340, sp: 8, speed: 540, proj: "pfire", desc: "Surtur's ember, bottled." },
  { id: "acid-bombs", name: "Acid Bombs", kind: "weapon", price: 70000, shop: "auction", power: 520, sp: 10, speed: 460, proj: "acid", desc: "They hiss when they land." },
  { id: "comets", name: "Comets", kind: "weapon", price: 140000, shop: "auction", power: 820, sp: 14, speed: 520, proj: "comet", desc: "A falling star you can throw." },
  { id: "celestial-boomerang", name: "Celestial Boomerang", kind: "weapon", price: 50, shop: "auction", power: 1400, sp: 18, speed: 440, proj: "boomerang", desc: "Test listing. Flies out, pierces, and comes home hitting again." },
  { id: "magic-stars", name: "Magic Stars", kind: "weapon", price: 9000, shop: "auction", power: 160, sp: 4, speed: 680, proj: "star", desc: "Pale gold throwing stars. They spin as they fly." },

  { id: "vine-hood", name: "Vine Hood", kind: "head", price: 350, shop: "item", def: 8, desc: "Woven canopy leather." },
  { id: "bark-tunic", name: "Bark Tunic", kind: "body", price: 280, shop: "item", def: 5, desc: "Stiff, but it turns a slug." },
  { id: "moss-trousers", name: "Moss Trousers", kind: "legs", price: 220, shop: "item", def: 3, desc: "Soft and quiet." },
  { id: "dew-charm", name: "Dew Charm", kind: "charm", price: 500, shop: "item", luck: 2, desc: "A bead of morning. Charm slot." },
  { id: "talaria", name: "Talaria", kind: "relic", price: 50, shop: "item", desc: "Winged sandals. Use one from your bag to fly back to Midgard." },
  { id: "yggdrasil-branch", name: "Yggdrasil Branch", kind: "relic", price: 280, shop: "item", desc: "Use it beside a fallen player, then press their body. It cannot revive you." },
  { id: "key-red", name: "Red Key", kind: "relic", price: 50, shop: "item", desc: "Heimdall's key. Opens the Bifrost door." },
  { id: "key-blue", name: "Blue Key", kind: "relic", price: 50, shop: "item", desc: "Tyr's key. Opens the castle door." },
  { id: "key-gold", name: "Gold Key", kind: "relic", price: 50, shop: "item", desc: "Skadi's key. Opens the last Asgard door." },
  { id: "key-pink", name: "Pink Key", kind: "relic", price: 50, shop: "item", desc: "Freyja's key. Opens the next High Thingstead door." },
  { id: "key-green", name: "Green Key", kind: "relic", price: 50, shop: "item", desc: "Hela's key. Opens the next High Thingstead door." },
  { id: "key-purple", name: "Purple Key", kind: "relic", price: 50, shop: "item", desc: "Thor's key. Opens the Valkyrie's door." },
  { id: "key-silver", name: "Silver Key", kind: "relic", price: 50, shop: "item", desc: "Loki's key. One of the seven keys." },
  { id: "dwarf-ring", name: "Dwarf Ring", kind: "ring", price: 50, shop: "item", luck: 50, epic: true, desc: "Epic ring from the Valkyrie. Equip it in the ring slot. +50 Luck." },
  { id: "brisingamen", name: "Brísingamen", kind: "neck", price: 50, shop: "item", str: 50, epic: true, desc: "Epic necklace from the Dwarf of Terror. +50 Strength while worn." },
  { id: "mimir-earrings", name: "Mimir's Earrings", kind: "earring", price: 50, shop: "item", int: 50, epic: true, desc: "Purple epic earrings from Mimir. +50 Int while worn." },
  { id: "wolf-charm", name: "Wolf Charm", kind: "charm", price: 50, shop: "item", agi: 50, epic: true, desc: "Epic charm from Fenrir. +50 Agility while worn." },
  { id: "serpent-belt", name: "Serpent Belt", kind: "belt", price: 50, shop: "item", dex: 50, epic: true, desc: "Epic belt from Jormungand. +50 Dex while worn." },
  { id: "odin-bracelet", name: "Odin's Bracelet", kind: "bracelet", price: 50, shop: "item", vit: 50, epic: true, desc: "Epic bracelet from Odin. +50 Vitality while worn." },
  { id: "skin-box", name: "Lucky Mount Skin Box", kind: "relic", price: 0, bound: true, desc: "Use it. Two random mount skins. They bind and cannot drop." },
  { id: "skin-fairy", name: "Evil Flying Fairy", kind: "skin", price: 0, bound: true, desc: "High chance. The mount becomes this fairy. You hang under it." },
  { id: "skin-angel", name: "Flying Angel", kind: "skin", price: 0, bound: true, desc: "High chance. The mount becomes this angel. You hang under it." },
  { id: "skin-cloud", name: "Godly Arm", kind: "skin", price: 0, bound: true, desc: "High chance. A cloud arm holds you underneath." },
  { id: "skin-snake", name: "Flying Snake", kind: "skin", price: 0, bound: true, desc: "High chance. You hang under the flying snake." },
  { id: "skin-pegasus", name: "Pegasus", kind: "skin", price: 0, bound: true, desc: "Medium chance. A strap. You hang underneath." },
  { id: "skin-gryphon", name: "Gryphon", kind: "skin", price: 0, bound: true, desc: "Medium chance. You hang under the gryphon." },
  { id: "skin-hammer", name: "Thor's Hammer", kind: "skin", price: 0, bound: true, desc: "Medium chance. You hang on underneath." },
  { id: "skin-chibi", name: "Chibi Valkyrie", kind: "skin", price: 0, bound: true, desc: "Low chance. You hang from her feet." },
  { id: "skin-gargoyle", name: "Gargoyle", kind: "skin", price: 0, bound: true, desc: "Low chance. You hang under the gargoyle." },
  { id: "skin-dwarf-dragon", name: "Mutant Dragon Rider", kind: "skin", price: 0, bound: true, desc: "Low chance. A dwarf rides the dragon. You hang underneath." },

  { id: "catcher-mask", name: "Catcher's Mask", kind: "head", price: 0, def: 22, desc: "The forest boss's own cage." },
  { id: "chest-guard", name: "Chest Guard", kind: "body", price: 0, def: 12, desc: "Dented iron and red cloth." },
  { id: "knee-pads", name: "Knee Pads", kind: "legs", price: 0, def: 8, desc: "Built for hard landings." },
  { id: "lucky-mitt", name: "Lucky Mitt", kind: "bracelet", price: 0, luck: 3, def: 2, desc: "The glove that always finds the ball. Bracelet slot." },

  { id: "cinder-cap", name: "Cinder Cap", kind: "head", price: 1800, shop: "item", def: 16, desc: "Warm even in the wind." },
  { id: "magma-coat", name: "Magma Coat", kind: "body", price: 1400, shop: "item", def: 10, desc: "Smells like a forge." },
  { id: "ash-greaves", name: "Ash Greaves", kind: "legs", price: 1100, shop: "item", def: 7, desc: "Blackened but sound." },
  { id: "ember-bead", name: "Ember Bead", kind: "charm", price: 2000, shop: "item", int: 2, desc: "A coal that never dies. Charm slot." },

  { id: "horned-crown", name: "Horned Crown", kind: "head", price: 0, def: 36, str: 2, desc: "Surtur's broken horn, set in gold." },
  { id: "skull-belt", name: "Skull Belt", kind: "belt", price: 0, def: 20, desc: "A trophy worn at the waist. Belt slot." },
  { id: "lava-boots", name: "Lava Boots", kind: "legs", price: 0, def: 14, dex: 1, desc: "They smoke when you land." },
  { id: "inferno-heart", name: "Inferno Heart", kind: "charm", price: 0, str: 4, desc: "It beats with stolen fire. Charm slot." },

  { id: "bone-crown", name: "Bone Crown", kind: "head", price: 6000, shop: "item", def: 28, desc: "Rats won't meet your eyes." },
  { id: "ribcage-mail", name: "Ribcage Mail", kind: "body", price: 4800, shop: "item", def: 16, desc: "Someone else's ribs." },
  { id: "grave-greaves", name: "Grave Greaves", kind: "legs", price: 4000, shop: "item", def: 11, desc: "Cold as a crypt floor." },
  { id: "rat-tail", name: "Rat Tail Charm", kind: "charm", price: 5200, shop: "item", agi: 3, desc: "Ugly. Fast. Charm slot." },

  { id: "star-circlet", name: "Star Circlet", kind: "head", price: 0, def: 64, int: 3, desc: "The finest helm in Midgard. Heads matter when the sky falls on you." },
  { id: "cult-robe", name: "Cult Robe", kind: "body", price: 0, def: 34, desc: "Red wool and a brass star." },
  { id: "cloven-greaves", name: "Cloven Greaves", kind: "legs", price: 0, def: 22, desc: "Made for hooves, fits you anyway." },
  { id: "baphomet-eye", name: "Baphomet's Eye", kind: "charm", price: 0, luck: 5, int: 3, desc: "It watches the throw come back. Charm slot." },

  { id: "red-vial", name: "Red Vial", kind: "potion", price: 40, shop: "potion", heal: 40, desc: "A sip of the witch's small brew." },
  { id: "red-flask", name: "Red Flask", kind: "potion", price: 140, shop: "potion", heal: 110, desc: "Fills a deep wound." },
  { id: "blue-vial", name: "Blue Vial", kind: "potion", price: 40, shop: "potion", restore: 30, desc: "Sharp and cold. Restores SP." },
  { id: "blue-flask", name: "Blue Flask", kind: "potion", price: 140, shop: "potion", restore: 80, desc: "Enough spirit for a long fight." },
  { id: "violet-tonic", name: "Violet Tonic", kind: "potion", price: 220, shop: "potion", heal: 70, restore: 40, desc: "Body and spirit together." },
  { id: "gold-elixir", name: "Gold Elixir", kind: "potion", price: 800, shop: "potion", heal: 9999, restore: 9999, desc: "The witch's pride. Fully restores HP and SP." },
  { id: "soul-gem", name: "Soul Stone", kind: "gem", price: 0, desc: "3 charges. On death the stone drops instead of your bag, gold, and equipment. Whoever picks it up gets one less charge." },
  { id: "mount-eagle", name: "Bald Eagle", kind: "mount", price: 0, desc: "Flying mount. Movement speed +5 while you hang on. Bought at the stable for 8 projectile weapons." },
  { id: "mount-condor", name: "Skeleton Condor", kind: "mount", price: 0, desc: "Flying mount. Movement speed +10. Costs 16 projectile weapons." },
  { id: "mount-dragon", name: "Flying Dragon", kind: "mount", price: 0, desc: "Flying mount. Movement speed +15. Costs 24 projectile weapons." },
  { id: "mount-raven", name: "Evil Mutant Raven", kind: "mount", price: 0, desc: "Flying mount. Movement speed +20. Costs 32 projectile weapons." },
  { id: "mount-demon-bat", name: "Demon Bat", kind: "mount", price: 0, desc: "Flying mount. Movement speed +25. Costs 40 projectile weapons." },
  { id: "mount-wraith", name: "Flying Death Wraith", kind: "mount", price: 0, desc: "Flying mount. Movement speed +30. Costs 50 projectile weapons." },
  { id: "mount-phoenix", name: "Flaming Phoenix", kind: "mount", price: 0, bound: true, desc: "Complete all 122 quests and receive The Flaming Phoenix Mount. The only Binded, and Undroppable Mount. Movement speed +25. Cannot be dropped, sold, traded, or listed." },
  { id: "skin-ember", name: "Ember Plumage", kind: "skin", price: 0, bound: true, desc: "Cash-shop mount skin. Bound to your account. Needs a mount." },
  { id: "skin-frost", name: "Frost Wyrm", kind: "skin", price: 0, bound: true, desc: "Cash-shop mount skin. Bound to your account. Needs a mount." },
  { id: "skin-royal", name: "Royal Gold", kind: "skin", price: 0, bound: true, desc: "Cash-shop mount skin. Bound to your account. Needs a mount." },
  { id: "skin-void", name: "Void Cloak", kind: "skin", price: 0, bound: true, desc: "Cash-shop mount skin. Bound to your account. Needs a mount." },
];

const BY_ID = new Map(CATALOG.map((c) => [c.id, c]));

export function itemDef(id: string | undefined): CatalogItem | undefined {
  if (!id) return undefined;
  return BY_ID.get(id);
}

export function newItem(id: string, charges?: number): ItemInst {
  const bound = itemDef(id)?.bound ? true : undefined;
  return { uid: crypto.randomUUID(), id, ...(charges != null ? { charges } : {}), ...(bound ? { bound: true } : {}) };
}

export function isBoundItem(it: ItemInst | undefined): boolean {
  if (!it) return false;
  if (it.bound || it.id === "mount-phoenix" || it.id.startsWith("skin-")) return true;
  return !!itemDef(it.id)?.bound;
}

export function stackable(id: string): boolean {
  const d = itemDef(id);
  if (!d) return false;
  if (d.kind === "gem") return false;
  if (id === "mount-phoenix") return false;
  return true;
}

/** Puts a stackable on an existing pile. Returns false if the bag is full. */
export function stackInto(bag: ItemInst[], item: ItemInst, max = 100, front = true): boolean {
  const add = item.qty ?? 1;
  if (stackable(item.id) && item.charges == null) {
    const idx = bag.findIndex((it) => it.id === item.id && it.charges == null && !!it.bound === !!item.bound && (it.skin ?? "") === (item.skin ?? "") && (it.plus ?? 0) === (item.plus ?? 0));
    if (idx >= 0) {
      const have = bag[idx]!;
      have.qty = (have.qty ?? 1) + add;
      if (front && idx > 0) {
        bag.splice(idx, 1);
        bag.unshift(have);
      }
      return true;
    }
  }
  if (bag.length >= max) return false;
  const row = { ...item, qty: add };
  if (front) bag.unshift(row);
  else bag.push(row);
  return true;
}

/** Merge identical stacks already sitting in a bag. Soul stones stay split by charges. */
export function consolidateBag(bag: ItemInst[]) {
  const next: ItemInst[] = [];
  for (const item of bag) {
    if (!stackInto(next, { ...item }, 9999, false)) next.push({ ...item });
  }
  bag.splice(0, bag.length, ...next);
}

const SLOT_OF: Record<ItemKind, EquipSlot | null> = {
  weapon: "weapon",
  head: "head",
  body: "body",
  legs: "legs",
  acc: "charm",
  neck: "neck",
  ring: "ring",
  belt: "belt",
  earring: "earring",
  bracelet: "bracelet",
  charm: "charm",
  card: "card",
  mount: "mount",
  skin: null,
  potion: null,
  gem: null,
  relic: null,
};

export function slotFor(id: string): EquipSlot | null {
  const d = itemDef(id);
  return d ? SLOT_OF[d.kind] : null;
}

export function nextExp(level: number): number {
  const base = Math.round(140 * level * level + 80 * level);
  if (level < 90) return base;
  return Math.round(base * Math.pow(1.65, level - 89));
}

export function registerItems(items: CatalogItem[]) {
  for (const item of items) {
    if (BY_ID.has(item.id)) continue;
    CATALOG.push(item);
    BY_ID.set(item.id, item);
  }
}

type BonusKey = "str" | "agi" | "vit" | "int" | "dex" | "luck" | "def";

function gearBonus(state: SaveState, key: BonusKey): number {
  let n = 0;
  for (const it of Object.values(state.equip)) {
    if (!it) continue;
    const d = itemDef(it.id);
    if (!d) continue;
    n += (d[key] as number | undefined) ?? 0;
    if (d.kind === "card" && it.plus && d[key]) n += it.plus;
  }
  return n;
}

/** Gear, cards, and guild points. Not the points you spent yourself. */
export function bonusOf(state: SaveState, key: StatKey): number {
  return gearBonus(state, key) + (state.guildBonus ?? 0);
}

export function statsOf(state: SaveState) {
  const guild = state.guildBonus ?? 0;
  return {
    str: state.str + gearBonus(state, "str") + guild,
    agi: state.agi + gearBonus(state, "agi") + guild,
    vit: state.vit + gearBonus(state, "vit") + guild,
    int: state.int + gearBonus(state, "int") + guild,
    dex: state.dex + gearBonus(state, "dex") + guild,
    luck: state.luck + gearBonus(state, "luck") + guild,
    def: gearBonus(state, "def") + (state.vit + gearBonus(state, "vit") + guild) * 1,
  };
}

function gearNumber(state: SaveState, key: "bonusHp" | "bonusSp"): number {
  let n = 0;
  for (const it of Object.values(state.equip)) {
    if (!it) continue;
    const d = itemDef(it.id);
    if (!d) continue;
    n += d[key] ?? 0;
    if (d.kind === "card" && it.plus && d[key]) n += it.plus;
  }
  return n;
}

export function maxHp(state: SaveState): number {
  const s = statsOf(state);
  return 90 + (state.level - 1) * 14 + s.vit * 6 + gearNumber(state, "bonusHp");
}

export function maxSp(state: SaveState): number {
  const s = statsOf(state);
  return 40 + (state.level - 1) * 6 + s.int * 4 + gearNumber(state, "bonusSp");
}

export function jumpVelocity(state: SaveState): number {
  const s = statsOf(state);
  return -(820 + s.dex * 3.2);
}

export function throwCooldown(state: SaveState): number {
  const s = statsOf(state);
  return Math.max(0.1, 0.5 - s.agi * 0.006);
}

export function stompDamage(state: SaveState): number {
  const s = statsOf(state);
  return 10 + state.level * 1.4 + s.str * 1.3;
}

export function shotDamage(state: SaveState): number {
  const w = state.equip.weapon ? itemDef(state.equip.weapon.id) : undefined;
  if (!w?.power) return 0;
  const s = statsOf(state);
  return w.power * (1 + state.level * 0.04) + s.str * 0.9 + state.level * 0.6;
}

export function mitigate(raw: number, def: number): number {
  return Math.max(1, Math.round(raw * 100 / (100 + def)));
}

export function critChance(state: SaveState): number {
  const chance = 0.03 + statsOf(state).luck * 0.012;
  return Math.min(0.75, chance);
}

export function formatPlus(n: number): string {
  if (!n) return "";
  const sign = n < 0 ? "-" : "+";
  const abs = Math.abs(n);
  if (abs < 1000) return `${sign}${abs}`;
  const k = Math.round((abs / 1000) * 10) / 10;
  const text = Number.isInteger(k) ? String(k) : k.toFixed(1);
  return `${sign}${text}k`;
}

export const BAG_MAX = 80;
export const BANK_MAX = 100;

export function freshState(name: string, hero: HeroId): SaveState {
  const bonus = HEROES.find((h) => h.id === hero)?.bonus ?? "str";
  const base = { str: 1, agi: 1, vit: 1, int: 1, dex: 1, luck: 1 };
  if (hero === "yeti") {
    base.str += 2;
    base.agi += 2;
    base.vit += 2;
    base.int += 2;
    base.dex += 2;
    base.luck += 2;
  } else {
    base[bonus] += 2;
  }
  const state: SaveState = {
    name,
    hero,
    level: 1,
    exp: 0,
    points: 0,
    ...base,
    hp: 1,
    sp: 1,
    gold: 80,
    bankGold: 0,
    bag: [newItem("talaria"), newItem("red-vial"), newItem("blue-vial")],
    storage: [],
    equip: {},
    stance: "peace",
    criminal: false,
    jailedUntil: 0,
    map: "midgard",
    x: 640,
    y: 1980,
  };
  state.hp = maxHp(state);
  state.sp = maxSp(state);
  return state;
}

const REGION_GEAR: Record<string, string[]> = {
  forest: ["vine-hood", "bark-tunic", "moss-trousers", "dew-charm"],
  nidavellir: ["bark-tunic", "moss-trousers", "cinder-cap", "dew-charm"],
  jotunheim: ["cinder-cap", "ash-greaves", "vine-hood", "ember-bead"],
  vanaheim: ["vine-hood", "bark-tunic", "magma-coat", "dew-charm"],
  fire: ["cinder-cap", "magma-coat", "ash-greaves", "ember-bead"],
  niflheim: ["bone-crown", "ribcage-mail", "grave-greaves", "rat-tail"],
  asgard: ["star-circlet", "cult-robe", "cinder-cap", "ember-bead"],
  death: ["bone-crown", "ribcage-mail", "grave-greaves", "rat-tail"],
};

const BOSS_GEAR: Record<string, { id: string; rate: number }[]> = {
  catcher: [
    { id: "kids-baseball", rate: 0.25 },
    { id: "catcher-mask", rate: 0.18 },
    { id: "chest-guard", rate: 0.16 },
    { id: "knee-pads", rate: 0.16 },
    { id: "lucky-mitt", rate: 0.12 },
  ],
  brokk: [
    { id: "ancient-rock", rate: 0.2 },
    { id: "chest-guard", rate: 0.14 },
    { id: "cinder-cap", rate: 0.12 },
  ],
  thrym: [
    { id: "icicles", rate: 0.16 },
    { id: "ash-greaves", rate: 0.14 },
    { id: "ember-bead", rate: 0.1 },
  ],
  grove: [
    { id: "vine-hood", rate: 0.2 },
    { id: "dew-charm", rate: 0.16 },
    { id: "bark-tunic", rate: 0.14 },
  ],
  surtur: [
    { id: "fire-balls", rate: 0.1 },
    { id: "horned-crown", rate: 0.12 },
    { id: "skull-belt", rate: 0.14 },
    { id: "lava-boots", rate: 0.14 },
    { id: "inferno-heart", rate: 0.08 },
  ],
  nidhogg: [
    { id: "acid-bombs", rate: 0.12 },
    { id: "ribcage-mail", rate: 0.12 },
    { id: "grave-greaves", rate: 0.12 },
  ],
  heimdall: [
    { id: "comets", rate: 0.08 },
    { id: "star-circlet", rate: 0.06 },
    { id: "cult-robe", rate: 0.1 },
    { id: "magic-stars", rate: 0.14 },
  ],
  baphomet: [
    { id: "star-circlet", rate: 0.08 },
    { id: "cult-robe", rate: 0.1 },
    { id: "cloven-greaves", rate: 0.1 },
    { id: "baphomet-eye", rate: 0.06 },
  ],
};

export const BOSS_GOLD: Record<string, number> = {
  catcher: 80000,
  brokk: 140000,
  thrym: 210000,
  grove: 300000,
  surtur: 420000,
  nidhogg: 360000,
  heimdall: 520000,
  tyr: 640000,
  skadi: 820000,
  thor: 760000,
  loki: 760000,
  freyja2: 980000,
  hela2: 1200000,
  thor2: 1800000,
  terror: 2600000,
  valkyrie: 3400000,
  baphomet: 5000000,
  mimir: 4200000,
  fenrir: 6000000,
  jormungand: 6000000,
  odin: 8000000,
  ultrahela: 0,
};

const POTIONS = ["red-vial", "red-flask", "blue-vial", "blue-flask", "violet-tonic"];

const WEAPON_DROP: Record<string, { id: string; rate: number }> = {
  catcher: { id: "kids-baseball", rate: 0.25 },
  brokk: { id: "ancient-rock", rate: 0.06 },
  thrym: { id: "icicles", rate: 0.06 },
  grove: { id: "fire-balls", rate: 0.04 },
  freyja2: { id: "fire-balls", rate: 0.04 },
  surtur: { id: "fire-balls", rate: 0.06 },
  nidhogg: { id: "acid-bombs", rate: 0.06 },
  hela2: { id: "acid-bombs", rate: 0.06 },
  thor: { id: "comets", rate: 0.03 },
  loki: { id: "comets", rate: 0.03 },
  thor2: { id: "comets", rate: 0.03 },
  heimdall: { id: "magic-stars", rate: 0.12 },
  baphomet: { id: "celestial-boomerang", rate: 0.000001 },
};

const BOSS_KEY: Record<string, string> = {
  heimdall: "key-red",
  tyr: "key-blue",
  skadi: "key-gold",
  freyja2: "key-pink",
  hela2: "key-green",
  thor2: "key-purple",
  loki: "key-silver",
};

const BOSS_REGION: Record<string, string> = {
  catcher: "forest",
  brokk: "nidavellir",
  thrym: "jotunheim",
  grove: "vanaheim",
  freyja2: "asgard",
  surtur: "fire",
  nidhogg: "niflheim",
  hela2: "niflheim",
  heimdall: "asgard",
  tyr: "asgard",
  skadi: "asgard",
  thor: "asgard",
  loki: "asgard",
  thor2: "asgard",
  valkyrie: "asgard",
  terror: "nidavellir",
  baphomet: "death",
  fenrir: "asgard",
  jormungand: "niflheim",
  odin: "asgard",
  ultrahela: "death",
  mimir: "vanaheim",
};

function armorPool(region: string) {
  const pool = (REGION_GEAR[region] ?? REGION_GEAR.forest!).filter((id) => {
    const kind = itemDef(id)?.kind;
    return kind === "head" || kind === "body" || kind === "legs";
  });
  return pool.length ? pool : ["bark-tunic"];
}

/** Armor 17%, soul stone 3%, potion 60%. The rest of the roll is nothing. */
function rollGear(region: string): ItemInst | null {
  const roll = Math.random();
  if (roll < 0.17) {
    const pool = armorPool(region);
    return newItem(pool[Math.floor(Math.random() * pool.length)]!);
  }
  if (roll < 0.2) return newItem("soul-gem", 3);
  if (roll < 0.8) return newItem(POTIONS[Math.floor(Math.random() * POTIONS.length)]!);
  return null;
}

export function rollMonsterLoot(region: string, goldMin: number, goldMax: number, kind?: string) {
  const gold = Math.max(1, goldMin + Math.floor(Math.random() * (goldMax - goldMin + 1)));
  const items: ItemInst[] = [];
  const gear = rollGear(region);
  if (gear) items.push(gear);
  if (region === "asgard" && Math.random() < 0.035) items.push(newItem("magic-stars"));
  const cardRealm = region === "forest" || region === "nidavellir" || region === "jotunheim" || region === "vanaheim" || region === "fire" || region === "niflheim" || region === "death";
  if (kind && cardRealm && Math.random() < 0.0001) items.push(newItem(`card-${kind}`));
  return { gold, items };
}

export function rollBossLoot(boss: string): { gold: number; items: ItemInst[] } {
  const items: ItemInst[] = [];
  const weapon = WEAPON_DROP[boss];
  if (weapon && Math.random() < weapon.rate) items.push(newItem(weapon.id));
  const gear = rollGear(BOSS_REGION[boss] ?? "forest");
  if (gear) items.push(gear);
  const key = BOSS_KEY[boss];
  if (key) items.push(newItem(key));
  if (boss !== "ultrahela" && !boss.startsWith("sky") && Math.random() < 0.0001) items.push(newItem(`card-${boss}`));
  if (boss === "ultrahela" && Math.random() < 0.00001) items.push(newItem("card-ultrahela"));
  if (boss === "valkyrie" && Math.random() < 0.00001) items.push(newItem("dwarf-ring"));
  if (boss === "terror" && Math.random() < 0.00001) items.push(newItem("brisingamen"));
  if (boss === "mimir" && Math.random() < 0.00001) items.push(newItem("mimir-earrings"));
  if (boss === "fenrir" && Math.random() < 0.00001) items.push(newItem("wolf-charm"));
  if (boss === "jormungand" && Math.random() < 0.00001) items.push(newItem("serpent-belt"));
  if (boss === "odin" && Math.random() < 0.00001) items.push(newItem("odin-bracelet"));
  if (boss.startsWith("sky")) {
    const gear = rollGear("asgard");
    return { gold: 800000, items: gear ? [gear] : [] };
  }
  return { gold: BOSS_GOLD[boss] ?? 100000, items };
}

export const MONSTERS = {
  slug: { hp: 40, touch: 8, exp: 16, gold: [8, 16] as [number, number], speed: 78, ai: "slide" as const, h: 50, w: 62, sprite: "slug", region: "forest" },
  frog: { hp: 56, touch: 11, exp: 28, gold: [14, 26] as [number, number], speed: 40, ai: "jump" as const, h: 54, w: 64, sprite: "frog", region: "forest" },
  birdie: { hp: 78, touch: 15, exp: 48, gold: [20, 36] as [number, number], speed: 120, ai: "fly" as const, h: 52, w: 70, sprite: "birdie", region: "forest" },
  mole: { hp: 64, touch: 13, exp: 26, gold: [16, 28] as [number, number], speed: 150, ai: "roll" as const, h: 52, w: 58, sprite: "rockface", region: "nidavellir" },
  crag: { hp: 90, touch: 17, exp: 44, gold: [22, 40] as [number, number], speed: 70, ai: "jump" as const, h: 58, w: 78, sprite: "spider", region: "nidavellir" },
  dart: { hp: 120, touch: 22, exp: 68, gold: [30, 52] as [number, number], speed: 150, ai: "hover" as const, h: 56, w: 64, sprite: "spark", region: "nidavellir" },
  frost: { hp: 102, touch: 20, exp: 40, gold: [24, 42] as [number, number], speed: 76, ai: "slide" as const, h: 70, w: 108, sprite: "seal", region: "jotunheim" },
  icehop: { hp: 140, touch: 26, exp: 66, gold: [34, 58] as [number, number], speed: 44, ai: "jump" as const, h: 72, w: 56, sprite: "yeti", region: "jotunheim" },
  gale: { hp: 186, touch: 34, exp: 96, gold: [44, 74] as [number, number], speed: 120, ai: "hover" as const, h: 58, w: 86, sprite: "snow", region: "jotunheim" },
  pebble: { hp: 160, touch: 31, exp: 62, gold: [36, 60] as [number, number], speed: 92, ai: "slide" as const, h: 46, w: 62, sprite: "fawn", region: "vanaheim" },
  leaper: { hp: 220, touch: 40, exp: 100, gold: [48, 80] as [number, number], speed: 48, ai: "jump" as const, h: 52, w: 40, sprite: "gnome", region: "vanaheim" },
  hawk: { hp: 290, touch: 52, exp: 140, gold: [60, 100] as [number, number], speed: 130, ai: "hover" as const, h: 48, w: 56, sprite: "fairy", region: "vanaheim" },
  ember: { hp: 250, touch: 48, exp: 96, gold: [52, 88] as [number, number], speed: 86, ai: "slide" as const, h: 50, w: 58, sprite: "ember", region: "fire" },
  pink: { hp: 345, touch: 64, exp: 150, gold: [70, 120] as [number, number], speed: 46, ai: "jump" as const, h: 52, w: 60, sprite: "pink", region: "fire" },
  bat: { hp: 450, touch: 82, exp: 210, gold: [90, 150] as [number, number], speed: 140, ai: "fly" as const, h: 50, w: 72, sprite: "bat", region: "fire" },
  ooze: { hp: 390, touch: 74, exp: 160, gold: [80, 140] as [number, number], speed: 78, ai: "slide" as const, h: 52, w: 110, sprite: "serpent", region: "niflheim" },
  mutant: { hp: 530, touch: 98, exp: 240, gold: [110, 180] as [number, number], speed: 70, ai: "jump" as const, h: 64, w: 78, sprite: "wolf", region: "niflheim" },
  wretch: { hp: 690, touch: 126, exp: 330, gold: [140, 220] as [number, number], speed: 150, ai: "fly" as const, h: 70, w: 80, sprite: "demon", region: "niflheim" },
  acolyte: { hp: 610, touch: 112, exp: 250, gold: [130, 210] as [number, number], speed: 90, ai: "slide" as const, h: 52, w: 70, sprite: "birdie", region: "asgard" },
  herald: { hp: 820, touch: 148, exp: 380, gold: [170, 260] as [number, number], speed: 52, ai: "jump" as const, h: 52, w: 60, sprite: "pink", region: "asgard" },
  seraph: { hp: 1060, touch: 186, exp: 520, gold: [210, 320] as [number, number], speed: 160, ai: "fly" as const, h: 58, w: 78, sprite: "vulture", region: "asgard" },
  rat: { hp: 940, touch: 170, exp: 400, gold: [200, 320] as [number, number], speed: 110, ai: "slide" as const, h: 40, w: 74, sprite: "rat", region: "death" },
  skfrog: { hp: 1260, touch: 220, exp: 580, gold: [260, 400] as [number, number], speed: 52, ai: "jump" as const, h: 52, w: 66, sprite: "skfrog", region: "death" },
  vulture: { hp: 1640, touch: 280, exp: 800, gold: [320, 500] as [number, number], speed: 155, ai: "fly" as const, h: 58, w: 78, sprite: "vulture", region: "death" },
};

export type MonsterId = keyof typeof MONSTERS;

const TIER_SCALE = [1, 1.45, 2.05, 3.8];

const REGION_EXP: Record<string, number> = {
  forest: 1,
  nidavellir: 1,
  jotunheim: 4,
  vanaheim: 8,
  fire: 14,
  niflheim: 22,
  asgard: 36,
  death: 55,
};

/** Easy stats live on the monster. Each harder map of a realm multiplies them, and the next realm's easy already outgrows the last. */
export function scaledMonster(kind: MonsterId, diff = 0) {
  const base = MONSTERS[kind];
  const tier = TIER_SCALE[diff] ?? 1;
  const expBoost = REGION_EXP[base.region] ?? 1;
  return {
    hp: Math.max(1, Math.round(base.hp * tier)),
    touch: Math.max(1, Math.round(base.touch * tier)),
    exp: Math.max(1, Math.round(base.exp * tier * expBoost)),
    gold: [Math.max(1, Math.round(base.gold[0] * tier * Math.sqrt(expBoost))), Math.max(1, Math.round(base.gold[1] * tier * Math.sqrt(expBoost)))] as [number, number],
  };
}

export const BOSSES = {
  catcher: { hp: 100000, sp: 400, def: 40, touch: 80, melee: 120, proj: 70, exp: 12000, h: 116, w: 78, sprite: "catcher", shot: "baseball", name: "The Catcher" },
  brokk: { hp: 200000, sp: 700, def: 70, touch: 140, melee: 220, proj: 140, exp: 20000, h: 220, w: 140, sprite: "brokk", shot: "rock", name: "The Dark Dwarf" },
  thrym: { hp: 250000, sp: 900, def: 100, touch: 190, melee: 300, proj: 200, exp: 32000, h: 220, w: 96, sprite: "laufey", shot: "icicle", name: "Laufey" },
  grove: { hp: 300000, sp: 1100, def: 130, touch: 240, melee: 380, proj: 260, exp: 48000, h: 112, w: 42, sprite: "elf", shot: "crescent", name: "Freyja" },
  surtur: { hp: 500000, sp: 1600, def: 170, touch: 320, melee: 520, proj: 380, exp: 70000, h: 132, w: 88, sprite: "surtur", shot: "pfire", name: "Surtur" },
  nidhogg: { hp: 400000, sp: 1400, def: 200, touch: 380, melee: 640, proj: 460, exp: 95000, h: 170, w: 72, sprite: "hela", shot: "acid", name: "Hela" },
  heimdall: { hp: 500000, sp: 1800, def: 230, touch: 440, melee: 760, proj: 540, exp: 130000, h: 108, w: 48, sprite: "heimdall", shot: "wave", name: "Heimdall" },
  tyr: { hp: 600000, sp: 2100, def: 260, touch: 520, melee: 900, proj: 640, exp: 170000, h: 108, w: 48, sprite: "tyr", shot: "tornado", name: "Tyr" },
  skadi: { hp: 800000, sp: 2600, def: 300, touch: 640, melee: 1100, proj: 780, exp: 220000, h: 320, w: 110, sprite: "skadi", shot: "arrow", name: "Skadi" },
  thor: { hp: 750000, sp: 2800, def: 340, touch: 720, melee: 1300, proj: 920, exp: 280000, h: 116, w: 52, sprite: "thor", shot: "hammer", name: "Thor" },
  loki: { hp: 750000, sp: 2800, def: 340, touch: 700, melee: 1260, proj: 920, exp: 280000, h: 108, w: 46, sprite: "loki", shot: "comet", name: "Loki" },
  freyja2: { hp: 900000, sp: 3200, def: 390, touch: 860, melee: 1500, proj: 1100, exp: 360000, h: 124, w: 48, sprite: "elf", shot: "crescent", name: "Freyja" },
  hela2: { hp: 1000000, sp: 3600, def: 440, touch: 980, melee: 1760, proj: 1280, exp: 460000, h: 186, w: 78, sprite: "hela", shot: "acid", name: "Hela" },
  thor2: { hp: 20000000, sp: 8000, def: 520, touch: 1400, melee: 2400, proj: 1800, exp: 600000, h: 124, w: 56, sprite: "thor2", shot: "hammer", name: "Thor, Enraged" },
  terror: { hp: 40000000, sp: 12000, def: 640, touch: 2000, melee: 3600, proj: 2600, exp: 800000, h: 280, w: 200, sprite: "brokk", shot: "hammer", name: "Dwarf of Terror" },
  valkyrie: { hp: 50000000, sp: 16000, def: 780, touch: 2600, melee: 4800, proj: 3400, exp: 1100000, h: 140, w: 64, sprite: "valkyrie", shot: "spear", name: "Valkyrie" },
  baphomet: { hp: 100000000, sp: 24000, def: 960, touch: 3600, melee: 6800, proj: 5000, exp: 1600000, h: 150, w: 100, sprite: "baphomet", shot: "ghoul", name: "Baphomet" },
  mimir: { hp: 80000000, sp: 20000, def: 880, touch: 2800, melee: 5200, proj: 0, exp: 1500000, h: 320, w: 220, sprite: "mimir", shot: "none", name: "Mimir" },
  fenrir: { hp: 90000000, sp: 22000, def: 980, touch: 9000, melee: 14000, proj: 0, exp: 1800000, h: 230, w: 300, sprite: "fenrir", shot: "none", name: "Fenrir" },
  jormungand: { hp: 90000000, sp: 24000, def: 1000, touch: 11000, melee: 16000, proj: 14000, exp: 1900000, h: 280, w: 520, sprite: "jorm", shot: "pfire", name: "Jormungand" },
  odin: { hp: 95000000, sp: 26000, def: 1100, touch: 10000, melee: 15000, proj: 12000, exp: 2000000, h: 160, w: 80, sprite: "odin", shot: "spear", name: "Odin" },
  sky1: { hp: 80000000, sp: 18000, def: 860, touch: 4200, melee: 7600, proj: 5400, exp: 900000, h: 150, w: 70, sprite: "valkyrie", shot: "spear", name: "Valkyrie" },
  sky2: { hp: 80000000, sp: 18000, def: 860, touch: 4200, melee: 7600, proj: 5400, exp: 900000, h: 150, w: 70, sprite: "valkyrie", shot: "spear", name: "Valkyrie" },
  sky3: { hp: 80000000, sp: 18000, def: 860, touch: 4200, melee: 7600, proj: 5400, exp: 900000, h: 150, w: 70, sprite: "valkyrie", shot: "spear", name: "Valkyrie" },
  sky4: { hp: 80000000, sp: 18000, def: 860, touch: 4200, melee: 7600, proj: 5400, exp: 900000, h: 150, w: 70, sprite: "valkyrie", shot: "spear", name: "Valkyrie" },
  sky5: { hp: 80000000, sp: 18000, def: 860, touch: 4200, melee: 7600, proj: 5400, exp: 900000, h: 150, w: 70, sprite: "valkyrie", shot: "spear", name: "Valkyrie" },
  sky6: { hp: 80000000, sp: 18000, def: 860, touch: 4200, melee: 7600, proj: 5400, exp: 900000, h: 150, w: 70, sprite: "valkyrie", shot: "spear", name: "Valkyrie" },
  sky7: { hp: 80000000, sp: 18000, def: 860, touch: 4200, melee: 7600, proj: 5400, exp: 900000, h: 150, w: 70, sprite: "valkyrie", shot: "spear", name: "Valkyrie" },
  sky8: { hp: 80000000, sp: 18000, def: 860, touch: 4200, melee: 7600, proj: 5400, exp: 900000, h: 150, w: 70, sprite: "valkyrie", shot: "spear", name: "Valkyrie" },
  sky9: { hp: 80000000, sp: 18000, def: 860, touch: 4200, melee: 7600, proj: 5400, exp: 900000, h: 150, w: 70, sprite: "valkyrie", shot: "spear", name: "Valkyrie" },
  ultrahela: { hp: 1000000000000, sp: 360000, def: 44000, touch: 98000, melee: 176000, proj: 128000, exp: 46000000, h: 220, w: 96, sprite: "hela", shot: "acid", name: "Ultra Hela" },
};

/** Extra physical defense versus projectiles and jump-stomps. Weakest bosses get a little; the strongest get much more. */
const SHELL_ORDER = [
  "catcher", "brokk", "thrym", "grove", "nidhogg", "surtur", "heimdall", "tyr", "thor", "loki", "skadi",
  "freyja2", "hela2", "thor2", "terror", "valkyrie",
  "sky1", "sky2", "sky3", "sky4", "sky5", "sky6", "sky7", "sky8", "sky9",
  "mimir", "fenrir", "jormungand", "baphomet", "odin", "ultrahela",
];

export function shellDef(id: string): number {
  const rank = SHELL_ORDER.indexOf(id);
  return 80 + (rank < 0 ? 8 : rank) * 58;
}

export type BossId = keyof typeof BOSSES;
