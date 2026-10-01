import { BOSSES, MONSTERS, registerItems, type BossId, type CatalogItem, type MonsterId } from "./balance";

const STATS = ["str", "agi", "vit", "int", "dex", "luck"] as const;

function pick(seed: number, n: number) {
  const out: (typeof STATS)[number][] = [];
  const want = Math.max(1, Math.min(n, STATS.length));
  for (let i = 0; i < STATS.length && out.length < want; i++) {
    const key = STATS[(seed + i * 2) % STATS.length]!;
    if (!out.includes(key)) out.push(key);
  }
  return out;
}

function tierOf(region: string) {
  if (region === "forest" || region === "nidavellir") return 1;
  if (region === "jotunheim" || region === "vanaheim") return 2;
  if (region === "fire" || region === "niflheim") return 3;
  if (region === "death") return 4;
  return 0;
}

const TIER_STAT = [0, 2, 5, 9, 14];
const BORDER = ["", "White", "Green", "Blue", "Purple"];

function monsterCard(kind: MonsterId, index: number): CatalogItem {
  const region = MONSTERS[kind].region;
  const tier = tierOf(region);
  const shopTier = tier || 1;
  const n = 1 + (index % 3);
  const amount = (TIER_STAT[shopTier] ?? 2) + index % 3;
  const stats = pick(index + 2, n);
  const bonus: Partial<CatalogItem> = {};
  for (const key of stats) bonus[key] = amount + (shopTier > 2 ? 1 : 0);
  const listed = stats.map((key) => `${key.toUpperCase()} +${bonus[key]}`).join(", ");
  return {
    id: `card-${kind}`,
    name: cardTitle(kind),
    kind: "card",
    price: 50,
    shop: "item",
    border: tier ? BORDER[tier] : "White",
    monster: kind,
    desc: tier ? `Tier ${tier} ${BORDER[tier]} card. ${listed}.` : `Test listing. ${listed}.`,
    ...bonus,
  };
}

function cardTitle(kind: string) {
  if (kind === "pink") return "Pinky Fire";
  if (kind === "bat") return "Fiery Bat";
  return `${kindName(kind)} Card`;
}

function kindName(kind: string) {
  if (kind === "hawk") return "Fairy";
  if (kind === "leaper") return "Gnome";
  if (kind === "icehop") return "Baby Yeti";
  if (kind === "frog") return "Froggy";
  if (kind === "ooze") return "Serpent";
  if (kind === "mutant") return "Shadow Wolf";
  if (kind === "rat") return "Rat Bones";
  if (kind === "skfrog") return "Skelly Frog";
  if (kind === "vulture") return "Bone Picker";
  return kind.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function bossCard(id: BossId, index: number): CatalogItem {
  if (id === "ultrahela") {
    return {
      id: "card-ultrahela",
      name: "Ultra Hela Card",
      kind: "card",
      price: 50,
      shop: "item",
      border: "Golden Yellow",
      boss: id,
      str: 80,
      agi: 80,
      luck: 80,
      def: 200,
      bonusHp: 2000,
      bonusSp: 1000,
      desc: "Tier 6. Str +80, Agi +80, Luck +80, +2000 HP, +1000 SP, +200 Physical Defense. Ten of these add +1 to every bonus.",
    };
  }
  const n = 1 + (index % 3);
  const amount = 22 + (index % 5) * 4 + (index % 3) * 6;
  const stats = pick(index + 9, n);
  const bonus: Partial<CatalogItem> = {};
  for (const key of stats) bonus[key] = amount;
  const listed = stats.map((key) => `${key.toUpperCase()} +${bonus[key]}`).join(", ");
  return {
    id: `card-${id}`,
    name: `${BOSSES[id].name.replace(/^The /, "")} Card`,
    kind: "card",
    price: 50,
    shop: "item",
    border: "Red",
    boss: id,
    desc: `Red boss card. ${listed}.`,
    ...bonus,
  };
}

let ready = false;

export function installCards() {
  if (ready) return;
  ready = true;
  const items: CatalogItem[] = [];
  (Object.keys(MONSTERS) as MonsterId[]).forEach((kind, index) => {
    items.push(monsterCard(kind, index));
  });
  (Object.keys(BOSSES) as BossId[]).forEach((id, index) => {
    if (id.startsWith("sky") || id === "hela2") return;
    items.push(bossCard(id, index));
  });
  registerItems(items);
}

export function monsterCardId(kind: string) {
  return `card-${kind}`;
}

/** 0.01% — its own roll, separate from gear. */
export const CARD_RATE = 0.0001;

export function regionHasMonsterCards(region: string) {
  return tierOf(region) > 0;
}
