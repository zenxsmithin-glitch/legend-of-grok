import type { BossId, MonsterId } from "./balance";

export const WORLD_W = 4000;
export const WORLD_H = 2200;
export const GROUND_Y = Math.round(WORLD_H * 0.9);

export type Platform = { x: number; y: number; w: number; h: number; oneWay?: boolean };
export type Rope = { x: number; y: number; h: number; kind: "rope" | "chain" | "vine" | "glow" | "swing"; to?: string; down?: string; need?: "clear"; swing?: number; phase?: number; home?: number };
export type Zone = { x: number; w: number; top: number; bot: number };
export type Npc = { shop: "potion" | "item" | "auction" | "warehouse" | "inn" | "arena" | "hall" | "stable" | "friend" | "casino" | "ferry"; x: number; y: number; label: string; box?: Zone };
export type Gate = { x: number; y: number; to: string; label: string; key?: string; door?: string; secret?: boolean; back?: boolean; dwarf?: boolean; fenrir?: boolean; boat?: boolean; box?: Zone };

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
  p(wx(230) - 170, wy(122) - 78, 340, true),
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
  lad(755, 134, 130),
  { x: wx(577), y: 18, h: wy(146) - 18 + 36, kind: "rope", to: "cloud-1" },
];

function zone(x: number, w: number, floor: number, up = 200, down = 80): Zone {
  return { x, w, top: floor - up, bot: floor + down };
}

export const JAIL_STREET = { x: wx(790), y: wy(448) };

export const CITY_PIPE = { x: wx(230), stand: wy(122) - 78, foot: wy(122) };

export const WORLD_LABELS = ["Alfheim", "Jotunheim", "Vanaheim", "Niflheim", "Hel", "Muspelheim", "Asgard", "Nidavellir"];

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

function arenaLayout(width: number): { platforms: Platform[]; ropes: Rope[] } {
  const ground = GROUND_Y;
  const platforms: Platform[] = [p(-80, ground, width + 160, false)];
  const ropes: Rope[] = [];
  const cols = 8;
  for (let i = 0; i < cols; i++) {
    const x = 260 + i * ((width - 1600) / cols);
    platforms.push(p(x, ground - 260, 780, true));
    platforms.push(p(x + 160, ground - 540, 620, true));
    platforms.push(p(x + 40, ground - 820, 520, true));
    ropes.push({ x: x + 340, y: ground - 860, h: 820, kind: i % 2 ? "chain" : "rope" });
  }
  const skyTop = ground - WORLD_H * 3.05;
  const skyBottom = ground - WORLD_H * 0.98;
  const rows = 8;
  for (let row = 0; row < rows; row++) {
    const y = skyBottom - (row / (rows - 1)) * (skyBottom - skyTop);
    const count = 6;
    const rise = (skyBottom - skyTop) / (rows - 1);
    for (let c = 0; c < count; c++) {
      const shift = (row % 2) * 360;
      const x = 180 + shift + c * ((width - 1100) / count);
      const w = 560 + (c % 3) * 50;
      platforms.push(p(Math.round(x), Math.round(y), w, true));
      if (c % 2 === 0 && row < rows - 1) {
        ropes.push({ x: Math.round(x + w * 0.5), y: Math.round(y - rise + 24), h: Math.round(rise - 16), kind: "glow" });
      }
    }
  }
  [0.18, 0.42, 0.63, 0.84].forEach((t, i) => {
    const x = Math.round(width * t);
    const y = Math.round(skyBottom - WORLD_H * (0.35 + (i % 3) * 0.55));
    ropes.push({ x, y, h: 460, kind: "swing", swing: 240, phase: i * 1.7, home: x });
  });
  return { platforms, ropes };
}

function helaPlatforms(width: number): Platform[] {
  const ground = GROUND_Y;
  const plats: Platform[] = [p(-80, ground, width + 160, false)];
  for (let i = 0; i < 18; i++) {
    const col = i % 6;
    const row = Math.floor(i / 6);
    const x = 280 + col * ((width - 1400) / 6) + (row % 2) * 180;
    const y = ground - 240 - row * 210 - (col % 2) * 36;
    plats.push(p(Math.round(x), Math.round(y), 700 + (i % 3) * 60, true));
  }
  return plats;
}

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
      { shop: "potion", x: wx(190), y: wy(400), label: "Potion Shop", box: zone(wx(140), wx(180), wy(400), 220, 120) },
      { shop: "item", x: wx(400), y: wy(446), label: "Item Shop", box: zone(wx(280), wx(250), wy(446), 220, 120) },
      { shop: "warehouse", x: wx(180), y: CITY_GROUND, label: "Warehouse", box: zone(wx(40), wx(230), CITY_GROUND, 180, 70) },
      { shop: "inn", x: wx(468), y: CITY_GROUND, label: "Inn", box: zone(wx(400), wx(130), CITY_GROUND, 180, 70) },
      { shop: "friend", x: wx(740), y: CITY_GROUND, label: "Friend's House", box: zone(wx(640), wx(55), CITY_GROUND, 160, 70) },
      { shop: "arena", x: wx(1040), y: CITY_GROUND, label: "Battle Stadium", box: zone(wx(980), wx(70), CITY_GROUND, 180, 70) },
      { shop: "hall", x: wx(600), y: wy(448), label: "City Hall", box: zone(wx(510), wx(180), wy(448), 240, 70) },
      { shop: "stable", x: wx(1000), y: wy(486), label: "Mount Stable", box: zone(wx(860), wx(300), wy(486), 240, 90) },
      { shop: "auction", x: wx(1060), y: wy(204), label: "Trading Post", box: zone(wx(940), wx(220), wy(204), 220, 90) },
      { shop: "casino", x: wx(860), y: wy(248), label: "Casino", box: zone(wx(760), wx(190), wy(248), 160, 70) },
      { shop: "casino", x: wx(800), y: wy(158), label: "Casino", box: zone(wx(690), wx(250), wy(158), 170, 70) },
    ],
    gates: [
      ...REALM_ORDER.map((realm, index) => ({
        x: [164, 1027, 1336, 2860, 2055, 2603, 3116, 3795][index] ?? 200,
        y: CITY_GROUND,
        to: realm.to,
        label: realm.name,
      })),
      { x: wx(790), y: wy(448), to: "jail", label: "Jail", box: zone(wx(700), wx(220), wy(448), 240, 70) },
    ],
    hazard: false,
    spawns: [],
  },
  yggdrasil: {
    id: "yggdrasil",
    name: "Sacred Field",
    theme: "vanaheim",
    bg: "/assets/maps/yggdrasil.jpg",
    w: WORLD_W,
    h: WORLD_H,
    platforms: [p(-80, GROUND_Y, WORLD_W + 160, false)],
    ropes: [],
    npcs: [],
    gates: [{ x: 220, y: GROUND_Y, to: "midgard", label: "Pipe", back: true }],
    hazard: false,
    spawns: [],
    boss: "mimir",
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
    gates: [{ x: 120, y: 786, to: "midgard", label: "Street", back: true, box: { x: 0, w: 340, top: 560, bot: 860 } }],
    hazard: false,
    spawns: [],
  },
  duel: {
    id: "duel",
    name: "Duel Pit",
    theme: "city",
    bg: "/assets/maps/midgard.jpg",
    w: WORLD_W,
    h: WORLD_H,
    platforms: [
      p(-80, GROUND_Y, WORLD_W + 160, false),
      p(640, GROUND_Y - 300, 980, true),
      p(2300, GROUND_Y - 300, 980, true),
      p(1500, GROUND_Y - 560, 780, true),
    ],
    ropes: [],
    npcs: [],
    gates: [{ x: 220, y: GROUND_Y, to: "midgard", label: "Street", back: true }],
    hazard: false,
    spawns: [],
  },
  ffa: {
    id: "ffa",
    name: "Free For All",
    theme: "city",
    bg: "/assets/maps/coliseum.jpg",
    w: WORLD_W * 4,
    h: WORLD_H * 4,
    platforms: arenaLayout(WORLD_W * 4).platforms,
    ropes: arenaLayout(WORLD_W * 4).ropes,
    npcs: [],
    gates: [{ x: 220, y: GROUND_Y, to: "midgard", label: "Street", back: true }],
    hazard: false,
    spawns: [],
  },
};

MAPS["ffa-ultra"] = {
  id: "ffa-ultra",
  name: "Ultra Free For All",
  theme: "death",
  bg: "/assets/maps/coliseum-haunted.jpg",
  w: WORLD_W * 4,
  h: WORLD_H,
  platforms: helaPlatforms(WORLD_W * 4),
  ropes: [],
  npcs: [],
  gates: [{ x: 220, y: GROUND_Y, to: "midgard", label: "Street", back: true }],
  hazard: false,
  spawns: [],
  boss: "ultrahela",
  bosses: ["ultrahela"],
  diff: 3,
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
          : opts.mobs.map((kind) => ({ kind, count: 18 })),
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

const helNightmare = MAPS["death-nightmare"];
if (helNightmare) {
  helNightmare.spawns = [
    { kind: "vulture", count: 28 },
    { kind: "skfrog", count: 22 },
    { kind: "rat", count: 22 },
  ];
}

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
if (MAPS["thingstead-easy"]) MAPS["thingstead-easy"].left = undefined;

function returnDoor(id: string, back: string, label: string) {
  const map = MAPS[id];
  if (!map) return;
  map.left = undefined;
  map.gates = [...(map.gates ?? []), { x: 220, y: GROUND_Y, to: back, label, back: true }];
}

returnDoor("asgard-medium", "asgard-easy", "Bifrost");
returnDoor("asgard-hard", "asgard-medium", "Castle");
returnDoor("asgard-nightmare", "asgard-hard", "Inner Gate");
returnDoor("thingstead-easy", "asgard-nightmare", "High Thingstead");
returnDoor("thingstead-medium", "thingstead-easy", "Pink Door");
returnDoor("thingstead-hard", "thingstead-medium", "Green Door");
returnDoor("thingstead-nightmare", "thingstead-hard", "Purple Door");

const denBg = "/assets/maps/death-nightmare.jpg";
MAPS["dwarf-den"] = {
  id: "dwarf-den",
  name: "Den of Terror",
  theme: "nidavellir",
  bg: denBg,
  w: WORLD_W,
  h: WORLD_H,
  platforms: regionPlatforms(3),
  ropes: regionRopes(3, "chain"),
  npcs: [],
  gates: [{ x: 220, y: GROUND_Y, to: "nidavellir-nightmare", label: "Back", back: true }],
  hazard: true,
  spawns: [],
  boss: "terror",
  bosses: ["terror"],
  diff: 3,
};
const nida = MAPS["nidavellir-nightmare"];
if (nida) {
  nida.gates = [...nida.gates, { x: WORLD_W - 360, y: GROUND_Y, to: "dwarf-den", label: "Secret Door", dwarf: true }];
}

const tyrMap = MAPS["asgard-medium"];
if (tyrMap) tyrMap.gates.push({ x: WORLD_W / 2, y: GROUND_Y, to: "fenrir-pit", label: "Wolf Door", fenrir: true });
const nifl = MAPS["niflheim-nightmare"];
if (nifl) nifl.gates.push({ x: WORLD_W - 520, y: GROUND_Y, to: "serpent-barge", label: "", boat: true });

function skyMap(id: string, name: string, bosses: BossId[], next?: string, down?: string): MapDef {
  return {
    id,
    name,
    theme: "asgard",
    bg: "/assets/maps/asgard.jpg",
    w: WORLD_W,
    h: WORLD_H,
    platforms: regionPlatforms(1),
    ropes: [{ x: WORLD_W / 2, y: 70, h: GROUND_Y - 40, kind: "rope", to: next, down, need: next ? "clear" : undefined }],
    npcs: [],
    gates: [],
    hazard: false,
    spawns: [],
    boss: bosses[0],
    bosses,
    diff: 3,
  };
}

MAPS["cloud-1"] = skyMap("cloud-1", "Cloud Road", ["sky1"], "cloud-2", "midgard");
MAPS["cloud-2"] = skyMap("cloud-2", "Higher Clouds", ["sky2", "sky3"], "cloud-3", "cloud-1");
MAPS["cloud-3"] = skyMap("cloud-3", "Valkyrie Gate", ["sky4", "sky5", "sky6"], "asgard-secret", "cloud-2");
MAPS["asgard-secret"] = skyMap("asgard-secret", "Secret Asgard", ["odin", "sky7", "sky8", "sky9"], undefined, "cloud-3");
const odinMap = MAPS["asgard-secret"];
if (odinMap) {
  const ground = Math.round(WORLD_H * 2 * 0.9);
  odinMap.h = WORLD_H * 2;
  odinMap.platforms = [
    p(-160, ground, WORLD_W + 320, false),
    p(140, ground - 320, 780, true),
    p(1200, ground - 560, 700, true),
    p(2200, ground - 420, 760, true),
    p(3100, ground - 680, 620, true),
    p(520, ground - 980, 560, true),
    p(1700, ground - 1200, 640, true),
    p(2700, ground - 1500, 580, true),
    p(900, ground - 1760, 500, true),
  ];
  odinMap.ropes = [{ x: 720, y: ground - 1900, h: 1900, kind: "chain", down: "cloud-3" }];
}
function fenrirPlatforms(): Platform[] {
  const W = WORLD_W * 2;
  const H = WORLD_H * 4;
  const ground = Math.round(H * 0.92);
  const plats: Platform[] = [p(-200, ground, W + 400, false)];
  const top = ground - WORLD_H * 3.15;
  const rows = 16;
  for (let row = 1; row <= rows; row++) {
    const y = ground - (row / (rows + 0.6)) * (ground - top);
    for (const x0 of [70, WORLD_W + 50]) {
      let x = x0 + (row % 2 === 0 ? 40 : 220);
      const width = 540;
      const limit = x0 + WORLD_W - 100;
      while (x + width < limit) {
        plats.push(p(Math.round(x), Math.round(y), width, true));
        x += width + 260;
      }
    }
  }
  return plats;
}

MAPS["fenrir-pit"] = {
  id: "fenrir-pit",
  name: "Fenrir's Chain",
  theme: "death",
  bg: "/assets/maps/death-nightmare.jpg",
  w: WORLD_W * 2,
  h: WORLD_H * 4,
  platforms: fenrirPlatforms(),
  ropes: [],
  npcs: [],
  gates: [{ x: 220, y: Math.round(WORLD_H * 4 * 0.92), to: "asgard-medium", label: "Back", back: true }],
  hazard: false,
  spawns: [],
  boss: "fenrir",
  bosses: ["fenrir"],
  diff: 3,
};
MAPS["serpent-barge"] = {
  id: "serpent-barge",
  name: "The World Serpent",
  theme: "niflheim",
  bg: "/assets/maps/serpent-boat.jpg",
  w: WORLD_W,
  h: WORLD_H,
  platforms: [
    p(520, Math.round(WORLD_H * 0.62), 2960, false),
    p(340, Math.round(WORLD_H * 0.62) - 55, 200, true),
    p(160, Math.round(WORLD_H * 0.62) - 140, 200, true),
    p(20, Math.round(WORLD_H * 0.62) - 230, 180, true),
    p(3460, Math.round(WORLD_H * 0.62) - 55, 200, true),
    p(3640, Math.round(WORLD_H * 0.62) - 140, 200, true),
    p(3800, Math.round(WORLD_H * 0.62) - 230, 180, true),
    p(1120, Math.round(WORLD_H * 0.62) - 170, 480, true),
    p(1760, Math.round(WORLD_H * 0.62) - 240, 560, true),
    p(2420, Math.round(WORLD_H * 0.62) - 160, 460, true),
    p(1360, Math.round(WORLD_H * 0.62) - 360, 420, true),
    p(2080, Math.round(WORLD_H * 0.62) - 400, 500, true),
  ],
  ropes: [],
  npcs: [{ shop: "ferry", x: 2280, y: Math.round(WORLD_H * 0.62), label: "Guide" }],
  gates: [],
  hazard: false,
  spawns: [],
  boss: "jormungand",
  bosses: ["jormungand"],
  diff: 3,
};

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
  if (map.id === "serpent-barge") {
    const deck = map.platforms.find((plat) => !plat.oneWay);
    return { x: Math.round(map.w / 2), y: deck?.y ?? Math.round(map.h * 0.62) };
  }
  if (map.id === "fenrir-pit") {
    const ground = map.platforms.find((plat) => !plat.oneWay)?.y ?? Math.round(map.h * 0.9);
    if (side === "right") return { x: map.w - 280, y: ground };
    return { x: 260, y: ground };
  }
  if (side === "right") return { x: map.w - 280, y: GROUND_Y };
  return { x: 260, y: GROUND_Y };
}
