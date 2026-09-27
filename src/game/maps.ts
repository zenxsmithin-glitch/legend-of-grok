import type { BossId, MonsterId } from "./balance";

export const WORLD_W = 4000;
export const WORLD_H = 2200;
export const GROUND_Y = Math.round(WORLD_H * 0.9);

export type Platform = { x: number; y: number; w: number; h: number; oneWay?: boolean };
export type Rope = { x: number; y: number; h: number; kind: "rope" | "chain" | "vine" };
export type Npc = { shop: "potion" | "item" | "auction" | "warehouse" | "inn"; x: number; y: number; label: string };
export type Gate = { x: number; y: number; to: string; label: string; key?: string; door?: string; secret?: boolean };

export type MapDef = {
  id: string;
  name: string;
  theme: "city" | "forest" | "fire" | "death" | "jail" | "nidavellir" | "jotunheim" | "vanaheim" | "niflheim" | "asgard";
  bg?: string;
  w: number;
  h: number;
  platforms: Platform[];
  ropes: Rope[];
  npcs: Npc[];
  gates: Gate[];
  left?: string;
  right?: string;
  hazard: boolean;
  spawns: { kind: MonsterId; count: number }[];
  boss?: BossId;
  bosses?: BossId[];
  diff?: number;
};

function p(x: number, y: number, w: number, oneWay = false): Platform {
  return { x, y, w, h: oneWay ? 20 : 36, oneWay };
}

function regionPlatforms(diff: number): Platform[] {
  const plats: Platform[] = [];
  const rows = 4;
  const step = 0.2 + diff * 0.015;
  const gap = 380 + diff * 90;
  const width = 1500 - diff * 140;
  plats.push(p(-160, GROUND_Y, WORLD_W + 320, false));
  for (let row = 1; row < rows; row++) {
    const y = GROUND_Y - row * step * WORLD_H;
    let x = row % 2 === 0 ? 70 : 280;
    while (x < WORLD_W - 80) {
      const jitter = ((row * 5 + Math.floor(x / 90)) % 3) * 36;
      const w = width - jitter;
      if (x + w > WORLD_W - 40) break;
      plats.push(p(x, y, w, true));
      x += w + gap;
    }
  }
  return plats;
}

function regionRopes(diff: number, kind: Rope["kind"]): Rope[] {
  const step = 0.2 + diff * 0.015;
  const top = GROUND_Y - 3 * step * WORLD_H;
  const xs = [640, 1500, 2400, 3300];
  return xs.map((x) => ({ x, y: top - 48, h: GROUND_Y - top + 40, kind }));
}

function regionMap(opts: {
  id: string;
  name: string;
  theme: MapDef["theme"];
  bg: string;
  diff: number;
  left?: string;
  right?: string;
  spawns: MapDef["spawns"];
  boss?: BossId;
  rope: Rope["kind"];
}): MapDef {
  return {
    id: opts.id,
    name: opts.name,
    theme: opts.theme,
    bg: opts.bg,
    w: WORLD_W,
    h: WORLD_H,
    platforms: regionPlatforms(opts.diff),
    ropes: regionRopes(opts.diff, opts.rope),
    npcs: [],
    gates: [],
    left: opts.left,
    right: opts.right,
    hazard: true,
    spawns: opts.spawns,
    boss: opts.boss,
    diff: opts.diff,
  };
}

const PAINT_W = 1168;
const PAINT_H = 784;
function wx(px: number) {
  return Math.round((px * WORLD_W) / PAINT_W);
}
function wy(px: number) {
  return Math.round((px * WORLD_H) / PAINT_H);
}
/** Cobblestone walk line in the town painting. Lower than the old 90% ground. */
const CITY_GROUND = wy(722);
function lad(x: number, y: number, h: number, kind: Rope["kind"] = "chain"): Rope {
  return { x: wx(x), y: wy(y), h: wy(h), kind };
}

const cityPlatforms: Platform[] = [
  p(-120, CITY_GROUND, WORLD_W + 240, false),
  p(wx(175), wy(122), wx(200), true),
  p(wx(455), wy(146), wx(245), true),
  p(wx(700), wy(158), wx(230), true),
  p(wx(970), wy(204), wx(190), true),
  p(wx(800), wy(248), wx(120), true),
  p(wx(18), wy(400), wx(262), true),
  p(wx(300), wy(446), wx(210), true),
  p(wx(520), wy(448), wx(390), true),
  p(wx(890), wy(486), wx(270), true),
];

const cityRopes: Rope[] = [
  lad(80, 376, 200),
  lad(190, 376, 190),
  lad(400, 422, 155),
  lad(640, 424, 175),
  lad(790, 424, 185),
  lad(1040, 462, 160),
  lad(990, 180, 312),
  lad(1110, 180, 312),
  lad(230, 100, 125),
  lad(305, 100, 115),
  lad(530, 122, 135),
  lad(615, 122, 125),
  lad(755, 134, 130),
];

export const REALM_ORDER = [
  { name: "Alfheim", to: "forest-easy", blurb: "First realm. Bright woods. Walk right for harder ground.", look: "Sunlit forest" },
  { name: "Nidavellir", to: "nidavellir-easy", blurb: "Second realm. Dwarf caverns, tunnels, and stone ledges.", look: "Underground caverns" },
  { name: "Jotunheim", to: "jotunheim-easy", blurb: "Third realm. Snow mountains and ice.", look: "Snow and ice" },
  { name: "Vanaheim", to: "vanaheim-easy", blurb: "Fourth realm. Dry rock and beautiful trees.", look: "Rocky groves" },
  { name: "Muspelheim", to: "fire-easy", blurb: "Fifth realm. Fire and forge-heat.", look: "Volcanic fire" },
  { name: "Niflheim", to: "niflheim-easy", blurb: "Sixth realm. Dark mutated things and acid pools.", look: "Acid dark" },
  { name: "Asgard", to: "asgard-easy", blurb: "Seventh realm. Golden light and the gods' clouds.", look: "Golden clouds" },
  { name: "Hel", to: "death-easy", blurb: "Eighth realm. The underworld.", look: "Gloomy underworld" },
];

export const MAPS: Record<string, MapDef> = {
  midgard: {
    id: "midgard",
    name: "Midgard",
    theme: "city",
    bg: "/assets/maps/midgard.jpg",
    w: WORLD_W,
    h: WORLD_H,
    platforms: cityPlatforms,
    ropes: cityRopes,
    npcs: [
      { shop: "potion", x: wx(125), y: wy(400), label: "Potion Shop" },
      { shop: "item", x: wx(415), y: wy(446), label: "Item Shop" },
      { shop: "warehouse", x: wx(248), y: CITY_GROUND, label: "Warehouse" },
      { shop: "inn", x: wx(468), y: CITY_GROUND, label: "Inn" },
      { shop: "auction", x: wx(1080), y: wy(204), label: "Trading Post" },
    ],
    gates: [
      ...REALM_ORDER.map((realm, index) => ({
        x: [164, 1027, 1336, 2911, 2055, 2603, 3116, 3795][index] ?? 200,
        y: CITY_GROUND,
        to: realm.to,
        label: realm.name,
      })),
      { x: wx(740), y: wy(448), to: "jail", label: "Jail" },
    ],
    hazard: false,
    spawns: [],
  },
  jail: {
    id: "jail",
    name: "Midgard Jail",
    theme: "jail",
    bg: "/assets/maps/jail.jpg",
    w: 1792,
    h: 1008,
    platforms: [p(0, 786, 1792, false)],
    ropes: [],
    npcs: [],
    gates: [{ x: 150, y: 786, to: "midgard", label: "Street" }],
    hazard: false,
    spawns: [],
  },
};

const TIERS = ["easy", "medium", "hard", "nightmare"] as const;

function realmMaps(opts: {
  id: string;
  name: string;
  theme: MapDef["theme"];
  bgs: [string, string, string, string];
  rope: Rope["kind"];
  mobs: [MonsterId, MonsterId, MonsterId];
  boss: BossId;
}): Record<string, MapDef> {
  const out: Record<string, MapDef> = {};
  TIERS.forEach((tier, diff) => {
    const id = `${opts.id}-${tier}`;
    out[id] = regionMap({
      id,
      name: `${opts.name} — ${tier[0]!.toUpperCase()}${tier.slice(1)}`,
      theme: opts.theme,
      bg: opts.bgs[diff]!,
      diff,
      left: diff === 0 ? "midgard" : `${opts.id}-${TIERS[diff - 1]}`,
      right: diff < 3 ? `${opts.id}-${TIERS[diff + 1]}` : undefined,
      rope: opts.rope,
      spawns:
        diff < 3
          ? [{ kind: opts.mobs[diff]!, count: 9 - diff }]
          : opts.mobs.map((kind) => ({ kind, count: 3 })),
      boss: diff === 3 ? opts.boss : undefined,
    });
  });
  return out;
}

Object.assign(
  MAPS,
  realmMaps({
    id: "forest",
    name: "Alfheim",
    theme: "forest",
    bgs: ["/assets/maps/forest-easy.jpg", "/assets/maps/forest-medium.jpg", "/assets/maps/forest-hard.jpg", "/assets/maps/forest-nightmare.jpg"],
    rope: "vine",
    mobs: ["slug", "frog", "birdie"],
    boss: "catcher",
  }),
  realmMaps({
    id: "nidavellir",
    name: "Nidavellir",
    theme: "nidavellir",
    bgs: ["/assets/maps/nidavellir.jpg", "/assets/maps/nidavellir.jpg", "/assets/maps/nidavellir.jpg", "/assets/maps/nidavellir.jpg"],
    rope: "chain",
    mobs: ["mole", "crag", "dart"],
    boss: "brokk",
  }),
  realmMaps({
    id: "jotunheim",
    name: "Jotunheim",
    theme: "jotunheim",
    bgs: ["/assets/maps/jotunheim.jpg", "/assets/maps/jotunheim.jpg", "/assets/maps/jotunheim.jpg", "/assets/maps/jotunheim.jpg"],
    rope: "chain",
    mobs: ["frost", "icehop", "gale"],
    boss: "thrym",
  }),
  realmMaps({
    id: "vanaheim",
    name: "Vanaheim",
    theme: "vanaheim",
    bgs: ["/assets/maps/vanaheim.jpg", "/assets/maps/vanaheim.jpg", "/assets/maps/vanaheim.jpg", "/assets/maps/vanaheim.jpg"],
    rope: "vine",
    mobs: ["pebble", "leaper", "hawk"],
    boss: "grove",
  }),
  realmMaps({
    id: "fire",
    name: "Muspelheim",
    theme: "fire",
    bgs: ["/assets/maps/fire-easy.jpg", "/assets/maps/fire-medium.jpg", "/assets/maps/fire-hard.jpg", "/assets/maps/fire-nightmare.jpg"],
    rope: "chain",
    mobs: ["ember", "pink", "bat"],
    boss: "surtur",
  }),
  realmMaps({
    id: "niflheim",
    name: "Niflheim",
    theme: "niflheim",
    bgs: ["/assets/maps/niflheim.jpg", "/assets/maps/niflheim.jpg", "/assets/maps/niflheim.jpg", "/assets/maps/niflheim.jpg"],
    rope: "chain",
    mobs: ["ooze", "mutant", "wretch"],
    boss: "nidhogg",
  }),
  realmMaps({
    id: "asgard",
    name: "Asgard",
    theme: "asgard",
    bgs: ["/assets/maps/asgard.jpg", "/assets/maps/asgard.jpg", "/assets/maps/asgard.jpg", "/assets/maps/asgard.jpg"],
    rope: "chain",
    mobs: ["acolyte", "herald", "seraph"],
    boss: "heimdall",
  }),
  realmMaps({
    id: "death",
    name: "Hel",
    theme: "death",
    bgs: ["/assets/maps/death-easy.jpg", "/assets/maps/death-medium.jpg", "/assets/maps/death-hard.jpg", "/assets/maps/death-nightmare.jpg"],
    rope: "chain",
    mobs: ["rat", "skfrog", "vulture"],
    boss: "baphomet",
  }),
);

const thingBg = "/assets/maps/thingstead.jpg";
Object.assign(
  MAPS,
  realmMaps({
    id: "thingstead",
    name: "High Thingstead",
    theme: "asgard",
    bgs: [thingBg, thingBg, thingBg, thingBg],
    rope: "chain",
    mobs: ["acolyte", "herald", "seraph"],
    boss: "freyja2",
  }),
);

function sealBossMap(id: string, boss: BossId | BossId[], gate?: Gate) {
  const map = MAPS[id];
  if (!map) return;
  map.spawns = [];
  map.right = undefined;
  if (Array.isArray(boss)) {
    map.boss = boss[0];
    map.bosses = boss;
  } else {
    map.boss = boss;
    map.bosses = [boss];
  }
  map.gates = gate ? [gate] : [];
}

const doorX = WORLD_W - 280;
sealBossMap("asgard-easy", "heimdall", { x: doorX, y: GROUND_Y, to: "asgard-medium", label: "Bifrost", key: "key-red", door: "asgard-easy" });
sealBossMap("asgard-medium", "tyr", { x: doorX, y: GROUND_Y, to: "asgard-hard", label: "Castle", key: "key-blue", door: "asgard-medium" });
sealBossMap("asgard-hard", "skadi", { x: doorX, y: GROUND_Y, to: "asgard-nightmare", label: "Inner Gate", key: "key-gold", door: "asgard-hard" });
sealBossMap("asgard-nightmare", ["thor", "loki"], { x: WORLD_W / 2, y: GROUND_Y, to: "thingstead-easy", label: "High Thingstead", secret: true });
sealBossMap("thingstead-easy", "freyja2", { x: doorX, y: GROUND_Y, to: "thingstead-medium", label: "Pink Door", key: "key-pink", door: "thingstead-easy" });
sealBossMap("thingstead-medium", "hela2", { x: doorX, y: GROUND_Y, to: "thingstead-hard", label: "Green Door", key: "key-green", door: "thingstead-medium" });
sealBossMap("thingstead-hard", "thor2", { x: doorX, y: GROUND_Y, to: "thingstead-nightmare", label: "Purple Door", key: "key-purple", door: "thingstead-hard" });
sealBossMap("thingstead-nightmare", "valkyrie");
if (MAPS["thingstead-easy"]) MAPS["thingstead-easy"].left = "asgard-nightmare";

export function mapById(id: string): MapDef {
  return MAPS[id] ?? MAPS.midgard!;
}

export function arrival(map: MapDef, side: "left" | "right" | "gate"): { x: number; y: number } {
  if (map.id === "jail") return { x: 460, y: 786 };
  if (map.id === "midgard") {
    if (side === "right") return { x: 3400, y: CITY_GROUND };
    if (side === "gate") return { x: 2000, y: CITY_GROUND };
    return { x: 640, y: CITY_GROUND };
  }
  if (side === "right") return { x: map.w - 280, y: GROUND_Y };
  return { x: 260, y: GROUND_Y };
}
