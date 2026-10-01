import {
  BAG_MAX,
  BANK_MAX,
  BOSSES,
  CATALOG,
  MONSTERS,
  critChance,
  formatPlus,
  itemDef,
  jumpVelocity,
  maxHp,
  maxSp,
  mitigate,
  newItem,
  nextExp,
  rollMonsterLoot,
  scaledMonster,
  shotDamage,
  slotFor,
  stackInto,
  consolidateBag,
  statsOf,
  stompDamage,
  throwCooldown,
  shellDef,
  isBoundItem,
  type BossId,
  type MonsterId,
} from "./balance";
import { musicTick, syncMapMusic, sfx } from "./audio";
import { installCards } from "./cards";
import { CITY_PIPE, JAIL_STREET, WORLD_H, arrival, mapById, type MapDef, type Platform, type Rope } from "./maps";
import { MOUNTS, mountSpeed, projectileCredits, rollMountSkin, skinRoll } from "./mounts";
import { MAIN_QUESTS, freshQuest, questMap, questMonster, questNeed, questReady, questReward } from "./quests";
import { bossFrame, drawActor, drawAsg, drawBlock, drawBossArt, drawExtra, drawExtraCentered, drawFrame, drawJot, drawNid, drawNifl, drawVan, drawYetiHero, heroFrame, mobFrame, preloadBlocks, preloadBossArt, preloadExtra, preloadNid, type Atlas } from "./sprites";
import { logSystem } from "./syslog";

export { preloadBlocks };
import type { EquipSlot, GroundDrop, HeroId, ItemInst, Peer, SaveState, StatKey } from "./types";

installCards();
preloadExtra([
  ["hammer", "/assets/items/hammer.png"],
  ["thor-hammer", "/assets/items/thor-hammer.png"],
  ["terror-hammer", "/assets/items/terror-hammer.png?v=4"],
  ["skadi-arrow", "/assets/items/skadi-arrow.png?v=8"],
  ["pipe", "/assets/scenery/pipe.png"],
  ["mimir.sleep", "/assets/bosses/mimir.sleep.png?v=4"],
  ["mimir.awake", "/assets/bosses/mimir.awake.png"],
  ["mimir.tree", "/assets/bosses/mimir.tree.png"],
  ["mimir.atk.0", "/assets/bosses/mimir.atk.0.png"],
  ["mimir.atk.1", "/assets/bosses/mimir.atk.1.png"],
  ["mimir.atk.2", "/assets/bosses/mimir.atk.2.png"],
  ["mimir.atk.3", "/assets/bosses/mimir.atk.3.png"],
  ["jorm.0", "/assets/bosses/jorm.0.png"],
  ["jorm.1", "/assets/bosses/jorm.1.png"],
  ["jorm.2", "/assets/bosses/jorm.2.png"],
  ["jorm.3", "/assets/bosses/jorm.3.png"],
  ["odin.0", "/assets/bosses/odin.0.png"],
  ["odin.1", "/assets/bosses/odin.1.png"],
  ["odin.2", "/assets/bosses/odin.2.png"],
  ["odin.3", "/assets/bosses/odin.3.png"],
  ...(["odin.l", "odin.r"] as const).flatMap((name) =>
    [0, 1, 2, 3].map((i) => [`${name}.${i}`, `/assets/bosses/${name}.${i}.png?v=4`] as [string, string]),
  ),
  ...Array.from({ length: 50 }, (_, i) => [`dragon.${i}`, `/assets/skins/dragon-loop/${String(i).padStart(2, "0")}.png`] as [string, string]),
  ...(["mimir.l", "mimir.r", "brokk.l", "brokk.r", "terror.l", "terror.r", "fenrir.l", "fenrir.r"] as const).flatMap((name) =>
    [0, 1, 2, 3].map((i) => [`${name}.${i}`, `/assets/bosses/${name}.${i}.png?v=4`] as [string, string]),
  ),
  ...(["jorm.l", "jorm.r"] as const).flatMap((name) =>
    [0, 1, 2, 3, 4].map((i) => [`${name}.${i}`, `/assets/bosses/${name}.${i}.png`] as [string, string]),
  ),
  ["reaper", "/assets/npcs/reaper.png"],
  ["reaper-stand", "/assets/npcs/reaper-stand.png"],
  ["mount-hammer", "/assets/items/mount-hammer.png?v=8"],
  ["mount-eagle", "/assets/mounts/eagle.png"],
  ...Array.from({ length: 8 }, (_, i) => [`eagle.${i}`, `/assets/mounts/eagle.${i}.png`] as [string, string]),
  ...(["l", "r"] as const).flatMap((side) =>
    [0, 1, 2, 3].flatMap((i) => [
      [`skadi.axe.${side}.${i}`, `/assets/asgard/skadi.axe.${side}.${i}.png?v=8`] as [string, string],
      [`skadi.bow.${side}.${i}`, `/assets/asgard/skadi.bow.${side}.${i}.png?v=8`] as [string, string],
    ]),
  ),
  ["mount-dragon", "/assets/mounts/dragon.png"],
  ["mount-phoenix", "/assets/mounts/phoenix.png?v=5"],
  ["mount-wraith", "/assets/mounts/wraith.png"],
  ["mount-condor", "/assets/mounts/condor.png?v=6"],
  ["mount-raven", "/assets/mounts/raven.png?v=6"],
  ["mount-demon-bat", "/assets/mounts/demon-bat.png?v=5"],
  ["skin-fairy", "/assets/skins/fairy.png"],
  ["skin-angel", "/assets/skins/angel.png"],
  ["skin-cloud", "/assets/skins/cloud.png"],
  ["skin-snake", "/assets/skins/snake.png"],
  ["skin-pegasus", "/assets/skins/pegasus.png"],
  ["skin-gryphon", "/assets/skins/gryphon.png"],
  ["skin-hammer", "/assets/skins/hammer.png"],
  ["skin-chibi", "/assets/skins/chibi.png"],
  ["skin-gargoyle", "/assets/skins/gargoyle.png"],
  ["skin-dwarf-dragon", "/assets/skins/dwarf-dragon.png"],
  ...["hermy", "champo", "tanya", "trizzle", "luna", "ezekiel"].flatMap((hero) =>
    ["l", "r"].flatMap((side) =>
      [0, 1, 2, 3].map((frame) => [`hang.${hero}.${side}.${frame}`, `/assets/hang/${hero}-${side}-${frame}.png`] as [string, string]),
    ),
  ),
]);

const GRAZE = new Set(["bat", "snow", "demon", "fairy", "vulture", "rat", "seal"]);

type Floater = { x: number; y: number; text: string; color: string; life: number; vy: number };
type Bubble = { who: string; text: string; life: number };
type Shock = { x: number; y: number; r: number; life: number; max: number; color: string; dmg: number; hit: boolean; kind?: "ball" | "ground" | "column" | "bolt"; wide?: number; tall?: number; vx?: number };
type Proj = {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  dmg: number;
  proj: string;
  from: "player" | "boss";
  life: number;
  pierce: boolean;
  returning: boolean;
  traveled: number;
  hit: Set<string>;
  owner?: string;
  crit?: boolean;
};
type BossActor = {
  id: BossId;
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  max: number;
  facing: number;
  state: string;
  timer: number;
  anim: number;
  prevY: number;
  grounded: boolean;
  didHit: boolean;
  fallen: boolean;
  asleep?: boolean;
  flameAcc?: number;
  homeX?: number;
  face?: number;
};

const GODS = new Set<BossId>(["heimdall", "tyr", "skadi", "thor", "loki", "thor2", "freyja2"]);
const FLYERS = new Set<BossId>(["nidhogg", "hela2", "ultrahela", "valkyrie", "sky1", "sky2", "sky3", "sky4", "sky5", "sky6", "sky7", "sky8", "sky9"]);

type Mob = {
  id: string;
  kind: MonsterId;
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  max: number;
  facing: number;
  home: Platform | null;
  ai: "slide" | "jump" | "fly" | "roll" | "hover";
  wait: number;
  dead: number;
  anim: number;
  prevY: number;
  touch: number;
  spin: number;
};

export type HudSnap = {
  name: string;
  hero: HeroId;
  level: number;
  exp: number;
  next: number;
  points: number;
  hp: number;
  maxHp: number;
  sp: number;
  maxSp: number;
  gold: number;
  criminal: boolean;
  stance: SaveState["stance"];
  mapId: string;
  mapName: string;
  weapon: string;
  potions: number;
  near: string | null;
  shop: string | null;
  gate: string | null;
  peerId: string | null;
  toast: string;
  jailedUntil: number;
  bossName: string;
  bossHp: number;
  bossMax: number;
  boss2Name: string;
  boss2Hp: number;
  boss2Max: number;
  paused: boolean;
};

type Hooks = {
  onDeathDrop: (drop: { x: number; y: number; gold: number; items: ItemInst[]; localId?: string; kind?: "monster" | "player" | "boss" }) => void;
  onVoidDrop?: (id: string) => void;
  onBossKill: (boss: BossId, x: number, y: number, damage: number) => void;
  onArenaDeath?: (info: { mode: "duel" | "ffa"; attackerId: string }) => void;
  onStory?: (id: string) => void;
  onUnlock?: (door: string) => void;
  onPvp: (peerId: string, amount: number) => void;
  onRevive: (peerId: string) => void;
  onDied: (info: { map: string; attackerId: string }) => void;
  onBranded: () => void;
  onChange: () => void;
  onPersist?: () => void;
  onPartyExp?: (share: number) => void;
  onGuildPoint?: () => void;
};

const THEME_LIP: Record<MapDef["theme"], string> = {
  city: "rgba(228,177,90,0.9)",
  forest: "rgba(120,190,70,0.85)",
  fire: "rgba(255,120,40,0.85)",
  death: "rgba(180,90,255,0.8)",
  jail: "rgba(180,180,180,0.7)",
  nidavellir: "rgba(196,140,72,0.9)",
  jotunheim: "rgba(170,214,240,0.9)",
  vanaheim: "rgba(168,140,72,0.9)",
  niflheim: "rgba(120,190,70,0.55)",
  asgard: "rgba(255,220,120,0.95)",
};

export class Game {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  atlas: Atlas;
  hooks: Hooks;
  state: SaveState;
  map: MapDef;
  peers: Peer[] = [];
  drops: GroundDrop[] = [];
  dropReady = new Map<string, number>();
  dropFall = new Map<string, { y: number; vy: number; land: number }>();
  eaten = new Set<string>();
  projs: Proj[] = [];
  mobs: Mob[] = [];
  floaters: Floater[] = [];
  bubbles: Bubble[] = [];
  shocks: Shock[] = [];
  seaFire = 0;
  sparks: { x: number; y: number; vx: number; vy: number; life: number; color: string; size: number }[] = [];
  levelShow = 0;
  fwTimer = 0;
  fwCrown = 0;
  bosses: BossActor[] = [];
  bossUp: Partial<Record<BossId, boolean>> = {};
  locallyDown = new Set<string>();
  openDoors: Record<string, number> = {};
  camX = 0;
  camY = 0;
  lastZoom = 1;
  shake = 0;
  stickX = 0;
  stickY = 0;
  usingStick = false;
  jumpHeld = false;
  prevJump = false;
  throwHeld = false;
  blockHeld = false;
  runHeld = false;
  climbEdge = false;
  interactEdge = false;
  realKeys = new Set<string>();
  injected = new Set<string>();
  paused = false;
  away = false;
  sawDown = new Set<string>();
  climbing: Rope | null = null;
  coyote = 0;
  jumpBuf = 0;
  grounded = false;
  prevFeet = 0;
  vx = 0;
  vy = 0;
  facing = 1;
  duck = false;
  iframe = 0;
  throwCd = 0;
  anim = 0;
  climbFrame = 0;
  deadT = 0;
  downed = false;
  reviveUid: string | null = null;
  dismissModal = false;
  dropThrough = 0;
  safeX = 200;
  safeY = 1980;
  toast = "";
  toastT = 0;
  portalLock = 0;
  nearShop: string | null = null;
  nearGate: string | null = null;
  nearLabel: string | null = null;
  nearPeer: string | null = null;
  lastAttacker = "";
  potionLock = false;
  prevClimb = false;
  prevInteract = false;
  openRequest: "shop" | "gate" | "peer" | "downed" | "mimir" | "fenrir" | null = null;
  stepAcc = 0;
  raf = 0;
  hideTimer = 0;
  running = false;
  tPrev = 0;
  footT = 0;
  myId = "";
  pendingPickup = new Set<string>();
  onPickup: ((d: GroundDrop) => void) | null = null;
  dpr = 1;
  cssW = 1;
  cssH = 1;
  hopCd = 0;
  bounceLock = 0;
  stompChain = 0;
  stompChainT = 0;
  bossHurt = new Map<string, number>();
  crownId = "";
  crownT = 0;
  throwAnim = 0;
  zoomUser = 1;
  nearKneel = false;
  nearMimir = false;
  puddles: { x: number; y: number; life: number; dmg: number; tick: number }[] = [];
  partySize = 1;
  pipeSink = 0;
  throwPulse = 0;
  battleLock = 0;

  constructor(canvas: HTMLCanvasElement, atlas: Atlas, state: SaveState, hooks: Hooks) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas");
    this.ctx = ctx;
    this.atlas = atlas;
    this.state = state;
    consolidateBag(this.state.bag);
    consolidateBag(this.state.storage);
    this.hooks = hooks;
    this.map = mapById(state.map);
    this.facing = 1;
    this.resize();
    this.enter(state.map, "gate", true);
    this.state.x = state.x;
    this.state.y = state.y;
    this.snapFeet();
    if (this.state.hp <= 0) {
      this.downed = true;
      this.finishDeath();
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (this.typing(e)) return;
      this.realKeys.add(e.code);
      if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) e.preventDefault();
    };
    const onKeyUp = (e: KeyboardEvent) => this.realKeys.delete(e.code);
    const onBlur = () => {
      this.realKeys.clear();
      this.jumpHeld = false;
      this.prevJump = false;
      this.jumpBuf = 0;
      this.throwHeld = false;
      this.blockHeld = false;
      this.runHeld = false;
    };
    const onFocus = () => {
      this.away = false;
    };
    const onHide = () => {
      if (document.hidden) onBlur();
      else this.away = false;
    };
    const onPageHide = () => onBlur();
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("pageshow", onFocus);
    document.addEventListener("visibilitychange", onHide);
    this.resize = this.resize.bind(this);
    window.addEventListener("resize", this.resize);
    (this as unknown as { _clean: () => void })._clean = () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("pageshow", onFocus);
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("resize", this.resize);
    };
  }

  typing(e: KeyboardEvent) {
    const el = e.target as HTMLElement | null;
    return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA");
  }

  start() {
    this.running = true;
    this.tPrev = performance.now();
    const loop = (t: number) => {
      if (!this.running) return;
      this.raf = requestAnimationFrame(loop);
      if (document.hidden) return;
      const dt = Math.min(0.05, (t - this.tPrev) / 1000);
      this.tPrev = t;
      this.frame(dt);
    };
    this.raf = requestAnimationFrame(loop);
    this.hideTimer = window.setInterval(() => {
      if (!this.running || !document.hidden) return;
      const t = performance.now();
      const dt = Math.min(0.05, (t - this.tPrev) / 1000);
      this.tPrev = t;
      this.frame(dt);
    }, 1000 / 30);
    this.expose();
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
    window.clearInterval(this.hideTimer);
    (this as unknown as { _clean?: () => void })._clean?.();
    delete window.__controlsTest;
  }

  resize = () => {
    const r = this.canvas.getBoundingClientRect();
    this.cssW = Math.max(1, r.width);
    this.cssH = Math.max(1, r.height);
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = Math.floor(this.cssW * this.dpr);
    this.canvas.height = Math.floor(this.cssH * this.dpr);
  };

  setStick(x: number, y: number, active: boolean) {
    this.stickX = x;
    this.stickY = y;
    this.usingStick = active;
  }

  setHold(name: "jump" | "throw" | "block" | "run", down: boolean) {
    if (name === "jump") {
      if (down) this.jumpBuf = 0.12;
      this.jumpHeld = down;
    } else if (name === "throw") {
      this.throwHeld = down;
      if (down) this.throwPulse = performance.now();
    } else if (name === "block") this.blockHeld = down;
    else this.runHeld = down;
  }

  pulseHold(name: "throw" | "jump" | "block" | "run") {
    if (name === "throw") this.throwPulse = performance.now();
  }

  press(name: "climb" | "interact") {
    if (name === "climb") this.climbEdge = true;
    else this.interactEdge = true;
  }

  setKeys(codes: string[]) {
    this.injected = new Set(codes);
  }

  setPaused(v: boolean) {
    this.paused = v;
    if (v) {
      this.jumpHeld = false;
      this.throwHeld = false;
      this.blockHeld = false;
      this.runHeld = false;
    }
  }

  setPeers(peers: Peer[]) {
    this.peers = peers.filter((p) => p.id !== this.myId);
  }

  syncDrops(serverDrops: GroundDrop[]) {
    const local = this.drops.filter((d) => d.local);
    const prev = new Set(this.drops.map((d) => d.id));
    this.drops = [...local, ...serverDrops];
    for (const d of serverDrops) {
      this.ensureFall(d);
      this.graceIfStanding(d, prev.has(d.id));
    }
  }

  consumeDrop(id: string) {
    this.drops = this.drops.filter((d) => d.id !== id);
    this.pendingPickup.delete(id);
    this.dropFall.delete(id);
  }

  addServerDrop(d: GroundDrop) {
    if (this.drops.some((x) => x.id === d.id)) return;
    this.drops.push(d);
    this.ensureFall(d);
    this.graceIfStanding(d, false);
  }

  adoptDrop(localId: string, made: GroundDrop) {
    if (this.eaten.has(localId)) {
      this.eaten.delete(localId);
      this.hooks.onVoidDrop?.(made.id);
      return;
    }
    const prev = this.drops.find((d) => d.id === localId);
    const ready = this.dropReady.get(localId);
    const fall = this.dropFall.get(localId);
    this.dropReady.delete(localId);
    this.dropFall.delete(localId);
    this.drops = this.drops.filter((d) => d.id !== localId);
    if (ready) this.dropReady.set(made.id, ready);
    if (fall) this.dropFall.set(made.id, fall);
    if (!this.drops.some((d) => d.id === made.id)) this.drops.push({ ...made, local: false, kind: made.kind ?? prev?.kind, born: made.born ?? prev?.born ?? Date.now() });
    if (!fall) this.ensureFall(made);
  }

  graceIfStanding(d: GroundDrop, known: boolean) {
    if (known) return;
    if (Math.hypot(d.x - this.state.x, d.y - this.state.y) < 64) this.dropReady.set(d.id, Date.now() + 1600);
  }

  spawnLoot(x: number, y: number, gold: number, items: ItemInst[], kind: "monster" | "player" | "boss" = "player") {
    const id = crypto.randomUUID();
    const drop: GroundDrop = { id, x, y, gold, items, claimId: null, publicAt: 0, local: true, kind, born: Date.now() };
    this.drops.push(drop);
    this.ensureFall(drop);
    this.graceIfStanding(drop, false);
    this.hooks.onDeathDrop({ x, y, gold, items, localId: id, kind });
  }

  spawnScatter(x: number, y: number, gold: number, items: ItemInst[], kind: "monster" | "player" | "boss" = "player") {
    if (gold > 0) this.spawnLoot(x - 22, y, gold, [], kind);
    items.forEach((item, i) => {
      const ang = (i / Math.max(1, items.length)) * Math.PI * 2;
      this.spawnLoot(x + Math.cos(ang) * 34, y, 0, [{ ...item, bag: undefined }], kind);
    });
  }

  spawnBag(x: number, y: number, gold: number, items: ItemInst[]) {
    if (items.length) {
      const marked = items.map((item, i) => (i === 0 ? { ...item, bag: true } : item));
      this.spawnLoot(x - 24, y, 0, marked);
    }
    if (gold > 0) this.spawnLoot(x + 24, y, gold, []);
  }

  checkBoat() {
    if (this.map.id !== "serpent-barge" || this.downed) return;
    const deck = this.map.platforms.find((plat) => !plat.oneWay);
    if (!deck) return;
    for (const plat of this.map.platforms) {
      if (!plat.oneWay) continue;
      const outside = plat.x + plat.w < deck.x + 30 || plat.x > deck.x + deck.w - 30;
      if (!outside) continue;
      const into = this.state.x > plat.x - 6 && this.state.x < plat.x + plat.w + 6 && this.state.y > plat.y + 8 && this.state.y < plat.y + 78;
      if (!into) continue;
      this.state.x = this.state.x < deck.x + deck.w / 2 ? plat.x + plat.w + 12 : plat.x - 12;
      this.vx = 0;
    }
    const standing = this.map.platforms.some((plat) => Math.abs(this.state.y - plat.y) < 10 && this.state.x >= plat.x && this.state.x <= plat.x + plat.w);
    if (standing || this.state.y < deck.y + 24) return;
    this.beginDeath();
    for (const drop of this.drops) {
      if (drop.kind !== "player" || !drop.born || Date.now() - drop.born > 2000) continue;
      drop.kind = "monster";
      const fall = this.dropFall.get(drop.id);
      if (fall) {
        fall.land = this.map.h + 700;
        fall.vy = 480;
      }
    }
  }

  floorUnder(x: number, y: number) {
    let land = y;
    let best = Infinity;
    for (const plat of this.map.platforms) {
      if (x < plat.x + 6 || x > plat.x + plat.w - 6) continue;
      if (plat.y + 4 < y) continue;
      if (plat.y < best) {
        best = plat.y;
        land = plat.y;
      }
    }
    return land;
  }

  ensureFall(d: GroundDrop) {
    if (this.dropFall.has(d.id)) return;
    const land = this.floorUnder(d.x, d.y);
    this.dropFall.set(d.id, { y: Math.min(d.y, land), vy: land > d.y + 6 ? 80 : 0, land });
  }

  dropSpot(d: GroundDrop) {
    return this.dropFall.get(d.id)?.y ?? d.y;
  }

  stepDrops(dt: number) {
    const now = Date.now();
    for (const d of [...this.drops]) {
      if (d.kind !== "monster" || !d.born || now - d.born < 180000) continue;
      if (d.local) this.eaten.add(d.id);
      else this.hooks.onVoidDrop?.(d.id);
      this.drops = this.drops.filter((x) => x.id !== d.id);
      this.dropFall.delete(d.id);
      this.dropReady.delete(d.id);
    }
    for (const id of [...this.dropFall.keys()]) {
      if (!this.drops.some((d) => d.id === id)) this.dropFall.delete(id);
    }
    for (const fall of this.dropFall.values()) {
      if (fall.y >= fall.land) {
        fall.y = fall.land;
        continue;
      }
      fall.vy = Math.min(1700, fall.vy + 2600 * dt);
      fall.y = Math.min(fall.land, fall.y + fall.vy * dt);
    }
  }

  setBossEnabled(on: boolean) {
    const id = this.map.boss;
    if (!id) return;
    if (!on) this.locallyDown.add(id);
    else this.locallyDown.delete(id);
    this.bossUp[id] = on;
    this.reconcileBosses();
  }

  syncBosses(rows: { id: BossId; up: boolean }[]) {
    for (const row of rows) {
      if (!row.up) {
        this.locallyDown.delete(row.id);
        this.sawDown.add(row.id);
        this.bossUp[row.id] = false;
        continue;
      }
      if (this.sawDown.has(row.id)) {
        this.sawDown.delete(row.id);
        this.locallyDown.delete(row.id);
        this.bossUp[row.id] = true;
        continue;
      }
      if (this.locallyDown.has(row.id)) continue;
      if (row.id === "ultrahela" && this.ultraResting()) {
        this.bossUp.ultrahela = false;
        continue;
      }
      this.bossUp[row.id] = row.up;
    }
    this.reconcileBosses();
  }

  syncDoors(rows: { id: string; openUntil: number }[]) {
    const next: Record<string, number> = {};
    for (const row of rows) next[row.id] = row.openUntil;
    for (const [id, until] of Object.entries(this.openDoors)) {
      if (until > Date.now() && next[id] == null) next[id] = until;
    }
    this.openDoors = next;
  }

  roster(): BossId[] {
    if (this.map.bosses?.length) return this.map.bosses;
    return this.map.boss ? [this.map.boss] : [];
  }

  reconcileBosses() {
    const ids = this.roster();
    this.bosses = this.bosses.filter((b) => ids.includes(b.id));
    ids.forEach((id, index) => {
      if (id === "ultrahela" && this.ultraResting()) {
        this.bosses = this.bosses.filter((b) => b.id !== id);
        return;
      }
      const up = this.bossUp[id] !== false;
      const have = this.bosses.find((b) => b.id === id);
      if (id === "valkyrie" && !up) {
        if (have) have.fallen = true;
        else this.bosses.push(this.makeBoss(id, index, ids.length, true));
        return;
      }
      if (!up) {
        this.bosses = this.bosses.filter((b) => b.id !== id);
        return;
      }
      if (!have) this.bosses.push(this.makeBoss(id, index, ids.length, false));
      else if (have.fallen && id !== "ultrahela") {
        have.fallen = false;
        have.hp = have.max;
        have.state = "wait";
        have.timer = 0.6;
      }
    });
  }

  expose() {
    window.__controlsTest = {
      getYaw: () => 0,
      getSpeed: () => Math.abs(this.vx),
      getX: () => this.state.x,
      setKeys: (codes: string[]) => this.setKeys(codes),
      setSteer: () => {},
    };
  }

  key(code: string) {
    return this.realKeys.has(code) || this.injected.has(code);
  }

  axes() {
    let x = 0;
    let y = 0;
    if (this.key("KeyA") || this.key("ArrowLeft")) x -= 1;
    if (this.key("KeyD") || this.key("ArrowRight")) x += 1;
    if (this.key("KeyW") || this.key("ArrowUp")) y -= 1;
    if (this.key("KeyS") || this.key("ArrowDown")) y += 1;
    if (this.usingStick) {
      x = this.stickX;
      y = this.stickY;
    }
    const jump = this.jumpHeld || this.key("Space");
    const run = this.runHeld || this.key("ShiftLeft") || this.key("ShiftRight");
    const block = this.blockHeld || this.key("KeyQ");
    const thro = this.throwHeld || this.key("KeyF");
    if (jump && !this.prevJump) this.jumpBuf = 0.12;
    this.prevJump = jump;
    return { x, y, jump, run, block, thro };
  }

  enter(id: string, side: "left" | "right" | "gate", keepVitals = true) {
    this.map = mapById(id);
    this.state.map = this.map.id;
    if (this.map.bg) preloadMap(this.map.bg);
    if (this.map.gates.length) preloadPortals();
    if (this.map.ropes.some((rope) => rope.kind === "chain")) preloadChain();
    syncMapMusic(this.map);
    const spot = arrival(this.map, side);
    const stood = this.findStand(spot.x);
    this.state.x = stood.x;
    this.state.y = stood.y;
    this.vx = 0;
    this.vy = 0;
    this.climbing = null;
    this.projs = [];
    this.drops = [];
    this.puddles = [];
    this.dropReady.clear();
    this.dropFall.clear();
    this.portalLock = 0.8;
    this.safeX = stood.x;
    this.safeY = stood.y;
    this.spawnMobs();
    this.bosses = [];
    this.reconcileBosses();
    if (!keepVitals) {
      this.state.hp = maxHp(this.state);
      this.state.sp = maxSp(this.state);
    }
    this.camX = 0;
    this.camY = 0;
    this.aimCamera(true);
    sfx("portal");
    this.hooks.onChange();
  }

  enterRope(id: string, end: "top" | "bottom") {
    this.enter(id, "gate");
    const rope =
      (end === "top"
        ? this.map.ropes.find((r) => r.down)
        : this.map.ropes.find((r) => r.to)) ??
      this.map.ropes.find((r) => r.to || r.down);
    if (!rope) return;
    this.climbing = rope;
    this.state.x = rope.x;
    this.state.y = end === "bottom" ? rope.y + rope.h - 48 : rope.y + 72;
    this.vx = 0;
    this.vy = 0;
    this.portalLock = 0.85;
    this.aimCamera(true);
  }

  findStand(x: number) {
    for (let dx = 0; dx < this.map.w; dx += 16) {
      for (const dir of [0, -1, 1]) {
        const xx = Math.max(30, Math.min(this.map.w - 30, x + dir * dx));
        const under = this.map.platforms.filter((p) => xx >= p.x + 8 && xx <= p.x + p.w - 8);
        if (!under.length) continue;
        under.sort((a, b) => b.y - a.y);
        return { x: xx, y: under[0]!.y };
      }
    }
    return { x: 200, y: this.map.platforms[0]?.y ?? 400 };
  }

  snapFeet() {
    const s = this.findStand(this.state.x);
    this.state.x = s.x;
    this.state.y = s.y;
  }

  spawnMobs() {
    this.mobs = [];
    const plats = this.map.platforms.filter((p) => p.w > 140);
    const queue: { kind: MonsterId }[] = [];
    if (this.map.id === "death-nightmare") {
      const bags = this.map.spawns.map((sp) => Array.from({ length: sp.count }, () => sp.kind));
      let left = bags.reduce((n, bag) => n + bag.length, 0);
      while (left > 0) {
        for (const bag of bags) {
          const kind = bag.pop();
          if (!kind) continue;
          queue.push({ kind });
          left--;
        }
      }
    } else {
      for (const sp of this.map.spawns) for (let i = 0; i < sp.count; i++) queue.push({ kind: sp.kind });
    }
    const total = queue.length;
    let placed = 0;
    for (const sp of queue) {
        const scramble = this.map.id === "death-nightmare" ? (placed * 7) % Math.max(1, total) : placed;
        const along = (scramble + 0.5) / Math.max(1, total);
        const wantX = 140 + along * (this.map.w - 280);
        const row = placed % Math.max(1, plats.length);
        const covering = plats.filter((p) => wantX >= p.x + 30 && wantX <= p.x + p.w - 30);
        const plat = covering.length ? covering[row % covering.length]! : plats[row]!;
        const def = MONSTERS[sp.kind];
        let px = Math.min(plat.x + plat.w - 48, Math.max(plat.x + 48, wantX));
        let homePlat = plat;
        if (def.sprite === "wolf") {
          const band = (this.map.w - 420) / Math.max(1, total);
          const slotX = 210 + (placed + 0.5) * band;
          const atX = plats.filter((p) => slotX >= p.x + 50 && slotX <= p.x + p.w - 50);
          const upper = atX.filter((p) => p.oneWay);
          const ground = atX.find((p) => !p.oneWay);
          homePlat = placed % 2 === 1 && upper.length ? upper[placed % upper.length]! : ground ?? atX[0] ?? plat;
          px = Math.min(homePlat.x + homePlat.w - 70, Math.max(homePlat.x + 70, slotX));
        } else if (def.ai === "roll" || def.sprite === "fawn" || def.sprite === "serpent") {
          const uppers = covering.filter((p) => p.oneWay);
          if (uppers.length && placed % 2 === 0) homePlat = uppers[placed % uppers.length]!;
        }
        const span = Math.min(def.sprite === "wolf" ? 340 : 480, homePlat.w - 24);
        const homeX = Math.max(homePlat.x, Math.min(px - span / 2, homePlat.x + homePlat.w - span));
        const power = scaledMonster(sp.kind, this.map.diff ?? 0);
        const mob: Mob = {
          id: `m${placed}-${sp.kind}`,
          kind: sp.kind,
          x: Math.min(homePlat.x + homePlat.w - 48, Math.max(homePlat.x + 48, px)),
          y: homePlat.y,
          vx: def.speed,
          vy: 0,
          hp: power.hp,
          max: power.hp,
          touch: power.touch,
          facing: placed % 2 === 0 ? 1 : -1,
          home: { x: homeX, y: homePlat.y, w: span, h: homePlat.h, oneWay: homePlat.oneWay },
          ai: def.ai,
          wait: 0.4 + Math.random(),
          dead: 0,
          anim: Math.random() * 4,
          prevY: homePlat.y,
          spin: Math.random() * 6,
        };
        if (def.ai === "fly" || def.ai === "hover") {
          const hop = this.map.id === "death-nightmare" ? 40 + ((placed * 5) % 12) * 70 : 90 + (placed % 5) * 36;
          mob.y -= hop;
        }
        this.mobs.push(mob);
        placed++;
    }
  }

  ultraResting() {
    return this.readUltra().until > Date.now();
  }

  readUltra(): { hp: number; until: number } {
    try {
      const raw = localStorage.getItem("midgard-ultra-hela");
      if (!raw) return { hp: 0, until: 0 };
      const parsed = JSON.parse(raw) as { hp?: number; until?: number };
      return { hp: Math.max(0, Number(parsed.hp) || 0), until: Number(parsed.until) || 0 };
    } catch {
      return { hp: 0, until: 0 };
    }
  }

  writeUltra(hp: number, until: number) {
    try {
      const prev = this.readUltra();
      localStorage.setItem("midgard-ultra-hela", JSON.stringify({
        hp,
        until: until > 0 ? until : hp <= 0 ? prev.until : 0,
      }));
    } catch {
      /* storage blocked */
    }
  }

  sayBubble(fromId: string, fromName: string, body: string) {
    const text = body.trim().slice(0, 80);
    if (!text) return;
    const mine = fromId === this.myId || fromName === this.state.name;
    const who = mine ? this.myId : (this.peers.find((p) => p.id === fromId)?.id ?? this.peers.find((p) => p.name === fromName)?.id);
    if (!who && !mine) return;
    this.bubbles.push({ who: mine ? this.myId : who!, text, life: 4.2 });
  }

  makeBoss(id: BossId, index: number, count: number, fallen: boolean): BossActor {
    const def = BOSSES[id];
    const grounds = this.map.platforms.filter((p) => !p.oneWay);
    const plat = [...grounds].sort((a, b) => a.x + a.w - (b.x + b.w)).at(-1) ?? this.map.platforms[0]!;
    const x = count > 1 ? this.map.w * (0.28 + (index / Math.max(1, count - 1)) * 0.5) : Math.min(this.map.w - 220, plat.x + plat.w - 160);
    const actor: BossActor = {
      id,
      x,
      y: plat.y,
      vx: 0,
      vy: 0,
      hp: fallen ? 0 : def.hp,
      max: def.hp,
      facing: -1,
      state: fallen ? "fall" : "wait",
      timer: 0.6,
      anim: 0,
      prevY: plat.y,
      grounded: true,
      didHit: false,
      fallen,
    };
    if (id === "skadi") {
      actor.x = this.map.w * 0.62;
      actor.timer = 0.05;
      actor.facing = -1;
    }
    if (id === "mimir") {
      actor.asleep = true;
      actor.x = this.map.w * 0.58;
      actor.homeX = actor.x;
      actor.state = "sleep";
    }
    if (id === "fenrir") {
      actor.homeX = this.map.w * 0.5;
      actor.x = actor.homeX;
      const ground = this.map.platforms.find((plat) => !plat.oneWay);
      if (ground) actor.y = ground.y;
    }
    if (id === "jormungand") {
      actor.y = plat.y + 320;
      actor.state = "dive";
      actor.timer = 1.2;
      actor.homeX = this.map.w * 0.7;
    }
    if (id === "ultrahela") {
      const saved = this.readUltra();
      if (saved.until > Date.now()) {
        actor.hp = 0;
        actor.fallen = true;
      } else if (saved.hp > 0) actor.hp = Math.min(def.hp, saved.hp);
      actor.y -= 180;
      actor.grounded = false;
    }
    if (FLYERS.has(id) && !fallen) {
      actor.y -= 240;
      actor.grounded = false;
    }
    if (!fallen) sfx("boss");
    return actor;
  }

  spawnBoss() {
    this.reconcileBosses();
  }

  frame(dt: number) {
    this.resize();
    if (!this.paused) this.sim(dt);
    this.tickFireworks(dt);
    this.toastT = Math.max(0, this.toastT - dt);
    musicTick();
    this.draw();
    this.expose();
  }

  height() {
    return this.duck ? 36 : 58;
  }

  sim(dt: number) {
    const t = performance.now() / 1000;
    for (const rope of this.map.ropes) {
      if (rope.kind !== "swing" || !rope.swing) continue;
      if (rope.home == null) rope.home = rope.x;
      rope.x = rope.home + Math.sin(t * 0.85 + (rope.phase ?? 0)) * rope.swing;
    }
    const steps = Math.max(1, Math.round(dt / (1 / 60)));
    const h = dt / steps;
    for (let i = 0; i < steps; i++) this.step(h);
  }

  step(dt: number) {
    if (this.downed) {
      this.climbing = null;
      const pace = 1 / this.viewZoom();
      this.vy += 2850 * pace * dt;
      if (this.vy > 980 * pace) this.vy = 980 * pace;
      this.vx *= Math.max(0, 1 - 3 * dt);
      this.prevFeet = this.state.y;
      this.state.x += this.vx * dt;
      this.state.y += this.vy * dt;
      if (this.resolveY()) {
        this.grounded = true;
        this.vy = 0;
        this.vx = 0;
      }
      if (this.state.y > this.map.h + 40) {
        const stood = this.findStand(this.state.x);
        this.state.x = stood.x;
        this.state.y = stood.y;
        this.vy = 0;
        this.vx = 0;
        this.grounded = true;
      }
      this.shake = Math.max(0, this.shake - dt * 2.5);
      this.iframe = Math.max(0, this.iframe - dt);
    this.battleLock = Math.max(0, this.battleLock - dt);
      const interactNow = this.key("KeyE");
      if (this.interactEdge || (interactNow && !this.prevInteract)) this.useInteract();
      this.interactEdge = false;
      this.prevInteract = interactNow;
      this.updateMobs(dt);
      this.updateBoss(dt);
      this.updateProjs(dt);
      this.updatePuddles(dt);
      return;
    }
    const ax = this.axes();
    if (this.throwHeld && !this.key("KeyF") && performance.now() - this.throwPulse > 450) this.throwHeld = false;
    if (!ax.jump && this.vy < 0 && this.bounceLock <= 0) this.vy *= 0.55;
    this.blockHeld = ax.block;
    this.throwHeld = ax.thro && !ax.block;
    this.runHeld = ax.run;

    if (this.state.jailedUntil && Date.now() > this.state.jailedUntil && this.map.id === "jail") {
      this.state.jailedUntil = 0;
      this.state.criminal = false;
      this.toastMsg("Sentence served. You walk free.");
      this.enter("midgard", "gate");
      return;
    }

    this.iframe = Math.max(0, this.iframe - dt);
    this.battleLock = Math.max(0, this.battleLock - dt);
    this.throwCd = Math.max(0, this.throwCd - dt);
    this.throwAnim = Math.max(0, this.throwAnim - dt);
    this.hopCd = Math.max(0, this.hopCd - dt);
    this.bounceLock = Math.max(0, this.bounceLock - dt);
    this.stompChainT = Math.max(0, this.stompChainT - dt);
    if (this.stompChainT <= 0) this.stompChain = 0;
    this.crownT = Math.max(0, this.crownT - dt);
    this.portalLock = Math.max(0, this.portalLock - dt);
    this.dropThrough = Math.max(0, this.dropThrough - dt);
    if (!this.climbing) this.anim += dt * (Math.abs(this.vx) > 20 ? 10 : 4);

    const pace = 1 / this.viewZoom();
    if (this.pipeSink > 0) {
      this.vx = 0;
      this.vy = 0;
    } else if (this.climbing) {
      this.vx = 0;
      this.vy = ax.y * 170 * pace;
      this.state.x = this.climbing.x;
      const y0 = this.state.y;
      this.state.y += this.vy * dt;
      const top = this.climbing.y + 8;
      const bot = this.climbing.y + this.climbing.h;
      if (this.state.y < top) this.state.y = top;
      if (this.state.y > bot) this.state.y = bot;
      if (this.portalLock <= 0 && this.climbing.to && this.vy < -1 && this.state.y <= this.climbing.y + 28) {
        if (this.climbing.need === "clear" && !this.bossesCleared()) this.state.y = this.climbing.y + 36;
        else {
          const dest = this.climbing.to;
          this.enterRope(dest, "bottom");
          return;
        }
      }
      if (this.portalLock <= 0 && this.climbing.down && this.vy > 1 && this.state.y >= this.climbing.y + this.climbing.h - 28) {
        const dest = this.climbing.down;
        this.enterRope(dest, "top");
        return;
      }
      if (Math.abs(this.state.y - y0) > 0.35) this.climbFrame += dt * 8;
      if (this.jumpBuf > 0) {
        this.climbing = null;
        this.vy = jumpVelocity(this.state) * 0.72 * pace;
        this.vx = this.facing * 140 * pace;
        this.jumpBuf = 0;
        sfx("jump");
      }
    } else if (this.state.mounted && this.state.equip.mount) {
      this.flyMount(ax, dt, pace);
    } else {
      this.duck = this.grounded && ax.y > 0.55 && !ax.jump;
      const speed = (this.runHeld && !this.duck ? 360 : 200) * (this.blockHeld ? 0.6 : 1) * (this.duck ? 0.45 : 1) * pace;
      const target = Math.abs(ax.x) > 0.18 ? Math.sign(ax.x) * speed : 0;
      const accel = (this.grounded ? 2400 : 1400) * pace;
      if (this.vx < target) this.vx = Math.min(target, this.vx + accel * dt);
      else if (this.vx > target) this.vx = Math.max(target, this.vx - accel * dt);
      if (Math.abs(ax.x) > 0.2) this.facing = ax.x > 0 ? 1 : -1;
      const g = (this.vy < 0 ? 1550 : 2850) * pace;
      this.vy += g * dt;
      const cap = 980 * pace;
      if (this.vy > cap) this.vy = cap;
      this.prevFeet = this.state.y;
      const fallVy = this.vy;
      this.state.x += this.vx * dt;
      this.resolveX();
      this.state.y += this.vy * dt;
      const bounced = fallVy > 18 && this.hopCd <= 0 && this.bounceOffHeads();
      const landed = bounced ? false : this.resolveY();
      if (bounced) {
        this.grounded = false;
      } else if (landed) {
        if (!this.grounded) sfx("land");
        this.grounded = true;
        this.coyote = 0.1;
        this.vy = 0;
        this.safeX = this.state.x;
        this.safeY = this.state.y;
      } else {
        this.grounded = false;
        this.coyote = Math.max(0, this.coyote - dt);
      }
      if (this.jumpBuf > 0 && (this.grounded || this.coyote > 0)) {
        this.vy = jumpVelocity(this.state) * pace;
        this.grounded = false;
        this.coyote = 0;
        this.jumpBuf = 0;
        if (ax.y > 0.5 && !this.runHeld) this.dropThrough = 0.28;
        sfx("jump");
      } else {
        this.jumpBuf = Math.max(0, this.jumpBuf - dt);
      }
      if (this.climbEdge) this.tryClimb(ax.y);
    }
    this.climbEdge = false;

    const climbNow = this.key("KeyC");
    if (climbNow && !this.prevClimb) this.climbEdge = true;
    this.prevClimb = climbNow;
    const interactNow = this.key("KeyE");
    if (interactNow && !this.prevInteract) this.interactEdge = true;
    this.prevInteract = interactNow;

    if (this.grounded && Math.abs(this.vx) > 40 && !this.duck) {
      this.footT -= dt;
      if (this.footT <= 0) {
        this.footT = this.runHeld ? 0.22 : 0.32;
        sfx("step");
      }
    }

    this.state.x = Math.max(24, Math.min(this.map.w - 24, this.state.x));
    if (this.map.id === "midgard" && !this.climbing && !this.state.mounted) {
      const floor = this.map.platforms.reduce((m, p) => Math.max(m, p.y), 0);
      if (this.state.y > floor + 90) {
        const s = this.findStand(this.state.x);
        this.state.x = s.x;
        this.state.y = s.y;
        this.vy = 0;
        this.vx = 0;
      }
    }
    this.tryPipe(ax, dt);
    this.checkBoat();
    this.tryThrow(ax, dt);
    this.updateProjs(dt);
    this.updateMobs(dt);
    this.updateBoss(dt);
    this.stepDrops(dt);
    this.touchHazards(dt);
    this.touchPits();
    this.regen(dt);
    this.checkEdges();
    this.scanInteract();
    if (this.interactEdge) {
      const left = this.useInteract();
      this.interactEdge = false;
      if (left) return;
    }
    this.interactEdge = false;
    const pot = this.key("Digit1");
    if (pot && !this.potionLock) {
      this.potionLock = true;
      this.usePotion();
    }
    if (!pot) this.potionLock = false;

    const regenPause = this.throwHeld ? 0 : 1;
    if (regenPause) {
      /* regen handled in regen() */
    }
    this.shake = Math.max(0, this.shake - dt * 2.5);
    for (const f of this.floaters) {
      f.y -= f.vy * dt;
      f.life -= dt;
    }
    this.floaters = this.floaters.filter((f) => f.life > 0);
    for (const b of this.bubbles) b.life -= dt;
    this.bubbles = this.bubbles.filter((b) => b.life > 0);
    for (const s of this.shocks) {
      s.life -= dt;
      if (s.kind === "column" && s.vx) s.x += s.vx * dt;
      if (s.kind === "column") {
        if (!s.hit) {
          const struck = Math.abs(this.state.x - s.x) < (s.wide ?? 140) && this.state.y <= s.y + 36 && this.state.y >= s.y - (s.tall ?? 800);
          if (struck) {
            s.hit = true;
            this.hurtPlayer(s.dmg, "boss");
          }
        }
        continue;
      }
      if (!s.hit && s.life < s.max * 0.72) {
        s.hit = true;
        const kind = s.kind ?? "ball";
        const t = 1 - s.life / s.max;
        let struck = false;
        if (kind === "ground" || kind === "bolt") {
          const wide = (s.wide ?? s.r) * (0.55 + t * 0.6);
          struck = Math.abs(this.state.x - s.x) < wide && Math.abs(this.state.y - s.y) < (s.tall ?? 160);
        } else struck = Math.hypot(this.state.x - s.x, this.state.y - s.y) < s.r;
        if (struck) this.hurtPlayer(s.dmg, "boss");
      }
    }
    this.shocks = this.shocks.filter((s) => s.life > 0);
    if (this.seaFire > 0) {
      this.seaFire -= dt;
      const deck = this.map.platforms[0]?.y ?? this.state.y;
      if (Math.abs(this.state.y - deck) < 90) this.hurtPlayer(Math.round(BOSSES.jormungand.proj * 0.35), "boss");
    }
  }

  tryClimb(stickY: number) {
    if (Math.abs(stickY) < 0.3) {
      this.toastMsg("Hold up or down, then climb.");
      return;
    }
    const grab = 64 / this.viewZoom();
    const near = this.map.ropes.filter((r) => {
      if (!this.ropeOpen(r)) return false;
      const nearX = Math.abs(r.x - this.state.x) < grab;
      const top = r.y - grab;
      const bot = r.y + r.h + grab * 0.4;
      return nearX && this.state.y > top && this.state.y < bot;
    });
    near.sort((a, b) => {
      const prefer = Number(Boolean(b.to)) - Number(Boolean(a.to));
      if (prefer) return prefer;
      return Math.abs(a.x - this.state.x) - Math.abs(b.x - this.state.x);
    });
    const rope = near[0];
    if (!rope) {
      this.toastMsg("No rope, chain, or vine here.");
      return;
    }
    this.climbing = rope;
    this.state.x = rope.x;
    this.vy = 0;
    this.vx = 0;
    sfx("climb");
  }

  resolveX() {
    const h = this.height();
    const left = this.state.x - 14;
    const right = this.state.x + 14;
    const top = this.state.y - h;
    const bot = this.state.y;
    for (const plat of this.map.platforms) {
      if (plat.oneWay) continue;
      if (right < plat.x || left > plat.x + plat.w || bot <= plat.y || top >= plat.y + plat.h) continue;
      if (this.vx > 0) this.state.x = plat.x - 14;
      else if (this.vx < 0) this.state.x = plat.x + plat.w + 14;
      this.vx = 0;
    }
  }

  resolveY() {
    const h = this.height();
    let landed = false;
    const left = this.state.x - 14;
    const right = this.state.x + 14;
    for (const plat of this.map.platforms) {
      if (right < plat.x || left > plat.x + plat.w) continue;
      if (this.vy < 0 && !plat.oneWay) {
        const top = this.state.y - h;
        const prevTop = this.prevFeet - h;
        if (prevTop >= plat.y + plat.h - 1 && top <= plat.y + plat.h) {
          this.state.y = plat.y + plat.h + h;
          this.vy = 0;
        }
        continue;
      }
      if (plat.oneWay && this.dropThrough > 0) continue;
      if (this.vy >= 0 && this.prevFeet <= plat.y + 6 && this.state.y >= plat.y) {
        this.state.y = plat.y;
        landed = true;
      }
    }
    return landed;
  }

  tryThrow(ax: { x: number; y: number }, _dt: number) {
    if (this.blockHeld || !this.throwHeld || this.throwCd > 0 || this.downed) return;
    const w = this.state.equip.weapon ? itemDef(this.state.equip.weapon.id) : undefined;
    if (!w?.proj || !w.power) {
      this.toastMsg("No throwing weapon equipped.");
      this.throwCd = 0.4;
      return;
    }
    const cost = w.sp ?? 4;
    if (this.state.sp < cost) {
      this.toastMsg("Not enough SP.");
      this.throwCd = 0.25;
      return;
    }
    this.state.sp -= cost;
    const aiming = Math.hypot(ax.x, ax.y) >= 0.22;
    let dx = aiming ? ax.x : this.facing;
    let dy = aiming ? ax.y : 0;
    if (w.proj === "acid" && !aiming) dy = -0.42;
    const len = Math.hypot(dx, dy) || 1;
    const pace = 1 / Math.max(0.2, this.viewZoom());
    const sp = (w.speed ?? 520) * (w.proj === "acid" ? 0.86 : 1) * pace;
    const dmg = this.rollPlayerDmg(shotDamage(this.state));
    const hand = this.figureStand();
    this.projs.push({
      id: crypto.randomUUID(),
      x: this.state.x + this.facing * hand * 0.34,
      y: this.state.y - hand * 0.58,
      vx: (dx / len) * sp,
      vy: (dy / len) * sp,
      dmg: dmg.n,
      proj: w.proj,
      from: "player",
      life: 1,
      pierce: w.proj === "boomerang",
      returning: false,
      traveled: 0,
      hit: new Set(),
      crit: dmg.crit,
    });
    this.throwCd = throwCooldown(this.state);
    this.throwAnim = 0.28;
    sfx("throw");
  }

  rollPlayerDmg(base: number) {
    const crit = Math.random() < critChance(this.state);
    const n = Math.max(1, Math.round(base * (crit ? 1.8 : 1)));
    return { n, crit };
  }

  updateProjs(dt: number) {
    const pace = 1 / Math.max(0.2, this.viewZoom());
    const view = this.screenBox();
    for (const p of this.projs) {
      const boom = p.proj === "boomerang" && p.from === "player";
      if (boom && p.returning) {
        const handY = this.state.y - this.figureStand() * 0.42;
        const dx = this.state.x - p.x;
        const dy = handY - p.y;
        const len = Math.hypot(dx, dy) || 1;
        const sp = 640 * pace;
        p.vx = (dx / len) * sp;
        p.vy = (dy / len) * sp;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        const body = this.figureStand();
        const home =
          Math.abs(p.x - this.state.x) < body * 0.2 &&
          p.y <= this.state.y + 6 &&
          p.y >= this.state.y - body * 0.7;
        if (home || len < 18) p.life = 0;
        if (p.life > 0) this.projHitFoes(p);
        continue;
      }
      if ((p.proj === "hammer" || p.proj === "thorhammer") && p.from === "boss" && p.returning) {
        const owner = this.bosses.find((b) => b.id === p.owner);
        const tx = owner ? owner.x : p.x;
        const ty = owner ? owner.y - 80 * pace : p.y;
        const dx = tx - p.x;
        const dy = ty - p.y;
        const len = Math.hypot(dx, dy) || 1;
        p.vx = (dx / len) * 560 * pace;
        p.vy = (dy / len) * 560 * pace;
        if (owner && len < 48 * pace) p.life = 0;
      }
      if (p.life <= 0) continue;
      const x0 = p.x;
      const y0 = p.y;
      if (p.proj === "pfire") {
        p.vy += 900 * pace * dt;
        if (p.vy > 520 * pace) p.vy = 520 * pace;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.vy > 0) {
          for (const plat of this.map.platforms) {
            if (p.x < plat.x || p.x > plat.x + plat.w) continue;
            if (y0 <= plat.y && p.y >= plat.y) {
              p.y = plat.y - 8 * pace;
              p.vy = -380 * pace;
              break;
            }
          }
        }
      } else if (p.proj === "acid") {
        p.vy += 480 * pace * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (this.projHitGround(x0, y0, p)) {
          p.life = 0;
          this.puddles.push({ x: p.x, y: this.floorUnder(p.x, p.y), life: 30, dmg: Math.max(8, p.dmg * 0.45), tick: 0 });
        }
      } else {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        const bossThrow = (p.proj === "hammer" || p.proj === "thorhammer" || p.proj === "terrorhammer") && p.from === "boss";
        const ranged = p.proj !== "boomerang";
        if (ranged && !bossThrow && this.projHitGround(x0, y0, p)) p.life = 0;
      }
      p.traveled += Math.hypot(p.x - x0, p.y - y0);
      if (p.life <= 0) continue;
      if (boom && !p.returning && this.pastScreen(p, view)) {
        p.returning = true;
        p.hit.clear();
        const handY = this.state.y - this.figureStand() * 0.42;
        const dx = this.state.x - p.x;
        const dy = handY - p.y;
        const len = Math.hypot(dx, dy) || 1;
        const sp = 640 * pace;
        p.vx = (dx / len) * sp;
        p.vy = (dy / len) * sp;
      }
      const bossThrow = (p.proj === "hammer" || p.proj === "thorhammer") && p.from === "boss";
      if (bossThrow && !p.returning && !this.projOnScreen(p, 16)) {
        p.returning = true;
        p.hit.clear();
      }
      if (p.from === "player") this.projHitFoes(p);
      else this.projHitPlayer(p);
      const comingBack = (p.proj === "boomerang" && p.returning) || ((p.proj === "hammer" || p.proj === "thorhammer") && p.returning);
      if (!boom && !comingBack && p.life > 0 && !this.projOnScreen(p, 28)) p.life = 0;
    }
    this.projs = this.projs.filter((p) => p.life > 0);
  }

  shotPace() {
    return 1 / Math.max(0.2, this.viewZoom());
  }

  screenBox() {
    const z = Math.max(0.08, this.viewZoom());
    return {
      left: this.camX,
      right: this.camX + this.cssW / z,
      top: this.camY,
      bottom: this.camY + this.cssH / z,
    };
  }

  pastScreen(p: Proj, view: { left: number; right: number; top: number; bottom: number }) {
    return p.x <= view.left || p.x >= view.right || p.y <= view.top || p.y >= view.bottom;
  }

  projOnScreen(p: Proj, margin: number) {
    const z = Math.max(0.2, this.viewZoom());
    const pad = margin / z;
    const viewW = this.cssW / z;
    const viewH = this.cssH / z;
    const left = this.camX;
    const top = this.camY;
    return p.x >= left - pad && p.x <= left + viewW + pad && p.y >= top - pad && p.y <= top + viewH + pad;
  }

  projHitGround(x0: number, y0: number, p: Proj) {
    for (const plat of this.map.platforms) {
      const minX = Math.min(x0, p.x);
      const maxX = Math.max(x0, p.x);
      if (maxX < plat.x || minX > plat.x + plat.w) continue;
      if (p.x < plat.x || p.x > plat.x + plat.w) continue;
      if (y0 <= plat.y + 4 && p.y >= plat.y - 2) return true;
    }
    return false;
  }

  projHitFoes(p: Proj) {
    const z = Math.max(0.2, this.viewZoom());
    const tryHit = (id: string, x: number, y: number, w: number, h: number, apply: (dmg: number) => void) => {
      const tag = p.proj === "hammer" && p.returning ? `back:${id}` : id;
      if (p.hit.has(tag)) return false;
      if (!this.overlapPoint(p.x, p.y, x, y, w, h)) return false;
      p.hit.add(tag);
      apply(p.dmg);
      sfx("hit");
      if (p.proj === "hammer") {
        if (!p.returning) {
          p.returning = true;
          p.life = 1;
        } else p.life = 0;
      } else if (!p.pierce) p.life = 0;
      return true;
    };
    for (const m of this.mobs) {
      if (m.dead > 0) continue;
      const def = MONSTERS[m.kind];
      tryHit(m.id, m.x, m.y, def.w / z, def.h / z, (dmg) => this.hurtMob(m, dmg, !!p.crit));
      if (p.life <= 0) return;
    }
    for (const actor of this.bosses) {
      if (actor.fallen) continue;
      const b = BOSSES[actor.id];
      tryHit(actor.id, actor.x, actor.y, b.w / z, b.h / z, (dmg) => this.hurtBoss(actor, dmg, !!p.crit, "proj"));
      if (p.life <= 0) return;
    }
    if (this.state.stance === "lethal") {
      const body = this.figureStand();
      for (const peer of this.peers) {
        tryHit(peer.id, peer.x, peer.y, body * 0.42, body, (dmg) => this.hooks.onPvp(peer.id, dmg));
      }
    }
  }

  projHitPlayer(p: Proj) {
    const body = this.figureStand();
    if (p.proj === "arrow" || p.proj === "spear") {
      const near = Math.hypot(p.x - this.state.x, p.y - (this.state.y - body * 0.45)) < body * 0.62;
      if (!near) return;
    } else if (p.proj === "terrorhammer") {
      const z = Math.max(0.2, this.viewZoom());
      const rad = 30 / z;
      const near = Math.hypot(p.x - this.state.x, p.y - (this.state.y - body * 0.45)) < rad + body * 0.38;
      if (!near) return;
    } else if (!this.overlapPoint(p.x, p.y, this.state.x, this.state.y, body * 0.42, body * (this.duck ? 0.62 : 1))) return;
    const inFront = (p.x - this.state.x) * this.facing > -body * 0.1;
    if (this.blockHeld && inFront) {
      sfx("block");
      this.float(this.state.x, this.state.y - body * 0.7, "BLOCK", "#e4b15a");
      p.life = 0;
      return;
    }
    this.hurtPlayer(p.dmg, "monster");
    p.life = 0;
  }

  overlapPoint(px: number, py: number, x: number, y: number, w: number, h: number) {
    return px > x - w / 2 && px < x + w / 2 && py > y - h && py < y;
  }

  updateMobs(dt: number) {
    for (const m of this.mobs) {
      const def = MONSTERS[m.kind];
      m.anim += dt * 8;
      if (m.dead > 0) {
        m.dead -= dt;
        m.vx = 0;
        m.vy = 0;
        if (m.dead <= 0) this.respawnMob(m);
        continue;
      }
      m.prevY = m.y;
      const live = !this.downed;
      if (m.ai === "roll") {
        const ground = m.home ?? this.map.platforms.find((p) => !p.oneWay);
        const dir = live ? Math.sign(this.state.x - m.x) || m.facing || 1 : m.facing || 1;
        m.facing = dir;
        const speed = def.speed * (1 / this.viewZoom()) * 0.42;
        const next = m.x + dir * speed * dt;
        if (ground && (next < ground.x + 30 || next > ground.x + ground.w - 30)) m.facing *= -1;
        else m.x = next;
        if (ground) m.y = ground.y;
        m.spin += dir * dt * 8;
      } else if (m.ai === "slide" && m.home) {
        const near = live && Math.abs(this.state.y - m.home.y) < 48 && Math.abs(this.state.x - m.x) < 380;
        const dir = near ? Math.sign(this.state.x - m.x) || m.facing : m.facing;
        m.facing = dir || 1;
        m.vx = m.facing * def.speed;
        const next = m.x + m.vx * dt;
        if (next < m.home.x + 20 || next > m.home.x + m.home.w - 20) m.facing *= -1;
        m.x += m.facing * def.speed * dt;
        m.y = m.home.y;
      } else if (m.ai === "jump") {
        const yeti = def.sprite === "yeti" || def.sprite === "gnome";
        const wolf = def.sprite === "wolf";
        const pace = 1 / this.viewZoom();
        m.wait -= dt;
        if (yeti || wolf) {
          const g = (m.vy < 0 ? 1550 : 2850) * pace;
          m.vy += g * dt;
          const cap = 980 * pace;
          if (m.vy > cap) m.vy = cap;
          if (m.vy !== 0) {
            const nestX = m.home ? m.home.x + m.home.w / 2 : m.x;
            const aggro = live && Math.abs(this.state.x - m.x) < (wolf ? 380 : 520) && Math.abs(this.state.y - m.y) < 380;
            const goal = aggro ? this.state.x : nestX;
            const want = Math.abs(goal - m.x) < (wolf ? 80 : 42) ? 0 : Math.sign(goal - m.x) || m.facing;
            const targetVx = want * (wolf ? 360 : 210) * pace;
            const accel = 1400 * pace;
            if (m.vx < targetVx) m.vx = Math.min(targetVx, m.vx + accel * dt);
            else if (m.vx > targetVx) m.vx = Math.max(targetVx, m.vx - accel * dt);
            if (want) m.facing = want;
          }
        } else {
          m.vy += 2400 * dt;
          if (m.vy > 820) m.vy = 820;
        }
        m.x += m.vx * dt;
        m.y += m.vy * dt;
        const on = this.mobOnGround(m);
        if (on && m.vy >= 0) {
          m.y = on.y;
          m.vy = 0;
          const nest = m.home ? m.home.x + m.home.w / 2 : m.x;
          const chase = live && Math.abs(this.state.x - m.x) < (wolf ? 380 : 520) && Math.abs(this.state.y - m.y) < (wolf ? 320 : 420);
          m.facing = Math.sign((chase ? this.state.x : nest) - m.x) || m.facing;
          if ((yeti || wolf) && m.wait > 0) m.vx = 0;
          if (m.wait <= 0) {
            if (yeti || wolf) {
              const dx = (chase ? this.state.x : nest) - m.x;
              const dir = Math.abs(dx) < (wolf ? 24 : 48) ? Math.sign(dx) || m.facing || 1 : Math.sign(dx) || m.facing || 1;
              m.facing = dir || m.facing || 1;
              m.vx = dir * (wolf ? 380 : 200) * pace;
              m.vy = jumpVelocity(this.state) * pace * (wolf ? 0.62 : 1);
              m.wait = wolf ? 0.42 + Math.random() * 0.22 : 0.28 + Math.random() * 0.22;
            } else {
              const toward = m.facing || 1;
              const leap = chase && Math.abs(this.state.x - m.x) < 640;
              m.vx = toward * (leap ? 180 + def.speed : 90);
              m.vy = chase && this.state.y < m.y - 30 ? -820 : -640;
              m.wait = 0.9 + Math.random() * 0.45;
            }
          }
        }
        m.x = Math.max(20, Math.min(this.map.w - 20, m.x));
      } else if (m.ai === "hover") {
        const chase = live && Math.hypot(this.state.x - m.x, (this.state.y - this.figureStand() * 0.45) - m.y) < 980;
        const wanderX = this.map.w * (0.12 + 0.76 * (0.5 + 0.5 * Math.sin(m.anim * 0.17 + m.spin)));
        const wanderY = this.map.h * (0.28 + 0.34 * Math.sin(m.anim * 0.11 + 1.2));
        const tx = chase ? this.state.x : wanderX;
        const ty = chase ? this.state.y - this.figureStand() * 0.35 : wanderY;
        let dx = tx - m.x;
        let dy = ty - m.y;
        for (const other of this.mobs) {
          if (other === m || other.dead > 0 || other.kind !== m.kind) continue;
          const ox = m.x - other.x;
          const oy = m.y - other.y;
          const od = Math.hypot(ox, oy) || 1;
          if (od < 70) {
            dx += (ox / od) * 90;
            dy += (oy / od) * 90;
          }
        }
        const len = Math.hypot(dx, dy) || 1;
        const speed = def.speed * (1 / this.viewZoom()) * 0.36;
        m.vx = (dx / len) * speed;
        m.vy = (dy / len) * speed;
        m.x += m.vx * dt;
        m.y += m.vy * dt;
        m.facing = m.vx >= 0 ? 1 : -1;
      } else {
        const nest = m.home ? m.home.x + m.home.w / 2 : m.x;
        const nestY = (m.home?.y ?? m.y) - 180;
        const chase = live && Math.hypot(this.state.x - m.x, this.state.y - m.y) < 760;
        const tx = chase ? this.state.x : nest + Math.sin(m.anim * 0.2) * 160;
        const ty = chase ? this.state.y - this.figureStand() * 0.3 : nestY + Math.cos(m.anim * 0.16) * 80;
        let dx = tx - m.x;
        let dy = ty - m.y;
        for (const other of this.mobs) {
          if (other === m || other.dead > 0 || other.ai !== "fly") continue;
          const ox = m.x - other.x;
          const oy = m.y - other.y;
          const od = Math.hypot(ox, oy) || 1;
          if (od < 64) {
            dx += (ox / od) * 80;
            dy += (oy / od) * 80;
          }
        }
        const dist = Math.hypot(dx, dy) || 1;
        const speed = def.speed * 1.12 * Math.min(1.15, 0.45 + dist / 220);
        m.vx = (dx / dist) * speed;
        m.vy = (dy / dist) * speed;
        m.x += m.vx * dt;
        m.y += m.vy * dt;
        if (m.vx > 8) m.facing = 1;
        else if (m.vx < -8) m.facing = -1;
      }
      this.touchPlayer(m.x, m.y, def.w, def.h, m.touch, m);
    }
  }

  mobOnGround(m: Mob): Platform | null {
    if (m.vy < 0) return null;
    for (const plat of this.map.platforms) {
      if (m.x < plat.x + 6 || m.x > plat.x + plat.w - 6) continue;
      if (m.prevY <= plat.y + 8 && m.y >= plat.y - 2) return plat;
    }
    return null;
  }

  respawnMob(m: Mob) {
    const power = scaledMonster(m.kind, this.map.diff ?? 0);
    m.max = power.hp;
    m.touch = power.touch;
    m.hp = m.max;
    m.dead = 0;
    if (m.home) {
      m.x = m.home.x + m.home.w / 2;
      m.y = m.home.y;
    }
  }

  flyHela(b: BossActor, def: (typeof BOSSES)[BossId], dt: number, dx: number) {
    const pace = 1 / this.viewZoom();
    b.grounded = false;
    if (this.downed) {
      const tx = this.map.w * 0.72;
      const ty = this.map.h * 0.42;
      const hx = tx - b.x;
      const hy = ty - b.y;
      const len = Math.hypot(hx, hy) || 1;
      const speed = 140 * pace;
      b.vx = (hx / len) * speed;
      b.vy = (hy / len) * speed;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.state = "wait";
      b.x = Math.max(80, Math.min(this.map.w - 80, b.x));
      b.y = Math.max(140, Math.min(this.map.h - 80, b.y));
      return;
    }
    if (b.state === "wait" && b.timer <= 0) {
      if (b.id === "ultrahela" && b.hp > 0 && b.hp <= 500_000_000) {
        const before = b.hp;
        b.hp = Math.min(b.max, b.hp + 10_000_000);
        if (b.hp !== before) {
          this.writeUltra(b.hp, 0);
          this.float(b.x, b.y - 90, "10000000", "#8dff9a");
        }
      }
      const close = Math.hypot(dx, this.state.y - b.y) < 160;
      if (close || Math.random() < 0.5) {
        b.state = "charge";
        b.timer = 0.62;
        b.didHit = false;
        const ty = this.state.y - 16 - b.y;
        const len = Math.hypot(dx, ty) || 1;
        const speed = 480 * pace;
        b.vx = (dx / len) * speed;
        b.vy = (ty / len) * speed;
      } else {
        b.state = "swing";
        b.timer = 0.7;
        b.didHit = false;
        b.vx *= 0.25;
        b.vy *= 0.25;
      }
    }
    if (b.state === "charge") {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (!b.didHit && Math.hypot(this.state.x - b.x, this.state.y - b.y) < 100) {
        b.didHit = true;
        if (this.blockHeld && (b.x - this.state.x) * this.facing < 0) {
          sfx("block");
          this.float(this.state.x, this.state.y - 70, "BLOCK", "#e4b15a");
        } else this.hurtPlayer(def.melee, "boss");
      }
      if (b.timer <= 0) {
        b.state = "wait";
        b.timer = 0.4;
      }
    } else if (b.state === "swing") {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (!b.didHit && b.timer <= 0.34) {
        b.didHit = true;
        const pace = this.shotPace();
        const body = def.h * pace;
        const sx = b.x + b.facing * body * 0.32;
        const sy = b.y - body * 0.55;
        const tx = this.state.x - sx;
        const ty = this.state.y - this.figureStand() * 0.45 - sy;
        const len = Math.hypot(tx, ty) || 1;
        this.projs.push({
          id: crypto.randomUUID(),
          x: sx,
          y: sy,
          vx: (tx / len) * 460 * pace,
          vy: (ty / len) * 460 * pace,
          dmg: def.proj,
          proj: def.shot,
          from: "boss",
          life: 2.4,
          pierce: false,
          returning: false,
          traveled: 0,
          hit: new Set(),
          owner: b.id,
        });
        sfx("throw");
      }
      if (b.timer <= 0) {
        b.state = "wait";
        b.timer = 0.45;
      }
    } else {
      const tx = this.state.x + Math.sin(b.anim * 0.7) * 240;
      const ty = this.state.y - 150 + Math.cos(b.anim * 0.55) * 90;
      const hx = tx - b.x;
      const hy = ty - b.y;
      const len = Math.hypot(hx, hy) || 1;
      const speed = 190 * pace;
      b.vx = (hx / len) * speed;
      b.vy = (hy / len) * speed;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
    }
    b.x = Math.max(80, Math.min(this.map.w - 80, b.x));
    b.y = Math.max(140, Math.min(this.map.h - 80, b.y));
    this.tryStompBoss(b);
    this.bossTouch(b);
  }

  fallBoss(b: BossActor, dt: number) {
    b.vy += 2200 * dt;
    if (b.vy > 900) b.vy = 900;
    const prev = b.y;
    b.y += b.vy * dt;
    for (const plat of this.map.platforms) {
      if (b.x < plat.x || b.x > plat.x + plat.w) continue;
      if (prev <= plat.y && b.y >= plat.y && b.vy > 0) {
        b.y = plat.y;
        b.vy = 0;
        b.grounded = true;
      }
    }
  }

  fireGod(b: BossActor, def: (typeof BOSSES)[BossId]) {
    const pace = this.shotPace();
    const body = def.h * pace;
    const sx = b.x + b.facing * body * (b.id === "skadi" ? 0.38 : 0.28);
    const sy = b.y - body * (b.id === "skadi" ? 0.62 : 0.55);
    const tx = this.state.x - sx;
    const ty = this.state.y - this.figureStand() * 0.45 - sy;
    const len = Math.hypot(tx, ty) || 1;
    const proj = b.id === "thor2" ? "thorhammer" : def.shot;
    const speed = (def.shot === "hammer" ? 540 : def.shot === "tornado" ? 360 : 500) * pace;
    this.projs.push({
      id: crypto.randomUUID(),
      x: sx,
      y: sy,
      vx: (tx / len) * speed,
      vy: (ty / len) * speed,
      dmg: def.proj,
      proj,
      from: "boss",
      life: def.shot === "hammer" ? 2.4 : 2.1,
      pierce: false,
      returning: false,
      traveled: 0,
      hit: new Set(),
      owner: b.id,
    });
    sfx("throw");
  }

  fireSkadi(b: BossActor, def: (typeof BOSSES)[BossId]) {
    const pace = this.shotPace();
    const h = def.h / Math.max(0.2, this.viewZoom());
    const tip = b.facing < 0 ? { dx: -0.268, dy: 0.511 } : { dx: 0.306, dy: 0.563 };
    const sx = b.x + tip.dx * h;
    const sy = b.y - tip.dy * h;
    const tx = this.state.x - sx;
    const ty = this.state.y - this.figureStand() * 0.45 - sy;
    const len = Math.hypot(tx, ty) || 1;
    this.projs.push({
      id: crypto.randomUUID(),
      x: sx,
      y: sy,
      vx: (tx / len) * 500 * pace,
      vy: (ty / len) * 500 * pace,
      dmg: def.proj,
      proj: def.shot,
      from: "boss",
      life: 2.1,
      pierce: false,
      returning: false,
      traveled: 0,
      hit: new Set(),
      owner: b.id,
    });
    sfx("throw");
  }

  fireOdinBlast(b: BossActor) {
    const pace = this.shotPace();
    const sx = b.x + b.facing * 70 * pace;
    const sy = b.y - 90 * pace;
    this.projs.push({
      id: crypto.randomUUID(),
      x: sx,
      y: sy,
      vx: b.facing * 640 * pace,
      vy: 0,
      dmg: BOSSES.odin.proj,
      proj: "odinblast",
      from: "boss",
      life: 1.6,
      pierce: true,
      returning: false,
      traveled: 0,
      hit: new Set(),
      owner: b.id,
    });
    sfx("throw");
  }

  updateGod(b: BossActor, dt: number, dx: number) {
    const def = BOSSES[b.id];
    const pace = 1 / this.viewZoom();
    const skadi = b.id === "skadi";
    if (b.state === "wait" && b.timer <= 0) {
      if (this.downed) b.timer = 0.8;
      else if (skadi) {
        const reach = this.figureStand() * 1.7;
        const far = Math.abs(dx) > reach;
        const roll = Math.random();
        if (!far && roll < 0.62) {
          b.state = "swing";
          b.timer = 0.84;
          b.didHit = false;
        } else if (roll < 0.82) {
          b.state = "shoot";
          b.timer = 0.84;
          b.didHit = false;
        } else if (!far) {
          b.state = "jump";
          b.timer = 0.2;
          b.didHit = false;
          b.grounded = false;
          b.vy = jumpVelocity(this.state) * pace * 0.55;
          b.vx = Math.max(-460 * pace, Math.min(460 * pace, dx * 1.15));
        } else b.timer = 0.12;
      } else {
        const close = Math.abs(dx) < 130 && Math.abs(this.state.y - b.y) < 90;
        const roll = Math.random();
        if (close && roll < 0.4) {
          b.state = "swing";
          b.timer = b.id === "odin" ? 0.72 : 0.55;
          b.didHit = false;
        } else if (roll < 0.58) {
          b.state = "jump";
          b.timer = 0.2;
          b.didHit = false;
          b.grounded = false;
          b.vy = jumpVelocity(this.state) * pace * 0.9;
          if (b.id === "odin") b.vy = -1400 * pace;
          b.vx = Math.max(-460 * pace, Math.min(460 * pace, dx * 1.15));
        } else {
          b.state = "shoot";
          b.timer = b.id === "odin" ? 0.64 : 0.42;
          if (b.id === "odin" && Math.random() < 0.5) this.fireOdinBlast(b);
          else this.fireGod(b, def);
        }
      }
    }
    if (skadi && b.state === "shoot" && !b.didHit && b.timer < 0.42) {
      b.didHit = true;
      this.fireSkadi(b, def);
    }
    if (skadi && b.state === "swing" && !b.didHit && b.timer < 0.5) {
      b.didHit = true;
      const reach = this.figureStand() * 2.5;
      this.shocks.push({
        x: b.x + b.facing * reach * 0.42,
        y: b.y - 10,
        r: reach,
        life: 0.32,
        max: 0.32,
        color: "#ffe14a",
        dmg: def.melee,
        hit: false,
        kind: "bolt",
        wide: reach,
        tall: 170,
      });
    }
    if (b.state === "swing" && !skadi && !b.didHit && b.timer < 0.32) {
      const reach = b.id === "odin" ? 280 : skadi ? this.figureStand() * 2.3 : 140;
      if (Math.abs(this.state.x - b.x) < reach && Math.abs(this.state.y - b.y) < (skadi ? 180 : 80) && (this.state.x - b.x) * b.facing > -16) {
        b.didHit = true;
        if (this.blockHeld && (b.x - this.state.x) * this.facing < 0) {
          sfx("block");
          this.float(this.state.x, this.state.y - 70, "BLOCK", "#e4b15a");
        } else this.hurtPlayer(def.melee, "boss");
      }
    }
    if ((b.state === "swing" || b.state === "shoot") && b.timer <= 0) {
      b.state = "wait";
      b.timer = skadi ? 0.22 : 0.36;
    }
    if (!b.grounded || b.state === "jump") {
      b.vy += 2500 * pace * dt;
      if (b.id === "odin" && b.vy < 0) {
        const floor = this.map.platforms.find((plat) => !plat.oneWay)?.y ?? this.map.h * 0.9;
        if (b.y < floor - WORLD_H * 0.5) b.vy = 80 * pace;
      }
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.vy > 0) {
        for (const plat of this.map.platforms) {
          if (b.x < plat.x || b.x > plat.x + plat.w) continue;
          if (b.prevY <= plat.y && b.y >= plat.y) {
            b.y = plat.y;
            b.vy = 0;
            b.vx = 0;
            b.grounded = true;
            b.state = "wait";
            b.timer = 0.3;
          }
        }
      }
    }
    if (skadi && b.grounded && !this.downed && (b.state === "wait" || b.state === "swing")) {
      const want = this.figureStand() * 1.45;
      if (Math.abs(dx) > want) {
        const dir = Math.sign(dx) || b.facing;
        const next = b.x + dir * 280 * pace * dt;
        const plat = this.map.platforms.find((p) => b.y >= p.y - 8 && b.y <= p.y + 12 && next >= p.x + 30 && next <= p.x + p.w - 30);
        if (plat) b.x = next;
      }
    }
    this.bossStompPlayer(b, def.touch + (skadi ? 36 : 14));
    this.tryStompBoss(b);
    this.bossTouch(b);
  }

  updateBoss(dt: number) {
    for (const actor of [...this.bosses]) this.updateBossActor(actor, dt);
  }

  updateBossActor(b: BossActor, dt: number) {
    if (b.asleep) return;
    if (b.id === "fenrir") {
      this.updateFenrir(b, dt);
      return;
    }
    if (b.id === "jormungand") {
      this.updateSerpent(b, dt);
      return;
    }
    if (b.id === "mimir") {
      this.updateMimir(b, dt);
      return;
    }
    if (b.fallen) {
      this.fallBoss(b, dt);
      return;
    }
    const def = BOSSES[b.id];
    b.anim += dt * (b.state === "swing" && b.id !== "surtur" && b.id !== "baphomet" ? 14 : 6);
    b.timer -= dt;
    b.prevY = b.y;
    const dx = this.state.x - b.x;
    if (!this.downed && Math.abs(dx) > 22) b.facing = dx >= 0 ? 1 : -1;
    if (FLYERS.has(b.id)) {
      this.flyHela(b, def, dt, dx);
      return;
    }
    if (b.id === "odin" || GODS.has(b.id)) {
      this.updateGod(b, dt, dx);
      return;
    }
    if (this.downed && b.state === "wait") {
      b.timer = 0.8;
      b.vx = 0;
    } else if (b.state === "wait" && b.timer <= 0) {
      const roll = Math.random();
      const dwarf = b.id === "brokk" || b.id === "terror";
      const laufey = b.id === "thrym";
      const grove = b.id === "grove";
      if (laufey) {
        const close = Math.abs(dx) < 170 && Math.abs(this.state.y - b.y) < 110;
        if (!close && roll < 0.38) {
          b.state = "jump";
          b.timer = 0.2;
          b.didHit = false;
          const z = Math.max(0.22, this.viewZoom());
          b.vy = -Math.sqrt(420000 / z);
          b.vx = Math.sign(dx || b.facing) * (150 / z);
          b.grounded = false;
        } else {
          b.state = "swing";
          b.timer = 0.8;
          b.didHit = false;
        }
      } else if (grove) {
        const close = Math.abs(dx) < 110 && Math.abs(this.state.y - b.y) < 80;
        if (close) {
          b.state = "swing";
          b.timer = 0.55;
          b.didHit = false;
        } else if (roll < 0.55) {
          b.state = "jump";
          b.timer = 0.25;
          b.didHit = false;
          b.vy = -1500;
          b.vx = Math.max(-460, Math.min(460, dx * 1.4));
          b.grounded = false;
        } else {
          b.state = "shoot";
          b.timer = 0.35;
          b.didHit = false;
          const pace = this.shotPace();
          const sy = b.y - 70 * pace;
          const sx = b.x + b.facing * 36 * pace;
          const tx = this.state.x - sx;
          const ty = this.state.y - this.figureStand() * 0.45 - sy;
          const len = Math.hypot(tx, ty) || 1;
          this.projs.push({
            id: crypto.randomUUID(),
            x: sx,
            y: sy,
            vx: (tx / len) * 520 * pace,
            vy: (ty / len) * 520 * pace,
            dmg: def.proj,
            proj: "crescent",
            from: "boss",
            life: 2.2,
            pierce: false,
            returning: false,
            traveled: 0,
            hit: new Set(),
          });
          sfx("throw");
        }
      } else if ((b.id === "baphomet" ? roll < 0.58 : roll < 0.4)) b.state = "jump";
      else if (dwarf ? roll < 0.72 : roll < ((b.id === "surtur" || b.id === "baphomet") ? 0.52 : 0.65)) b.state = "swing";
      else if (dwarf ? true : roll < 0.85) b.state = "shoot";
      else b.state = "charge";
      if (!laufey && !grove) {
        const heavy = b.id === "surtur" || b.id === "baphomet";
        b.timer = b.state === "swing" ? (heavy ? 1.75 : b.id === "terror" ? 0.9 : 0.55) : b.state === "charge" ? 0.48 : b.id === "terror" ? 0.75 : 0.2;
        b.didHit = false;
        if (b.state === "jump") {
          const surtur = b.id === "surtur";
          const goat = b.id === "baphomet";
          b.vy = surtur ? -1120 : goat ? -1680 : b.id === "terror" ? -880 : -780;
          b.vx = Math.sign(dx || b.facing) * (surtur ? 210 : goat ? 260 : 160);
          b.grounded = false;
        }
        if (b.state === "shoot") {
          const z = Math.max(0.2, this.viewZoom());
          const bodyH = def.h / z;
          const bodyW = (def.w / def.h) * bodyH;
          const mitt = b.id === "catcher";
          const sx = b.x + b.facing * bodyW * (mitt ? 0.42 : 0.32);
          const sy = b.y - bodyH * (mitt ? 0.74 : 0.58);
          const pace = this.shotPace();
          const tx = this.state.x - sx;
          const ty = this.state.y - this.figureStand() * 0.45 - sy;
          const len = Math.hypot(tx, ty) || 1;
          if (b.id === "brokk") {
            const rocks = 1 + Math.floor(Math.random() * 3);
            for (let i = 0; i < rocks; i++) {
              const spread = (i - (rocks - 1) / 2) * 0.18;
              this.projs.push({
                id: crypto.randomUUID(),
                x: sx,
                y: sy,
                vx: (tx / len) * 420 * pace,
                vy: (ty / len) * 420 * pace + spread * 80,
                dmg: def.proj,
                proj: "rock",
                from: "boss",
                life: 2.2,
                pierce: false,
                returning: false,
                traveled: 0,
                hit: new Set(),
                owner: b.id,
              });
            }
            sfx("throw");
          } else if (b.id !== "terror") {
            this.projs.push({
              id: crypto.randomUUID(),
              x: sx,
              y: sy,
              vx: (tx / len) * 380 * pace,
              vy: (ty / len) * 380 * pace,
              dmg: def.proj,
              proj: def.shot,
              from: "boss",
              life: 2.2,
              pierce: false,
              returning: false,
              traveled: 0,
              hit: new Set(),
              owner: b.id,
            });
            sfx("throw");
          }
        }
        if (b.state === "charge") b.vx = b.facing * 560;
      }
    }
    if (b.state === "charge") {
      b.x += b.vx * dt;
      if (b.timer <= 0) {
        b.state = "wait";
        b.timer = 0.45;
        b.vx = 0;
      }
    }
    if (b.id === "brokk" && b.state === "flame") {
      b.flameAcc = (b.flameAcc ?? 0) + dt;
      if (b.flameAcc >= 0.08) {
        b.flameAcc = 0;
        const z = Math.max(0.2, this.viewZoom());
        const bodyH = def.h / z;
        const sx = b.x + b.facing * bodyH * 0.42;
        const sy = b.y - bodyH * 0.58;
        const spread = (Math.random() - 0.5) * 0.55;
        const ang = (b.facing > 0 ? 0 : Math.PI) + spread;
        const pace = this.shotPace();
        this.projs.push({
          id: crypto.randomUUID(),
          x: sx,
          y: sy,
          vx: Math.cos(ang) * 340 * pace,
          vy: Math.sin(ang) * 90 * pace,
          dmg: Math.round(def.proj * 0.45),
          proj: "flame",
          from: "boss",
          life: 0.48,
          pierce: true,
          returning: false,
          traveled: 0,
          hit: new Set(),
          owner: b.id,
        });
      }
      if (b.timer <= 0) {
        b.state = "wait";
        b.timer = 0.8;
      }
    } else if (!b.grounded || b.state === "jump") {
      b.vy += 2400 * dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.vy > 0) {
        for (const plat of this.map.platforms) {
          if (b.x < plat.x || b.x > plat.x + plat.w) continue;
          if (b.prevY <= plat.y && b.y >= plat.y) {
            b.y = plat.y;
            b.vy = 0;
            b.vx = 0;
            b.grounded = true;
            b.state = "wait";
            b.timer = 0.35;
          }
        }
      }
    }
    if (b.id === "thrym" && b.state === "swing" && !b.didHit && b.timer <= 0.4) {
      b.didHit = true;
      const reach = 190;
      const inMelee =
        Math.abs(this.state.x - b.x) < reach &&
        Math.abs(this.state.y - b.y) < 90 &&
        (this.state.x - b.x) * b.facing > -24;
      if (inMelee) {
        if (this.blockHeld && (b.x - this.state.x) * this.facing < 0) {
          sfx("block");
          this.float(this.state.x, this.state.y - 70, "BLOCK", "#e4b15a");
        } else this.hurtPlayer(def.melee, "boss");
      } else {
        const pace = this.shotPace();
        const sx = b.x + b.facing * 78 * pace;
        const sy = b.y - 86 * pace;
        const tx = this.state.x - sx;
        const ty = this.state.y - this.figureStand() * 0.45 - sy;
        const len = Math.hypot(tx, ty) || 1;
        this.projs.push({
          id: crypto.randomUUID(),
          x: sx,
          y: sy,
          vx: (tx / len) * 620 * pace,
          vy: (ty / len) * 620 * pace,
          dmg: def.proj,
          proj: "icicle",
          from: "boss",
          life: 2.2,
          pierce: false,
          returning: false,
          traveled: 0,
          hit: new Set(),
        });
        sfx("throw");
      }
    }
    if (b.id === "terror" && b.state === "shoot" && !b.didHit && b.timer < 0.55) {
      b.didHit = true;
      const pace = this.shotPace();
      const z = Math.max(0.2, this.viewZoom());
      const bodyH = def.h / z;
      for (const hand of [-1, 1]) {
        const sx = b.x + b.facing * bodyH * 0.22;
        const sy = b.y - bodyH * (0.58 + hand * 0.06);
        const tx = this.state.x - sx;
        const ty = this.state.y - this.figureStand() * 0.45 - sy;
        const ang = Math.atan2(ty, tx);
        this.projs.push({
          id: crypto.randomUUID(),
          x: sx,
          y: sy,
          vx: Math.cos(ang) * 460 * pace,
          vy: Math.sin(ang) * 460 * pace,
          dmg: def.proj,
          proj: "terrorhammer",
          from: "boss",
          life: 2.6,
          pierce: false,
          returning: false,
          traveled: 0,
          hit: new Set(),
          owner: b.id,
        });
      }
      sfx("throw");
    }
    if (b.id === "terror" && b.state === "swing" && !b.didHit && b.timer < 0.45) {
      b.didHit = true;
      const wide = this.figureStand() * 6.2;
      this.shocks.push({ x: b.x, y: b.y, r: wide, life: 0.4, max: 0.4, color: "#b06bff", dmg: def.melee, hit: false, kind: "ground", wide, tall: 180 });
    }
    if (b.id !== "thrym" && b.state === "swing" && !b.didHit && b.timer < ((b.id === "surtur" || b.id === "baphomet") ? 0.48 : 0.35)) {
      const reach = b.id === "terror" ? def.w * 1.35 : b.id === "brokk" ? def.w * 1.15 : b.id === "grove" || b.id === "freyja2" ? 130 : def.w * 0.8;
      if (Math.abs(this.state.x - b.x) < reach && Math.abs(this.state.y - b.y) < (b.id === "grove" ? 70 : 40) && (this.state.x - b.x) * b.facing > -10) {
        b.didHit = true;
        if (this.blockHeld && (b.x - this.state.x) * this.facing < 0) {
          sfx("block");
          this.float(this.state.x, this.state.y - 70, "BLOCK", "#e4b15a");
        } else this.hurtPlayer(def.melee, "boss");
      }
    }
    if ((b.state === "swing" || b.state === "shoot") && b.timer <= 0) {
      const heavySwing = (b.id === "surtur" || b.id === "baphomet") && b.state === "swing";
      b.state = "wait";
      b.timer = heavySwing ? 1.45 : 0.4;
    }
    if (b.id === "grove" && b.grounded && b.state === "wait" && !this.downed) {
      const dir = Math.sign(dx) || b.facing;
      const next = b.x + dir * 180 * dt;
      const plat = this.map.platforms.find((p) => b.y >= p.y - 6 && b.y <= p.y + 10 && b.x >= p.x && b.x <= p.x + p.w);
      if (!plat || (next > plat.x + 36 && next < plat.x + plat.w - 36)) b.x = next;
    }
    this.bossStompPlayer(b, def.touch + 14);
    this.tryStompBoss(b);
    this.bossTouch(b);
    if (b.y > this.map.h + 40) {
      b.y = this.findStand(b.x).y;
      b.grounded = true;
      b.vy = 0;
    }
  }

  /** First landing is a full 3-body hop. Agility adds extra, lower, faster hops. Returns true if this hop should deal damage. */
  headBounce() {
    const agi = statsOf(this.state).agi;
    const max = 1 + Math.floor(agi / 5);
    const first = this.stompChain <= 0;
    const deal = first || this.stompChain < max;
    const pace = 1 / Math.max(0.2, this.viewZoom());
    const g = 1550 * pace;
    if (!deal) {
      this.vy = -Math.sqrt(2 * g * this.figureStand() * 0.4);
      this.bounceLock = 0.22;
      this.hopCd = 0.26;
      this.stompChain = 0;
      this.grounded = false;
      return false;
    }
    const low = first ? 1 : Math.max(0.2, 0.72 - agi * 0.01 - this.stompChain * 0.07);
    const height = 3 * this.figureStand() * low;
    this.vy = -Math.sqrt(Math.max(1, 2 * g * height));
    const rise = Math.sqrt((2 * height) / g);
    this.bounceLock = first ? rise + 0.04 : Math.max(0.07, Math.min(rise, 0.26 - agi * 0.003));
    this.hopCd = first ? 0.1 : Math.max(0.03, 0.1 - agi * 0.0013);
    this.stompChain += 1;
    this.stompChainT = 1.5;
    this.grounded = false;
    return true;
  }

  bounceOffHeads() {
    const z = Math.max(0.2, this.viewZoom());
    const feet = this.state.y;
    const prev = this.prevFeet;
    if (feet < prev - 2) return false;
    let bestY = Infinity;
    const slot: { fn: (() => void) | null } = { fn: null };
    const consider = (x: number, headY: number, halfW: number, onHit: (deal: boolean) => void) => {
      if (Math.abs(this.state.x - x) > halfW) return;
      if (!(prev <= headY + 22 && feet >= headY - 10)) return;
      if (headY >= bestY) return;
      bestY = headY;
      slot.fn = () => {
        const deal = this.headBounce();
        this.state.y = Math.min(this.state.y, headY - 4);
        this.prevFeet = this.state.y;
        onHit(deal);
        if (deal) this.iframe = 0.1;
      };
    };
    for (const m of this.mobs) {
      if (m.dead > 0) continue;
      const def = MONSTERS[m.kind];
      const h = def.h / z;
      const half = Math.max(28, def.w * 0.55) / z;
      consider(m.x, m.y - h * 0.78, half, (deal) => {
        if (!deal) return;
        const hit = this.rollPlayerDmg(stompDamage(this.state));
        this.hurtMob(m, hit.n, hit.crit);
        sfx(hit.crit ? "crit" : "stomp");
      });
    }
    for (const b of this.bosses) {
      if (b.fallen) continue;
      const def = BOSSES[b.id];
      const h = def.h / z;
      const head = b.id === "thrym" ? 0.62 : b.id === "skadi" ? 0.58 : b.id === "terror" ? 0.52 : 0.86;
      const wide = b.id === "thrym" ? 0.34 : 0.5;
      consider(b.x, b.y - h * head, (def.w / z) * wide, (deal) => {
        if (!deal) return;
        const hit = this.rollPlayerDmg(stompDamage(this.state));
        this.hurtBoss(b, hit.n, hit.crit, "stomp");
        sfx(hit.crit ? "crit" : "stomp");
      });
    }
    if (!slot.fn) return false;
    slot.fn();
    return true;
  }

  tryStompBoss(b: BossActor) {
    if (b.fallen || this.hopCd > 0 || this.vy < 20) return;
    const def = BOSSES[b.id];
    const z = Math.max(0.2, this.viewZoom());
    const bodyH = def.h / z;
    const head = b.id === "thrym" ? 0.62 : b.id === "skadi" ? 0.58 : b.id === "terror" ? 0.5 : b.id === "tyr" ? 0.86 : b.id === "nidhogg" || b.id === "hela2" ? 0.7 : 0.9;
    const wide = b.id === "thrym" ? 0.28 : b.id === "skadi" ? 0.22 : b.id === "tyr" ? 0.42 : 0.48;
    const top = b.y - bodyH * head;
    const halfW = (def.w / z) * wide;
    const wasAbove = this.prevFeet <= top + bodyH * 0.18;
    const overlap = Math.abs(this.state.x - b.x) < halfW && this.state.y > top - 10 && this.state.y < top + bodyH * 0.22;
    if (!wasAbove || !overlap) return;
    const hit = this.rollPlayerDmg(stompDamage(this.state));
    this.hurtBoss(b, hit.n, hit.crit);
    if (!this.headBounce()) return;
    this.state.y = Math.min(this.state.y, top - 4);
    this.prevFeet = this.state.y;
    this.iframe = 0.12;
    sfx(hit.crit ? "crit" : "stomp");
  }

  bossTouch(b: BossActor) {
    if (b.fallen || this.downed || this.iframe > 0) return;
    const def = BOSSES[b.id];
    const z = Math.max(0.2, this.viewZoom());
    const fenrir = b.id === "fenrir";
    const h = fenrir ? 460 / z : (def.h / z) * (b.id === "thrym" ? 0.7 : b.id === "skadi" ? 0.72 : 0.82);
    const w = fenrir ? (460 / z) * 0.9 : (def.w / z) * (b.id === "thrym" ? 0.62 : b.id === "skadi" ? 0.55 : 0.85);
    const overlap = fenrir
      ? Math.abs(this.state.x - b.x) < w * 0.52 && this.state.y > b.y - h && this.state.y - this.height() < b.y + 16
      : Math.abs(this.state.x - b.x) < 16 + w * 0.42 && this.state.y > b.y - h && this.state.y - this.height() < b.y - 6;
    if (!overlap) return;
    this.hurtPlayer(def.touch, b.id);
  }

  bossStompPlayer(b: BossActor, dmg: number) {
    if (b.fallen || b.vy < 80 || this.iframe > 0) return;
    const feetAbove = b.prevY < this.state.y - 20;
    if (!feetAbove) return;
    const reach = b.id === "skadi" ? 90 : 36;
    if (Math.abs(b.x - this.state.x) < reach && b.y >= this.state.y - 10 && b.y <= this.state.y + 16) {
      this.hurtPlayer(dmg, "boss");
      b.vy = -300;
    }
  }

  touchPlayer(x: number, y: number, w: number, h: number, dmg: number, mob?: Mob) {
    if (this.downed) return;
    const sprite = mob ? MONSTERS[mob.kind].sprite : "";
    const flying = !!mob && (MONSTERS[mob.kind].ai === "fly" || MONSTERS[mob.kind].ai === "hover");
    const graze = GRAZE.has(sprite) || flying;
    const z = Math.max(0.2, this.viewZoom());
    const drawnH = graze ? h / z : h;
    const drawnW = graze ? Math.max(w, 48) / z : w;
    if (sprite === "spark" && mob && mob.dead <= 0) {
      const sh = h / z;
      const sw = Math.max(w, 48) / z;
      const bodyH = this.figureStand();
      const sparkHit =
        Math.abs(this.state.x - x) < bodyH * 0.24 + sw * 0.5 &&
        this.state.y > y - sh - 8 &&
        this.state.y - bodyH < y + 14;
      if (sparkHit) {
        this.hurtPlayer(dmg, "spark");
        this.vx = Math.sign(this.state.x - x) * 200 || 160;
        return;
      }
    }
    const pbTop = this.state.y - this.height();
    const spider = sprite === "spider";
    const frog = sprite === "frog";
    const easy = spider || frog;
    const reach = easy ? Math.max(drawnW * 1.25, drawnH * 1.1, 72) : graze ? drawnW * 0.95 : (14 + drawnW / 2) * 0.72;
    const hurtReach = graze ? Math.max(drawnW * 0.92, 36) : (14 + drawnW / 2) * 0.72;
    const pad = graze ? 28 : 0;
    const hurtOverlap = Math.abs(this.state.x - x) < hurtReach && this.state.y > y - drawnH - pad && pbTop < y + pad;
    const stompOverlap =
      Math.abs(this.state.x - x) < reach &&
      this.state.y > y - drawnH - (frog ? 36 : 10) &&
      pbTop < y + (frog ? 28 : 14);
    if (!hurtOverlap && !stompOverlap) return;
    const falling = this.vy > (easy ? 8 : 40) && !this.grounded;
    const roseInto = !!mob && mob.prevY - mob.y > 6 && this.vy < 36;
    const wasAbove = easy ? this.prevFeet <= y + (frog ? 18 : 8) : this.prevFeet <= y - drawnH * 0.35;
    if (falling && wasAbove && !roseInto && mob && mob.dead <= 0 && stompOverlap && this.hopCd <= 0) {
      const hit = this.rollPlayerDmg(stompDamage(this.state));
      this.hurtMob(mob, hit.n, hit.crit);
      if (this.headBounce()) {
        this.state.y = Math.min(this.state.y, y - drawnH - 6);
        this.prevFeet = this.state.y;
      }
      this.iframe = 0.12;
      sfx("stomp");
      return;
    }
    if (this.bosses.length && !mob) return;
    if (this.iframe > 0 || !mob) return;
    if (!hurtOverlap) return;
    this.hurtPlayer(dmg, "monster");
    const fromBelow = y > this.state.y - 8;
    if (!fromBelow) this.vx = Math.sign(this.state.x - x) * 180 || 140;
  }

  hurtMob(m: Mob, dmg: number, crit = false) {
    if (m.dead > 0) return;
    m.hp -= dmg;
    this.float(m.x, m.y - MONSTERS[m.kind].h - 8, String(dmg), crit ? "#ff4fa3" : "#ffe14a");
    this.shake = Math.max(this.shake, 0.15);
    if (m.hp <= 0) {
      m.dead = 4.6;
      const def = MONSTERS[m.kind];
      const power = scaledMonster(m.kind, this.map.diff ?? 0);
      const loot = rollMonsterLoot(def.region, power.gold[0], power.gold[1], m.kind);
      this.spawnScatter(m.x, m.y, loot.gold, loot.items, "monster");
      this.gainExp(power.exp);
      this.noteQuestKill(m.kind);
      logSystem(`Defeated ${def.sprite} for ${power.exp} EXP.`);
      sfx("coin");
    }
  }

  hurtBoss(b: BossActor, dmg: number, crit = false, kind: "hit" | "proj" | "stomp" = "hit") {
    if (b.fallen || b.asleep) return;
    const def = BOSSES[b.id];
    const armor = (b.id === "catcher" ? def.def : def.def * 100) + (kind === "proj" || kind === "stomp" ? shellDef(b.id) : 0);
    const chip = Math.max(1, Math.round(mitigate(dmg, armor) * (def.hp / 3500)));
    b.hp -= chip;
    if (b.id === "ultrahela") this.writeUltra(b.hp, 0);
    this.bossHurt.set(b.id, (this.bossHurt.get(b.id) ?? 0) + chip);
    this.float(b.x, b.y - def.h * 0.7, String(chip), crit ? "#ff4fa3" : "#ffe14a");
    logSystem(`You hit ${def.name} for ${chip}.`);
    this.shake = Math.max(this.shake, 0.25);
    if (b.hp > 0) return;
    const id = b.id;
    if (id === "ultrahela") this.writeUltra(0, Date.now() + 60 * 60 * 1000);
    this.locallyDown.add(id);
    this.bossUp[id] = false;
    this.gainExp(BOSSES[id].exp);
    this.toastMsg(`${BOSSES[id].name} falls!`);
    sfx("boss");
    const dealt = this.bossHurt.get(id) ?? chip;
    this.bossHurt.delete(id);
    this.hooks.onBossKill(id, b.x, b.y, dealt);
    if (id === "valkyrie") {
      b.fallen = true;
      b.hp = 0;
      b.vx = 0;
      b.state = "fall";
      this.hooks.onStory?.("valkyrie");
      return;
    }
    this.bosses = this.bosses.filter((actor) => actor !== b);
  }

  hurtPlayer(raw: number, src: string) {
    if (this.iframe > 0 || this.downed) return;
    const dmg = mitigate(raw, statsOf(this.state).def);
    this.state.hp -= dmg;
    this.iframe = src === "acid" ? 0.18 : 0.7;
    this.battleLock = 3;
    this.float(this.state.x + 18, this.state.y - this.figureStand() * 0.62, `-${dmg}`, "#ff6b6b");
    logSystem(`${src} hit you for ${dmg}.`);
    this.shake = 0.45;
    sfx("hurt");
    if (src !== "pvp") this.lastAttacker = "";
    if (this.state.hp <= 0) {
      this.state.hp = 0;
      this.beginDeath();
    }
  }

  sufferPvp(amount: number, attackerName: string, attackerId: string) {
    this.lastAttacker = attackerId;
    if (this.iframe > 0 || this.downed) return;
    const dmg = mitigate(amount, statsOf(this.state).def);
    this.state.hp -= dmg;
    this.iframe = 0.45;
    this.battleLock = 3;
    this.float(this.state.x, this.state.y - 78, String(dmg), "#ff6b6b");
    this.toastMsg(`${attackerName} hit you`);
    sfx("hurt");
    if (this.state.hp <= 0) {
      this.state.hp = 0;
      this.beginDeath();
    }
  }

  takeBossHurt() {
    const out: { boss: string; amount: number }[] = [];
    for (const [boss, amount] of this.bossHurt) if (amount > 0) out.push({ boss, amount });
    this.bossHurt.clear();
    return out;
  }

  crown(id: string) {
    this.crownId = id;
    this.crownT = 6.5;
    this.fwCrown = 0.05;
    const who = id === this.myId ? this.state : this.peers.find((p) => p.id === id);
    if (who) this.launchFireworks(6, who.x, who.y);
    if (id === this.myId) sfx("level");
  }

  beginDeath() {
    if (this.downed) return;
    this.climbing = null;
    this.vx = 0;
    this.vy = 0;
    sfx("death");
    const pit = this.map.id === "duel" || this.map.id === "ffa" || this.map.id === "ffa-ultra";
    if (pit) {
      const attackerId = this.lastAttacker;
      this.lastAttacker = "";
      this.downed = false;
      this.state.hp = Math.round(maxHp(this.state) * 0.55);
      this.state.sp = Math.round(maxSp(this.state) * 0.5);
      this.toastMsg("Battle stadium death. You kept your items.");
      logSystem("Battle stadium death. You kept your items.");
      this.hooks.onArenaDeath?.({ mode: this.map.id === "duel" ? "duel" : "ffa", attackerId });
      this.enter("midgard", "gate");
      this.hooks.onChange();
      return;
    }
    if (this.lastAttacker && this.map.id === "midgard") {
      this.hooks.onDied({ map: this.map.id, attackerId: this.lastAttacker });
    }
    this.lastAttacker = "";
    const gemIndex = this.state.bag.findIndex((it) => it.id === "soul-gem" && (it.charges ?? 3) > 0);
    if (gemIndex >= 0) {
      const gem = this.state.bag[gemIndex]!;
      const charges = gem.charges ?? 3;
      const left = charges - 1;
      const qty = gem.qty ?? 1;
      if (qty > 1) this.state.bag[gemIndex] = { ...gem, qty: qty - 1 };
      else this.state.bag.splice(gemIndex, 1);
      if (left > 0) {
        this.spawnLoot(this.state.x, this.state.y, 0, [{ ...gem, qty: 1, charges: left, bag: undefined }]);
        this.toastMsg(`Soul Stone drops at ${left}/3. Bag, gold, and gear stay.`);
        logSystem(`Soul Stone dropped at ${left}/3. Your bag, gold, and equipment stayed.`);
      } else {
        this.toastMsg("Soul Stone shatters. Bag, gold, and gear stay.");
        logSystem("Soul Stone shattered. Your bag, gold, and equipment stayed.");
      }
    } else {
      const keepBag: ItemInst[] = [];
      const keepEquip: SaveState["equip"] = {};
      const spill: ItemInst[] = [];
      const spillOne = (it: ItemInst, equipped: boolean) => {
        if (isBoundItem(it)) {
          if (equipped) {
            const slot = slotFor(it.id);
            if (slot) keepEquip[slot] = it;
            else keepBag.push(it);
          } else keepBag.push(it);
          return;
        }
        if (equipped && it.skin) {
          keepBag.push(newItem(it.skin));
          spill.push({ ...it, skin: undefined });
          return;
        }
        spill.push({ ...it, bag: undefined });
      };
      for (const it of this.state.bag) spillOne(it, false);
      for (const it of Object.values(this.state.equip)) {
        if (it) spillOne(it, true);
      }
      const gold = this.state.gold;
      this.state.bag = keepBag;
      this.state.gold = 0;
      this.state.equip = keepEquip;
      this.state.mounted = false;
      if (gold > 0 || spill.length) this.spawnScatter(this.state.x, this.state.y, gold, spill, "player");
      if (gold > 0 || spill.length) {
        this.toastMsg("Your bag, gold, and equipment spilled.");
        logSystem(`You dropped ${gold} gold and ${spill.length} item${spill.length === 1 ? "" : "s"}, including what you had equipped.`);
      }
    }
    this.state.hp = 0;
    this.downed = true;
    this.reviveUid = null;
    logSystem("You died.");
    this.openRequest = "downed";
    this.hooks.onChange();
    this.hooks.onPersist?.();
  }

  finishDeath() {
    if (!this.downed && this.state.hp > 0) return;
    this.downed = false;
    this.reviveUid = null;
    const goJail = this.state.criminal;
    this.state.hp = Math.round(maxHp(this.state) * (goJail ? 0.4 : 0.55));
    this.state.sp = Math.round(maxSp(this.state) * 0.5);
    if (goJail) {
      this.state.jailedUntil = Date.now() + 5 * 60 * 1000;
      this.toastMsg("Dragged to jail for 5 minutes.");
      sfx("jail");
      this.enter("jail", "gate");
    } else {
      this.enter("midgard", "gate");
      this.toastMsg("You wake in Midgard.");
    }
    if (!this.state.bag.some((it) => it.id === "talaria") && this.state.bag.length < BAG_MAX) {
      this.state.bag.push(newItem("talaria"));
    }
    this.hooks.onChange();
  }

  revive(by: string) {
    if (!this.downed) return;
    this.downed = false;
    this.reviveUid = null;
    this.state.hp = Math.round(maxHp(this.state) * 0.5);
    this.state.sp = Math.round(maxSp(this.state) * 0.5);
    this.iframe = 1.4;
    this.dismissModal = true;
    this.toastMsg(`${by} revived you with a Yggdrasil Branch.`);
    logSystem(`${by} revived you.`);
    sfx("potion");
    this.hooks.onChange();
  }

  nearestCorpse() {
    const reach = 110 / this.viewZoom();
    let best: Peer | null = null;
    let dist = reach;
    for (const peer of this.peers) {
      if (peer.id === this.myId || peer.pose !== "dead") continue;
      const d = Math.hypot(peer.x - this.state.x, peer.y - this.state.y);
      if (d < dist) {
        dist = d;
        best = peer;
      }
    }
    return best;
  }

  gainExp(n: number, shared = false) {
    let grant = Math.max(0, Math.round(n));
    if (!shared && this.partySize > 1) {
      const boosted = this.partySize >= 6 ? grant * 1.5 : grant;
      grant = Math.ceil(boosted / this.partySize);
      this.hooks.onPartyExp?.(grant);
    }
    this.state.exp += grant;
    this.float(this.state.x, this.state.y - 96, `+${grant} xp`, "#b7f0c2");
    logSystem(`+${grant} EXP.`);
    let leveled = false;
    while (this.state.level < 99 && this.state.exp >= nextExp(this.state.level)) {
      this.state.exp -= nextExp(this.state.level);
      this.state.level += 1;
      this.state.points += 2;
      leveled = true;
    }
    if (leveled) {
      this.state.hp = maxHp(this.state);
      this.state.sp = maxSp(this.state);
      this.toastMsg(`Level ${this.state.level}! +2 stat points.`);
      logSystem(`Level up! You are level ${this.state.level}.`);
      this.celebrateLevel();
      sfx("level");
    }
    this.hooks.onChange();
  }

  regen(dt: number) {
    const s = statsOf(this.state);
    const spRate = 3.2 + s.int * 0.28;
    if (!this.throwHeld && !this.downed) {
      this.state.sp = Math.min(maxSp(this.state), this.state.sp + spRate * dt);
    }
    const still = this.grounded && !this.downed && !this.climbing && !this.jumpHeld && !this.throwHeld && Math.abs(this.vx) < 18 && this.iframe <= 0;
    if (still && this.state.hp > 0) {
      this.state.hp = Math.min(maxHp(this.state), this.state.hp + spRate * 0.28 * dt);
    }
  }

  touchHazards(_dt: number) {
    if (!this.map.hazard || this.state.mounted) return;
    if (this.state.y > this.map.h * 0.965) {
      this.hurtPlayer(Math.round(maxHp(this.state) * 0.18), "pit");
      this.state.x = this.safeX;
      this.state.y = this.safeY;
      this.vy = 0;
      this.vx = 0;
    }
  }

  touchPits() {
    const s = 1 / Math.max(0.2, this.viewZoom());
    for (const d of this.drops) {
      if ((this.dropReady.get(d.id) ?? 0) > Date.now()) continue;
      const both = d.gold > 0 && d.items.length > 0;
      const y = this.dropSpot(d);
      if (Math.abs(d.x - this.state.x) > (both ? 54 : 36) * s) continue;
      if (Math.abs(y - this.state.y) > 40 * s) continue;
      if (d.claimId && d.claimId !== this.myId && Date.now() < d.publicAt) continue;
      if (d.local) {
        this.takeLocal(d);
      } else if (!this.pendingPickup.has(d.id)) {
        this.pendingPickup.add(d.id);
        this.onPickup?.(d);
      }
    }
  }

  takeLocal(d: GroundDrop) {
    const clean = d.items.map(({ bag: _bag, ...rest }) => rest);
    const room = BAG_MAX - this.state.bag.length;
    const moving = clean.slice(0, Math.max(0, room));
    const left = clean.slice(moving.length);
    let failed = false;
    const accepted: ItemInst[] = [];
    for (const item of moving) {
      if (!stackInto(this.state.bag, item, BAG_MAX)) {
        failed = true;
        left.unshift(item);
        break;
      }
      accepted.push(item);
      this.noteLoot(item);
    }
    if (accepted.length !== moving.length) {
      /* remainder already pushed back via failed path */
    }
    this.state.gold += d.gold;
    if (d.gold > 0) logSystem(`Picked up ${d.gold} gold.`);
    d.gold = 0;
    d.items = left;
    if (d.gold === 0 && d.items.length === 0) {
      this.eaten.add(d.id);
      this.drops = this.drops.filter((x) => x.id !== d.id);
      this.dropFall.delete(d.id);
    } else if (failed) this.toastMsg("Bag full.");
    sfx("pickup");
    this.hooks.onChange();
  }

  noteLoot(item: ItemInst) {
    const def = itemDef(item.id);
    const name = def?.name ?? item.id;
    const qty = item.qty && item.qty > 1 ? ` x${item.qty}` : "";
    logSystem(`Picked up ${name}${qty}.`);
    const epic = def?.kind === "card" || !!def?.epic || !!def?.proj;
    if (epic) {
      this.toastMsg(`Congrats! you got "${name}"!`);
      this.toastT = 3.4;
      this.float(this.state.x, this.state.y - this.figureStand() - 20, name, "#ffe27a");
    }
  }

  checkEdges() {
    if (this.climbing || this.portalLock > 0 || this.state.mounted || this.map.id === "midgard" || this.map.id === "jail") return;
    if (this.state.x < 56 && this.map.left) {
      const dest = this.map.left;
      const side = dest === "midgard" ? "gate" : "right";
      this.enter(dest, side);
    } else if (this.state.x > this.map.w - 56 && this.map.right) {
      this.enter(this.map.right, "left");
    }
  }

  scanInteract() {
    this.nearShop = null;
    this.nearGate = null;
    this.nearLabel = null;
    this.nearPeer = null;
    this.nearKneel = false;
    this.nearMimir = false;
    const xSlop = 62;
    const ySlop = 78;
    let best = Infinity;
    const take = (x: number, y: number, apply: () => void, slopX = xSlop, slopY = ySlop) => {
      const dx = Math.abs(this.state.x - x);
      const dy = Math.abs(this.state.y - y);
      if (dx > slopX || dy > slopY) return;
      const score = dx + dy * 0.35;
      if (score >= best) return;
      best = score;
      this.nearShop = null;
      this.nearGate = null;
      this.nearPeer = null;
      this.nearKneel = false;
      this.nearMimir = false;
      apply();
    };
    const inZone = (zone: { x: number; w: number; top: number; bot: number }) =>
      this.state.x >= zone.x && this.state.x <= zone.x + zone.w && this.state.y >= zone.top && this.state.y <= zone.bot;
    for (const n of this.map.npcs) {
      if (n.box) {
        if (!inZone(n.box)) continue;
        const score = Math.abs(this.state.x - (n.box.x + n.box.w / 2)) * 0.15;
        if (score >= best) continue;
        best = score;
        this.nearShop = n.shop;
        this.nearLabel = n.label;
        this.nearGate = null;
        this.nearPeer = null;
        this.nearKneel = false;
        this.nearMimir = false;
      } else {
        take(n.x, n.y, () => {
          this.nearShop = n.shop;
          this.nearLabel = n.label;
        }, n.shop === "ferry" ? 200 : xSlop, n.shop === "ferry" ? 170 : ySlop);
      }
    }
    for (const g of this.map.gates) {
      if (g.secret && !this.secretReady()) continue;
      if (g.dwarf && this.bossUp.brokk !== false) continue;
      if (g.fenrir && this.bossUp.tyr !== false) continue;
      if (g.boat && this.bossUp.nidhogg !== false) continue;
      const asgardLock = this.map.theme === "asgard" && !!(g.key || g.secret || g.fenrir);
      const apply = () => {
        this.nearGate = g.to;
        const locked = !!g.key && !this.doorOpen(g.door);
        this.nearLabel = locked ? `${g.label} (locked)` : g.label;
      };
      if (g.boat) {
        take(g.x, g.y, apply, 340, 200);
        continue;
      }
      if (g.box) {
        if (!inZone(g.box)) continue;
        const score = Math.abs(this.state.x - (g.box.x + g.box.w / 2)) * 0.15 + 0.01;
        if (score >= best) continue;
        best = score;
        this.nearShop = null;
        this.nearPeer = null;
        this.nearKneel = false;
        this.nearMimir = false;
        apply();
      } else take(g.x, g.y, apply, asgardLock ? 220 : xSlop, asgardLock ? 150 : ySlop);
    }
    if (this.map.id === "yggdrasil") {
      const sleeper = this.bosses.find((b) => b.id === "mimir" && b.asleep);
      if (sleeper && Math.abs(this.state.x - sleeper.x) < 620 && Math.abs(this.state.y - sleeper.y) < 220) {
        best = 0;
        this.nearShop = null;
        this.nearGate = null;
        this.nearPeer = null;
        this.nearKneel = false;
        this.nearMimir = true;
        this.nearLabel = "Mimir";
      }
    }
    if (this.map.id === "nidavellir-nightmare" && this.bossUp.brokk === false) {
      const kx = this.map.w - 280;
      const ky = this.map.platforms.find((p) => !p.oneWay)?.y ?? this.state.y;
      take(kx, ky, () => {
        this.nearKneel = true;
        this.nearLabel = "Defeated Dwarf";
      });
    }
    for (const p of this.peers) {
      take(p.x, p.y, () => {
        this.nearPeer = p.id;
        this.nearLabel = p.name;
      });
    }
  }

  nearestBossDrop() {
    const s = 1 / Math.max(0.2, this.viewZoom());
    let best: GroundDrop | null = null;
    let dist = 48 * s;
    for (const d of this.drops) {
      if (!d.claimId) continue;
      const y = this.dropSpot(d);
      const dd = Math.hypot(d.x - this.state.x, y - this.state.y);
      if (dd < dist) {
        dist = dd;
        best = d;
      }
    }
    return best;
  }

  pickupDrop(d: GroundDrop) {
    if (d.claimId && d.claimId !== this.myId && Date.now() < d.publicAt) {
      this.toastMsg("Only the hero who hurt this boss most can take it yet.");
      return;
    }
    if (d.local) this.takeLocal(d);
    else if (!this.pendingPickup.has(d.id)) {
      this.pendingPickup.add(d.id);
      this.onPickup?.(d);
    }
  }

  useInteract() {
    if (this.downed) {
      this.openRequest = "downed";
      return false;
    }
    if (this.reviveUid) {
      const corpse = this.nearestCorpse();
      const it = this.state.bag.find((item) => item.uid === this.reviveUid);
      if (!it) {
        this.reviveUid = null;
        return false;
      }
      if (!corpse) {
        this.toastMsg("Press the fallen player's body.");
        return false;
      }
      this.state.bag = this.state.bag.filter((item) => item.uid !== it.uid);
      this.reviveUid = null;
      this.hooks.onRevive(corpse.id);
      this.toastMsg(`The branch wakes ${corpse.name}.`);
      sfx("potion");
      this.hooks.onChange();
      return false;
    }
    if (this.nearShop) {
      this.openRequest = "shop";
      return false;
    }
    const bossDrop = this.nearestBossDrop();
    if (bossDrop) {
      this.pickupDrop(bossDrop);
      return false;
    }
    if (this.nearKneel) {
      this.toastMsg("Here is a secret door to the Most Evil Dwarf of all. Enter if You Dare. You may find something rare. Be warned, for what he wears is Corrupt with Evil.");
      this.hooks.onStory?.("dwarf");
      return false;
    }
    if (this.nearMimir) {
      this.openRequest = "mimir";
      return false;
    }
    if (this.nearGate) {
      this.travelGate();
      return true;
    }
    if (this.nearPeer) {
      this.openRequest = "peer";
      return false;
    }
    this.toastMsg("Stand by a shop or a portal, then Talk/Go.");
    return false;
  }

  secretReady() {
    if (!this.map.gates.some((g) => g.secret)) return false;
    const ids = this.roster();
    return ids.length > 1 && ids.every((id) => !this.bosses.some((b) => b.id === id && !b.fallen));
  }

  doorOpen(id?: string) {
    if (!id) return false;
    return (this.openDoors[id] ?? 0) > Date.now();
  }

  takeOne(id: string) {
    const it = this.state.bag.find((item) => item.id === id && (item.qty ?? 1) > 0);
    if (!it) return false;
    if ((it.qty ?? 1) > 1) it.qty = (it.qty ?? 1) - 1;
    else this.state.bag = this.state.bag.filter((item) => item.uid !== it.uid);
    return true;
  }

  tryFenrir() {
    const keys = ["key-red", "key-blue", "key-gold", "key-pink", "key-green", "key-purple", "key-silver"];
    const have = keys.every((id) => this.state.bag.some((it) => it.id === id && (it.qty ?? 1) > 0));
    if (!have) return false;
    this.enter("fenrir-pit", "left");
    return true;
  }

  travelGate() {
    if (!this.nearGate) return;
    const gate = this.map.gates.find((g) => g.to === this.nearGate);
    if (this.map.id === "jail" && this.state.jailedUntil > Date.now()) {
      this.toastMsg("The door stays shut until the sentence ends.");
      return;
    }
    if (gate?.secret && !this.secretReady()) return;
    if (gate?.fenrir) {
      this.openRequest = "fenrir";
      return;
    }
    if (gate?.key && !this.doorOpen(gate.door)) {
      if (!this.takeOne(gate.key)) {
        this.toastMsg("The door is locked. You need the right key.");
        return;
      }
      if (gate.door) {
        this.openDoors[gate.door] = Date.now() + 30_000;
        this.hooks.onUnlock?.(gate.door);
      }
      this.toastMsg("The key vanishes. The door stays open for 30 seconds.");
      this.hooks.onChange();
    }
    const fromJail = this.map.id === "jail" && this.nearGate === "midgard";
    const fromPipe = this.map.id === "yggdrasil" && this.nearGate === "midgard";
    this.enter(this.nearGate, gate?.back ? "right" : "left");
    if (fromJail) {
      this.state.x = JAIL_STREET.x;
      this.state.y = JAIL_STREET.y;
      this.vx = 0;
      this.vy = 0;
      this.aimCamera(true);
    }
    if (fromPipe) {
      this.state.x = CITY_PIPE.x;
      this.state.y = CITY_PIPE.stand;
      this.vx = 0;
      this.vy = 0;
      this.aimCamera(true);
    }
  }

  float(x: number, y: number, text: string, color: string) {
    this.floaters.push({ x, y, text, color, life: 2.4, vy: 18 });
  }

  celebrateLevel() {
    this.levelShow = 2.8;
    this.fwTimer = 0;
    this.launchFireworks(4);
  }

  launchFireworks(n: number, x = this.state.x, y = this.state.y) {
    const colors = ["#ffe27a", "#ff5d7a", "#7af6ff", "#b6ff6a", "#ff9a3c", "#fff6d8"];
    const z = Math.max(0.2, this.viewZoom());
    const head = y - this.figureStand() * 0.15;
    for (let i = 0; i < n; i++) {
      const ox = (Math.random() - 0.5) * 90 / z;
      const oy = -Math.random() * 48 / z;
      const color = colors[(i + Math.floor(Math.random() * colors.length)) % colors.length]!;
      const count = 18;
      for (let k = 0; k < count; k++) {
        const ang = (k / count) * Math.PI * 2 + Math.random() * 0.25;
        const sp = (55 + Math.random() * 110) / z;
        this.sparks.push({
          x: x + ox,
          y: head + oy,
          vx: Math.cos(ang) * sp,
          vy: Math.sin(ang) * sp,
          life: 0.65 + Math.random() * 0.45,
          color,
          size: (2.4 + Math.random() * 2.4) / z,
        });
      }
    }
  }

  tickFireworks(dt: number) {
    if (this.levelShow > 0) {
      this.levelShow = Math.max(0, this.levelShow - dt);
      this.fwTimer -= dt;
      if (this.fwTimer <= 0 && this.levelShow > 0.35) {
        this.fwTimer = 0.42;
        this.launchFireworks(2);
      }
    }
    if (this.crownT > 0) {
      this.fwCrown -= dt;
      if (this.fwCrown <= 0) {
        this.fwCrown = 0.7;
        const who = this.crownId === this.myId ? this.state : this.peers.find((p) => p.id === this.crownId);
        if (who) this.launchFireworks(2, who.x, who.y);
      }
    }
    const z = Math.max(0.2, this.viewZoom());
    for (const s of this.sparks) {
      s.vy += (70 / z) * dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.life -= dt;
    }
    if (this.sparks.length) this.sparks = this.sparks.filter((s) => s.life > 0);
  }

  drawLevelUp(ctx: CanvasRenderingContext2D, z: number) {
    for (const s of this.sparks) {
      ctx.globalAlpha = Math.max(0, Math.min(1, s.life * 1.6));
      ctx.fillStyle = s.color;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fffaf0";
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    if (this.levelShow > 0) {
      const bob = Math.sin(performance.now() / 140) * (6 / z);
      const y = this.state.y - this.height() - 78 / z + bob;
      const fade = Math.min(1, this.levelShow);
      ctx.globalAlpha = fade;
      ctx.textAlign = "center";
      ctx.font = `800 ${Math.round(22 / z)}px Cinzel, serif`;
      ctx.lineWidth = 4 / z;
      ctx.strokeStyle = "#2a1408";
      ctx.strokeText("Level Up", this.state.x, y);
      ctx.fillStyle = "#ffe27a";
      ctx.fillText("Level Up", this.state.x, y);
      ctx.globalAlpha = 1;
    }
    if (this.crownT > 0) {
      const who = this.crownId === this.myId ? this.state : this.peers.find((p) => p.id === this.crownId);
      if (who) {
        const y = who.y - this.figureStand() - 70 / z + Math.sin(performance.now() / 160) * (5 / z);
        ctx.globalAlpha = Math.min(1, this.crownT);
        ctx.textAlign = "center";
        ctx.font = `800 ${Math.round(20 / z)}px Cinzel, serif`;
        ctx.lineWidth = 4 / z;
        ctx.strokeStyle = "#2a1408";
        ctx.strokeText("1st Place", who.x, y);
        ctx.fillStyle = "#ffe27a";
        ctx.fillText("1st Place", who.x, y);
        ctx.globalAlpha = 1;
      }
    }
  }

  flyMount(ax: { x: number; y: number; jump: boolean; run: boolean }, dt: number, pace: number) {
    const bonus = mountSpeed(this.state.equip.mount?.id);
    const speed = (240 + bonus * 16) * (ax.run ? 1.35 : 1) * pace;
    const target = Math.abs(ax.x) > 0.18 ? Math.sign(ax.x) * speed : 0;
    const accel = 2200 * pace;
    if (this.vx < target) this.vx = Math.min(target, this.vx + accel * dt);
    else if (this.vx > target) this.vx = Math.max(target, this.vx - accel * dt);
    const lift = Math.abs(ax.y) > 0.2 ? ax.y * speed * 0.8 : 0;
    this.vy += (lift - this.vy) * Math.min(1, dt * 6);
    if (Math.abs(ax.x) > 0.2) this.facing = ax.x > 0 ? 1 : -1;
    this.grounded = false;
    this.climbing = null;
    this.prevFeet = this.state.y;
    this.state.x += this.vx * dt;
    this.state.y += this.vy * dt;
    this.state.x = Math.max(40, Math.min(this.map.w - 40, this.state.x));
    let floor = 0;
    for (const plat of this.map.platforms) {
      if (this.state.x < plat.x + 8 || this.state.x > plat.x + plat.w - 8) continue;
      if (plat.y > floor) floor = plat.y;
    }
    if (!floor) floor = this.map.platforms.reduce((m, p) => Math.max(m, p.y), 0);
    const low = floor - 20;
    if (this.state.y > low) {
      this.state.y = low;
      this.vy = -180 * pace;
    }
    const high = 70;
    if (this.state.y < high) {
      this.state.y = high;
      this.vy = Math.max(this.vy, 40 * pace);
    }
    if (this.jumpBuf > 0) {
      this.jumpBuf = 0;
      this.letGoMount();
      this.vy = jumpVelocity(this.state) * pace;
      sfx("jump");
    }
  }

  letGoMount() {
    if (!this.state.mounted) return;
    this.state.mounted = false;
    this.toastMsg("You let go. The mount stays equipped.");
    this.hooks.onChange();
  }

  toggleMount() {
    if (this.state.mounted) {
      this.letGoMount();
      this.toastMsg("You let go.");
      return;
    }
    if (!this.state.equip.mount) {
      this.toastMsg("Equip a mount, then hang on.");
      return;
    }
    this.state.mounted = true;
    this.climbing = null;
    this.vy = -180;
    this.toastMsg("You hang on. Jump or Dismount to let go.");
  }

  buyMount(id: string) {
    const def = MOUNTS.find((m) => m.id === id);
    if (!def || def.cost <= 0) return "Not for sale.";
    if (def.bound && def.id !== "mount-phoenix") return "Not for sale.";
    if (projectileCredits(this.state.bag) < def.cost) return `Need ${def.cost} projectile weapons. Kids Baseball does not count.`;
    let need = def.cost;
    const next = [...this.state.bag];
    for (const it of next) {
      if (need <= 0) break;
      const d = itemDef(it.id);
      if (!d?.proj || it.id === "kids-baseball") continue;
      const qty = it.qty ?? 1;
      const take = Math.min(qty, need);
      it.qty = qty - take;
      need -= take;
    }
    this.state.bag = next.filter((it) => (it.qty ?? 1) > 0);
    stackInto(this.state.bag, newItem(def.id), BAG_MAX);
    this.toastMsg(`${def.name} is in your bag.`);
    this.hooks.onChange();
    return "";
  }

  applySkin(skinId: string, mountUid?: string) {
    const owns = [...this.state.bag, ...Object.values(this.state.equip), ...this.state.storage].some((it) => it?.id === skinId);
    if (!owns) return "You do not have that skin.";
    const mounts = [...this.state.bag, this.state.equip.mount].filter((it): it is ItemInst => !!it && (itemDef(it.id)?.kind === "mount"));
    if (!mounts.length) return "A skin needs a mount.";
    const target = mounts.find((it) => it.uid === mountUid) ?? this.state.equip.mount ?? mounts[0]!;
    target.skin = skinId;
    this.toastMsg("Skin applied.");
    this.hooks.onChange();
    return "";
  }

  clearSkin(mountUid?: string) {
    const mounts = [...this.state.bag, this.state.equip.mount].filter((it): it is ItemInst => !!it && itemDef(it.id)?.kind === "mount");
    const target = mounts.find((it) => it.uid === mountUid) ?? this.state.equip.mount ?? mounts.find((it) => it.skin);
    if (!target) return "No mount to clear.";
    if (!target.skin) return "That mount has no skin.";
    target.skin = undefined;
    this.toastMsg("Skin removed.");
    this.hooks.onChange();
    return "";
  }

  tryPipe(ax: { y: number }, dt: number) {
    if (this.pipeSink > 0) {
      this.pipeSink += dt;
      this.vx = 0;
      this.vy = 0;
      this.state.x = CITY_PIPE.x;
      this.state.y = CITY_PIPE.stand + Math.min(70, this.pipeSink * 90);
      if (this.pipeSink > 0.85) {
        this.pipeSink = 0;
        this.enter("yggdrasil", "left");
        const ground = this.map.platforms.find((p) => !p.oneWay);
        this.state.x = this.map.w * 0.38;
        this.state.y = ground?.y ?? this.state.y;
        this.aimCamera(true);
      }
      return;
    }
    if (this.map.id !== "midgard" || this.state.mounted || !this.grounded) return;
    const onLip = Math.abs(this.state.x - CITY_PIPE.x) < 175 && Math.abs(this.state.y - CITY_PIPE.stand) < 36;
    if (!onLip || ax.y < 0.55) return;
    this.pipeSink = 0.01;
    this.vx = 0;
    this.vy = 0;
  }

  noteQuestKill(kind: MonsterId) {
    const q = this.state.quest;
    if (!q?.accepted) return;
    if (questMonster(q) !== kind) return;
    const where = questMap(q);
    if (where && this.map.id !== where) return;
    if (q.kills >= questNeed(q)) return;
    q.kills += 1;
    if (q.kills >= questNeed(q)) this.toastMsg("Quest complete. Return to City Hall.");
    this.hooks.onChange();
  }

  acceptQuest() {
    if (!this.state.quest) this.state.quest = freshQuest();
    const q = this.state.quest;
    if (q.accepted && q.kills < questNeed(q)) {
      this.toastMsg("Finish the hunt you already took.");
      return;
    }
    q.accepted = true;
    if (q.kills >= questNeed(q)) q.kills = q.kills;
    else q.kills = 0;
    this.toastMsg("The hunt is yours.");
    this.hooks.onChange();
  }

  completeQuest() {
    const q = this.state.quest ?? freshQuest();
    this.state.quest = q;
    if (!questReady(q)) {
      this.toastMsg("That hunt is not finished.");
      return;
    }
    const exp = questReward(q);
    const repeating = q.step >= MAIN_QUESTS;
    this.gainExp(exp);
    if (repeating) {
      q.repeat += 1;
      q.kills = 0;
      q.accepted = false;
      this.hooks.onGuildPoint?.();
      this.toastMsg(`City Hall pays ${exp} EXP. The guild gains a point.`);
    } else {
      q.step += 1;
      q.kills = 0;
      q.accepted = false;
      if (q.step >= MAIN_QUESTS) {
        const owned = [...this.state.bag, ...Object.values(this.state.equip), ...this.state.storage].some((it) => it?.id === "mount-phoenix");
        if (!owned) stackInto(this.state.bag, newItem("mount-phoenix"), BAG_MAX);
        this.toastMsg("Complete all 122 quests and receive The Flaming Phoenix Mount. The only Binded, and Undroppable Mount.");
      } else this.toastMsg(`City Hall pays ${exp} EXP.`);
    }
    this.hooks.onChange();
  }

  reborn() {
    if (this.state.level < 99) {
      this.toastMsg("Reach level 99 first.");
      return;
    }
    if ((this.state.reborn ?? 0) >= 10) {
      this.toastMsg("Ten reborns is the limit.");
      return;
    }
    const n = (this.state.reborn ?? 0) + 1;
    const pre = n * 10;
    this.state.reborn = n;
    this.state.level = 1;
    this.state.exp = 0;
    this.state.points = 0;
    this.state.str = pre;
    this.state.agi = pre;
    this.state.vit = pre;
    this.state.int = pre;
    this.state.dex = pre;
    this.state.luck = pre;
    this.state.hp = maxHp(this.state);
    this.state.sp = maxSp(this.state);
    this.toastMsg(`Reborn ${n}. Every stat starts at ${pre}.`);
    this.hooks.onChange();
  }

  claimSoul() {
    const week = 7 * 24 * 60 * 60 * 1000;
    const last = this.state.soulAt ?? 0;
    const wait = week - (Date.now() - last);
    if (last && wait > 0) {
      const days = Math.ceil(wait / (24 * 60 * 60 * 1000));
      this.toastMsg(`A Soul Stone was already given. Come back in ${days} day${days === 1 ? "" : "s"}.`);
      return;
    }
    if (!stackInto(this.state.bag, newItem("soul-gem", 3), BAG_MAX)) {
      this.toastMsg("Bag full.");
      return;
    }
    this.state.soulAt = Date.now();
    this.toastMsg("Your friend presses a Soul Stone into your hand.");
    this.hooks.onChange();
  }

  wakeMimir() {
    const b = this.bosses.find((actor) => actor.id === "mimir");
    if (!b) return;
    b.asleep = false;
    b.state = "wait";
    b.timer = 0.4;
    this.toastMsg("Mimir stands.");
    sfx("boss");
  }

  toastMsg(text: string) {
    this.toast = text;
    this.toastT = 2.6;
  }

  spend(stat: StatKey) {
    if (this.state.points <= 0) return;
    const beforeH = maxHp(this.state);
    const beforeS = maxSp(this.state);
    this.state[stat] += 1;
    this.state.points -= 1;
    this.state.hp += maxHp(this.state) - beforeH;
    this.state.sp += maxSp(this.state) - beforeS;
    sfx("ui");
    this.hooks.onChange();
  }

  equipUid(uid: string) {
    const it = this.state.bag.find((i) => i.uid === uid);
    if (!it) return;
    const slot = slotFor(it.id);
    if (!slot) {
      if (itemDef(it.id)?.kind === "potion" || itemDef(it.id)?.kind === "relic") this.useUid(uid);
      return;
    }
    const prev = this.state.equip[slot];
    const worn = (it.qty ?? 1) > 1 ? { ...it, uid: crypto.randomUUID(), qty: 1, bag: undefined } : it;
    if ((it.qty ?? 1) > 1) it.qty = (it.qty ?? 1) - 1;
    else this.state.bag = this.state.bag.filter((i) => i.uid !== uid);
    this.state.equip[slot] = worn;
    if (prev) stackInto(this.state.bag, prev, BAG_MAX);
    sfx("ui");
    this.hooks.onChange();
  }

  unequip(slot: EquipSlot | "acc") {
    const it = this.state.equip[slot];
    if (!it) return;
    if (slot === "mount") this.state.mounted = false;
    if (!stackInto(this.state.bag, it, BAG_MAX)) {
      this.toastMsg("Bag full.");
      return;
    }
    delete this.state.equip[slot];
    this.hooks.onChange();
  }

  usePotion(kind: "hp" | "sp" | "both" = "hp") {
    const pots = this.state.bag
      .map((it) => ({ it, def: itemDef(it.id) }))
      .filter((row): row is { it: ItemInst; def: NonNullable<ReturnType<typeof itemDef>> } => {
        if (!row.def || row.def.kind !== "potion") return false;
        const heal = row.def.heal ?? 0;
        const restore = row.def.restore ?? 0;
        if (kind === "hp") return heal > 0 && restore <= 0;
        if (kind === "sp") return restore > 0 && heal <= 0;
        return heal > 0 && restore > 0;
      });
    pots.sort((a, b) => (b.def.heal ?? 0) + (b.def.restore ?? 0) - ((a.def.heal ?? 0) + (a.def.restore ?? 0)));
    const best = pots[0];
    if (best) this.useUid(best.it.uid);
    else this.toastMsg(kind === "sp" ? "No MP potion." : kind === "both" ? "No HP/MP potion." : "No HP potion.");
  }

  useUid(uid: string) {
    const it = this.state.bag.find((i) => i.uid === uid);
    const d = it ? itemDef(it.id) : undefined;
    if (!it || !d || this.downed) return;
    if (d.id === "yggdrasil-branch") {
      if (!this.nearestCorpse()) {
        this.toastMsg("Stand next to a fallen player first.");
        return;
      }
      this.reviveUid = uid;
      this.toastMsg("Press the fallen player's body to revive them.");
      return;
    }
    if (d.kind === "potion") {
      this.state.hp = Math.min(maxHp(this.state), this.state.hp + (d.heal ?? 0));
      this.state.sp = Math.min(maxSp(this.state), this.state.sp + (d.restore ?? 0));
      if ((it.qty ?? 1) > 1) it.qty = (it.qty ?? 1) - 1;
      else this.state.bag = this.state.bag.filter((i) => i.uid !== uid);
      sfx("potion");
      this.toastMsg(`Used ${d.name}.`);
      logSystem(`Used ${d.name}.`);
      this.hooks.onChange();
      return;
    }
    if (d.id.startsWith("key-")) {
      this.toastMsg("Stand at the locked door and press Talk/Go.");
      return;
    }
    if (d.id === "skin-box") {
      const first = rollMountSkin();
      const second = rollMountSkin();
      if ((it.qty ?? 1) > 1) it.qty = (it.qty ?? 1) - 1;
      else this.state.bag = this.state.bag.filter((i) => i.uid !== uid);
      stackInto(this.state.bag, newItem(first.id), BAG_MAX);
      stackInto(this.state.bag, newItem(second.id), BAG_MAX);
      this.toastMsg(`The box opens: ${first.name} and ${second.name}. Both are bound.`);
      this.hooks.onChange();
      return;
    }
    if (d.id === "talaria") {
      if (this.battleLock > 0) {
        this.toastMsg("can't use while in battle wait 3 seconds");
        return;
      }
      if (this.map.id === "jail" && this.state.jailedUntil > Date.now()) {
        this.toastMsg("The jail will not let the sandals fly.");
        return;
      }
      this.state.bag = this.state.bag.filter((i) => i.uid !== uid);
      sfx("portal");
      this.toastMsg("Talaria carries you back to Midgard.");
      this.enter("midgard", "gate");
      this.hooks.onChange();
    }
  }

  buy(id: string) {
    const d = itemDef(id);
    if (!d || d.price <= 0) return "Not for sale.";
    if (this.state.gold < d.price) return "Not enough gold.";
    if (this.state.bag.length >= BAG_MAX) return "Bag full.";
    this.state.gold -= d.price;
    const added = stackInto(this.state.bag, newItem(id), BAG_MAX);
    if (!added) {
      this.state.gold += d.price;
      return "Bag full.";
    }
    sfx("buy");
    this.hooks.onChange();
    return "";
  }

  sell(uid: string, count = 1) {
    const it = this.state.bag.find((i) => i.uid === uid);
    const d = it ? itemDef(it.id) : undefined;
    if (!it || !d) return "Nothing to sell.";
    if (isBoundItem(it)) return "That is bound. It cannot be sold.";
    const qty = it.qty ?? 1;
    const n = Math.max(1, Math.min(qty, Math.floor(count) || 1));
    const worth = Math.max(1, Math.floor((d.price || 40) * 0.4)) * n;
    this.state.gold += worth;
    if (n < qty) it.qty = qty - n;
    else this.state.bag = this.state.bag.filter((i) => i.uid !== uid);
    sfx("coin");
    this.hooks.onChange();
    return `Sold ${n} ${d.name} for ${worth} gold.`;
  }

  storeItem(uid: string, count = 1) {
    const it = this.state.bag.find((i) => i.uid === uid);
    if (!it) return "";
    const qty = it.qty ?? 1;
    const n = Math.max(1, Math.min(qty, Math.floor(count) || 1));
    const moving = { ...it, uid: crypto.randomUUID(), qty: n };
    if (n < qty) it.qty = qty - n;
    else this.state.bag = this.state.bag.filter((i) => i.uid !== uid);
    if (!stackInto(this.state.storage, moving, BANK_MAX)) {
      stackInto(this.state.bag, moving, BAG_MAX);
      return "Storage is full (100).";
    }
    this.hooks.onChange();
    return "";
  }

  withdrawItem(uid: string, count = 1) {
    const it = this.state.storage.find((i) => i.uid === uid);
    if (!it) return "";
    const qty = it.qty ?? 1;
    const n = Math.max(1, Math.min(qty, Math.floor(count) || 1));
    const moving = { ...it, uid: n < qty ? crypto.randomUUID() : it.uid, qty: n };
    if (!stackInto(this.state.bag, moving, BAG_MAX)) return "Bag full.";
    if (n < qty) it.qty = qty - n;
    else this.state.storage = this.state.storage.filter((i) => i.uid !== uid);
    this.hooks.onChange();
    return "";
  }

  bankGold(amount: number, dir: "in" | "out") {
    const n = Math.floor(amount);
    if (n <= 0) return;
    if (dir === "in" && this.state.gold >= n) {
      this.state.gold -= n;
      this.state.bankGold += n;
    } else if (dir === "out" && this.state.bankGold >= n) {
      this.state.bankGold -= n;
      this.state.gold += n;
    }
    sfx("coin");
    this.hooks.onChange();
  }

  healInn() {
    const cost = 25;
    if (this.state.gold < cost) {
      this.toastMsg("The inn charges 25 gold.");
      return;
    }
    this.state.gold -= cost;
    this.state.hp = maxHp(this.state);
    this.state.sp = maxSp(this.state);
    sfx("potion");
    this.toastMsg("You feel brand new.");
    this.hooks.onChange();
  }

  setStance(s: SaveState["stance"]) {
    this.state.stance = s;
    this.toastMsg(s === "lethal" ? "Lethal — players can be hit." : "Peace — only monsters are struck.");
    this.hooks.onChange();
  }

  removeListed(uid: string) {
    this.state.bag = this.state.bag.filter((i) => i.uid !== uid);
    this.hooks.onChange();
  }

  grantPurchase(item: ItemInst, price: number) {
    if (this.state.gold < price) return false;
    if (!stackInto(this.state.bag, item, BAG_MAX)) return false;
    this.state.gold -= price;
    sfx("buy");
    this.hooks.onChange();
    return true;
  }

  creditGold(n: number) {
    this.state.gold += n;
    this.hooks.onChange();
  }

  giveItems(items: ItemInst[], gold: number) {
    const left: ItemInst[] = [];
    for (const raw of items) {
      const { bag: _bag, ...item } = raw;
      if (!stackInto(this.state.bag, item, BAG_MAX)) left.push(item);
      else this.noteLoot(item);
    }
    if (gold > 0) {
      this.state.gold += gold;
      logSystem(`Picked up ${gold} gold.`);
    }
    sfx("pickup");
    this.hooks.onChange();
    return left;
  }

  markCriminal() {
    if (!this.state.criminal) {
      this.state.criminal = true;
      this.toastMsg("You are a Criminal. Die and you will see the jail.");
      this.hooks.onBranded();
      this.hooks.onChange();
    }
  }

  peerClimb = new Map<string, { y: number; frame: number }>();

  peerClimbFrame(peer: { id: string; y: number }) {
    const prev = this.peerClimb.get(peer.id);
    if (!prev) {
      this.peerClimb.set(peer.id, { y: peer.y, frame: 0 });
      return 0;
    }
    if (Math.abs(peer.y - prev.y) > 0.45) {
      prev.frame += 0.22;
      prev.y = peer.y;
    }
    return Math.floor(prev.frame);
  }

  pose() {
    if (this.downed) return "dead";
    if (this.climbing) return "climb";
    if (this.blockHeld) return "block";
    if (this.duck) return "crouch";
    if (!this.grounded) return "walk";
    if (Math.abs(this.vx) > 15) return "walk";
    return "idle";
  }

  viewZoom() {
    const host = this.canvas.parentElement?.parentElement;
    const screenH = host && host.clientHeight > 40 ? host.clientHeight : this.cssH;
    if (this.map.id === "jail") {
      const fit = Math.min(Math.max(160, this.cssH - 8) / this.map.h, Math.max(160, this.cssW - 8) / this.map.w);
      return Math.max(0.12, Math.min(1.8, fit * this.zoomUser));
    }
    const band = Math.max(160, screenH - 56 - 248);
    const base = Math.min(1, band / WORLD_H);
    return Math.max(0.08, Math.min(1.6, base * this.zoomUser));
  }

  nudgeZoom(dir: number) {
    this.zoomUser = Math.max(0.65, Math.min(1.85, this.zoomUser * (dir > 0 ? 1.12 : 1 / 1.12)));
  }

  /** Heroes stay the same world size as the painted townsfolk, on every map. */
  figureStand() {
    const h = this.map.id === "jail" ? this.map.h : 2200;
    return (92 * h) / 784;
  }

  aimCamera(snap: boolean) {
    const zoom = this.viewZoom();
    const viewW = this.cssW / zoom;
    const viewH = this.cssH / zoom;
    const look = this.facing * (70 / zoom);
    let tx = this.state.x + look - viewW / 2;
    if (viewW >= this.map.w) tx = (this.map.w - viewW) / 2;
    else tx = Math.max(0, Math.min(this.map.w - viewW, tx));
    let ty = this.state.y - viewH * 0.62;
    if (viewH >= this.map.h) ty = this.map.h - viewH;
    else ty = Math.max(-40 / zoom, Math.min(this.map.h - viewH, ty));
    if (this.map.id === "fenrir-pit") {
      const ground = this.map.platforms.find((plat) => !plat.oneWay)?.y ?? this.map.h * 0.9;
      const bottom = ground + 42 / zoom;
      ty = Math.min(ty, bottom - viewH);
    }
    if (this.map.id === "midgard" && this.state.y > this.map.h * 0.4) {
      const peek = 150;
      const minTy = this.state.y - viewH + 120 / zoom;
      const maxTy = this.state.y - 80 / zoom;
      ty = Math.max(minTy, Math.min(maxTy, peek));
    }
    if (snap || Math.abs(zoom - this.lastZoom) > 0.04) {
      this.camX = tx;
      this.camY = ty;
    } else {
      this.camX += (tx - this.camX) * 0.12;
      this.camY += (ty - this.camY) * 0.12;
    }
    this.lastZoom = zoom;
    return zoom;
  }

  draw() {
    const ctx = this.ctx;
    const zoom = this.aimCamera(false);
    const sx = (Math.random() - 0.5) * this.shake * 14;
    const sy = (Math.random() - 0.5) * this.shake * 14;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.fillStyle = "#140e18";
    ctx.fillRect(0, 0, this.cssW, this.cssH);
    ctx.setTransform(
      this.dpr * zoom,
      0,
      0,
      this.dpr * zoom,
      (-this.camX * zoom + sx) * this.dpr,
      (-this.camY * zoom + sy) * this.dpr,
    );
    this.drawWorld(ctx);
    if (this.map.id === "jail" && this.state.jailedUntil > Date.now()) {
      const left = this.state.jailedUntil - Date.now();
      const mins = Math.floor(left / 60000);
      const secs = Math.floor((left % 60000) / 1000);
      ctx.save();
      ctx.fillStyle = "#1a120c";
      ctx.fillRect(this.map.w / 2 - 150, this.map.h * 0.175, 300, 42);
      ctx.fillStyle = "#f3e6c8";
      ctx.font = "700 28px Cinzel, serif";
      ctx.textAlign = "center";
      ctx.fillText(`Sentence ${mins}:${String(secs).padStart(2, "0")}`, this.map.w / 2, this.map.h * 0.175 + 28);
      ctx.restore();
    }
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.drawToast(ctx);
  }

  drawWorld(ctx: CanvasRenderingContext2D) {
    const arena = this.map.id === "ffa" || this.map.id === "ffa-ultra";
    if (arena && this.map.bg && backgrounds.has(this.map.bg)) {
      const img = backgrounds.get(this.map.bg)!;
      const tileW = Math.max(200, this.map.h * (img.width / img.height));
      for (let x = 0; x < this.map.w; x += tileW - 1) ctx.drawImage(img, x, 0, tileW, this.map.h);
    } else if (arena) this.drawColiseum(ctx);
    else if (this.map.bg && backgrounds.has(this.map.bg)) {
      const img = backgrounds.get(this.map.bg)!;
      if (this.map.h > WORLD_H + 80 || this.map.w > 4200) {
        for (let y = 0; y < this.map.h; y += WORLD_H - 1) {
          for (let x = 0; x < this.map.w; x += 4000 - 1) {
            ctx.drawImage(img, x, y, Math.min(4000, this.map.w - x), Math.min(WORLD_H, this.map.h - y));
          }
        }
      } else ctx.drawImage(img, 0, 0, this.map.w, this.map.h);
    } else if (this.map.id === "jail") {
      ctx.fillStyle = "#6d6a66";
      ctx.fillRect(0, 0, this.map.w, this.map.h);
      ctx.strokeStyle = "#2a2a2a";
      ctx.lineWidth = 8;
      for (let x = 120; x < 980; x += 46) {
        ctx.beginPath();
        ctx.moveTo(x, 40);
        ctx.lineTo(x, 560);
        ctx.stroke();
      }
      ctx.fillStyle = "#8a8680";
      ctx.fillRect(0, 540, this.map.w, 180);
    } else {
      ctx.fillStyle = "#1b2430";
      ctx.fillRect(0, 0, this.map.w, this.map.h);
    }
    if (this.map.id === "ffa") {
      const ground = this.map.platforms.find((plat) => !plat.oneWay)?.y ?? this.map.h * 0.9;
      const sky = ground - WORLD_H * 0.78;
      const g = ctx.createLinearGradient(0, 0, 0, sky + WORLD_H * 0.2);
      g.addColorStop(0, "#8ecfff");
      g.addColorStop(0.35, "#d7f0ff");
      g.addColorStop(0.72, "#fff1cf");
      g.addColorStop(1, "rgba(255, 236, 200, 0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, this.map.w, sky);
    }
    for (const rope of this.map.ropes) this.drawRope(ctx, rope);
    const z = this.viewZoom();
    for (const plat of this.map.platforms) this.drawPlatform(ctx, plat, z);
    this.drawLeftReturn(ctx);
    for (const g of this.map.gates) this.drawGate(ctx, g);
    if (this.map.id === "midgard") {
      ctx.save();
      ctx.translate(CITY_PIPE.x, CITY_PIPE.foot);
      ctx.scale(1.9, 1);
      drawExtra(ctx, "pipe", 0, 0, 240);
      ctx.restore();
    }

    for (const puddle of this.puddles) this.drawPuddle(ctx, puddle);
    for (const d of this.drops) this.drawLoot(ctx, d);

    for (const m of this.mobs) {
      const fading = m.dead > 3.1;
      const hidden = m.dead > 1.5 && m.dead <= 3.1;
      const ghost = m.dead > 0 && m.dead <= 1.5;
      if (hidden) continue;
      const def = MONSTERS[m.kind];
      ctx.save();
      if (fading) ctx.globalAlpha = Math.max(0, (m.dead - 3.1) / 1.5);
      else if (ghost) ctx.globalAlpha = 0.28 + Math.sin(performance.now() / 120) * 0.08;
      const sparkT = (Math.sin(m.anim * 1.4) + 1) / 2;
      const nidKey = def.sprite === "rockface" ? "rock" : def.sprite === "spider" ? `spider.${m.vy < -30 ? 1 : 0}` : "";
      const drewNid = nidKey ? drawNid(ctx, nidKey, def.sprite === "rockface" ? 1 : m.facing, m.x, m.y, def.h / z, def.sprite === "rockface" ? m.spin : 0) : false;
      if (def.sprite === "spark") {
        ctx.save();
        ctx.globalAlpha *= 1 - sparkT;
        drawNid(ctx, "spark.0", m.facing, m.x, m.y, def.h / z);
        ctx.globalAlpha = (ghost || fading ? ctx.globalAlpha : 1) * sparkT;
        if (ghost) ctx.globalAlpha *= 0.35;
        drawNid(ctx, "spark.1", m.facing, m.x, m.y, def.h / z * (991 / 689));
        ctx.restore();
      }
      const side = m.facing < 0 ? "l" : "r";
      const jotKey =
        def.sprite === "seal" || def.sprite === "yeti"
          ? `${def.sprite}.${side}.${Math.floor(m.anim) % 4}`
          : def.sprite === "snow"
            ? `snow.${Math.floor(m.anim / 2) % 4}`
            : "";
      const drewJot = jotKey ? drawJot(ctx, jotKey, m.x, m.y, def.h / z) : false;
      const vanFrame =
        def.sprite === "fawn"
          ? [0, 4, 1, 2, 5, 3][Math.floor(m.anim * 0.55) % 6]!
          : Math.floor(m.anim * 0.45) % 4;
      const vanKey = def.sprite === "fawn" || def.sprite === "gnome" || def.sprite === "fairy" ? `${def.sprite}.${vanFrame}` : "";
      const drewVan = vanKey ? drawVan(ctx, vanKey, m.facing < 0, m.x, m.y, def.h / z) : false;
      const niflFrame =
        def.sprite === "wolf" ? (m.vy < -40 ? 2 : m.vy > 40 ? 3 : Math.floor(m.anim * 0.35) % 2) : Math.floor(m.anim * (def.sprite === "serpent" ? 0.4 : 0.7)) % 4;
      const niflKey = def.sprite === "serpent" || def.sprite === "wolf" || def.sprite === "demon" ? `${def.sprite}.${niflFrame}` : "";
      const drewNifl = niflKey ? drawNifl(ctx, niflKey, m.facing < 0, m.x, m.y, def.h / z) : false;
      if (!drewNid && !drewJot && !drewVan && !drewNifl && def.sprite !== "spark") drawFrame(ctx, this.atlas, mobFrame(def.sprite, m.facing, Math.floor(m.anim)), m.x, m.y, def.h / z);
      ctx.restore();
      if (m.hp < m.max && m.dead <= 0) this.bar(ctx, m.x, m.y - def.h - 10, 36, m.hp / m.max, "#d64545");
    }

    for (const b of this.bosses) {
      const def = BOSSES[b.id];
      const frame = b.state === "swing" || b.state === "shoot" || b.state === "charge" ? Math.floor(b.anim) : 0;
      const laufeyFrame = b.state === "swing" ? Math.min(3, Math.floor((1 - Math.max(0, b.timer) / 0.8) * 4)) : !b.grounded || b.state === "jump" ? 0 : 3;
      const elfFrame = b.state === "swing" ? (b.timer > 0.28 ? 1 : 2) : b.state === "shoot" ? 1 : !b.grounded || b.state === "jump" ? 3 : 0;
      const helaFrame = b.fallen ? 0 : b.state === "charge" ? 3 : b.state === "swing" ? (b.timer > 0.35 ? 1 : 2) : 0;
      let godFrame = !b.grounded || b.state === "jump" ? 3 : b.state === "shoot" ? 2 : b.state === "swing" ? (b.timer > 0.28 ? 1 : 2) : 0;
      if (b.id === "skadi") godFrame = !b.grounded || b.state === "jump" ? 1 : b.state === "shoot" ? 3 : b.state === "swing" ? 2 : 0;
      if (b.id === "valkyrie") godFrame = b.fallen || b.state === "charge" ? 3 : b.state === "swing" ? (b.timer > 0.35 ? 1 : 2) : b.state === "shoot" ? 2 : 0;
      const drewLaufey = b.id === "thrym" && drawJot(ctx, `laufey.${b.facing < 0 ? "l" : "r"}.${laufeyFrame}`, b.x, b.y + (def.h / z) * 0.08, def.h / z);
      const drewElf = (b.id === "grove" || b.id === "freyja2") && drawVan(ctx, `elf.${elfFrame}`, b.facing < 0, b.x, b.y, def.h / z);
      const drewHela = (b.id === "nidhogg" || b.id === "hela2" || b.id === "ultrahela") && drawNifl(ctx, `hela.${helaFrame}`, b.facing < 0, b.x, b.y, def.h / z);
      const sideBoss = b.facing < 0 ? "l" : "r";
      const brokkFrame = b.state === "swing" || b.state === "shoot" || b.state === "flame" ? Math.min(3, Math.floor(Math.abs(b.anim)) % 4) : b.state === "jump" || !b.grounded ? 1 : 0;
      const drewDwarf = b.id === "brokk" && drawExtra(ctx, `brokk.${sideBoss}.${brokkFrame}`, b.x, b.y, def.h / z, false);
      const terrorFrame = b.state === "swing" ? Math.min(3, Math.floor(Math.abs(b.anim)) % 4) : 1;
      const drewTerror = b.id === "terror" && drawExtra(ctx, `terror.${sideBoss}.${terrorFrame}`, b.x, b.y, def.h / z, false);
      const melee = b.id === "surtur" || b.id === "baphomet";
      const span = b.state === "swing" ? (melee ? 1.75 : 0.55) : 0.45;
      const pose = melee && (b.state === "swing" || b.state === "shoot")
        ? Math.min(3, Math.floor((1 - Math.max(0, Math.min(span, b.timer)) / span) * 4))
        : b.state === "swing" || b.state === "shoot"
          ? Math.min(3, Math.floor(b.anim) % 4)
          : b.state === "jump"
            ? 1
            : 0;
      const drewSurtur = b.id === "surtur" && drawBossArt(ctx, `surtur.${sideBoss}.${pose}`, b.x, b.y, def.h / z, 400);
      const drewGoat = b.id === "baphomet" && drawBossArt(ctx, `baphomet.${sideBoss}.${pose}`, b.x, b.y, def.h / z, 330);
      const skadiSide = b.facing < 0 ? "l" : "r";
      const skadiSpan = 0.84;
      const skadiFrame = b.state === "swing" || b.state === "shoot" ? Math.min(3, Math.floor((1 - Math.max(0, Math.min(skadiSpan, b.timer)) / skadiSpan) * 4)) : 0;
      const skadiKey = b.state === "swing" ? `skadi.axe.${skadiSide}.${skadiFrame}` : `skadi.bow.${skadiSide}.${skadiFrame}`;
      const drewSkadi = b.id === "skadi" && drawExtra(ctx, skadiKey, b.x, b.y, def.h / z, false);
      const drewMimir = b.id === "mimir" && this.drawMimir(ctx, b, z);
      const sky = b.id.startsWith("sky");
      const godId = sky ? "valkyrie" : b.id;
      const drewGod = !drewSkadi && (GODS.has(b.id) || b.id === "valkyrie" || sky) && drawAsg(ctx, `${godId}.${godFrame}`, b.facing < 0, b.x, b.y, def.h / z);
      const drewFenrir = b.id === "fenrir" && this.drawFenrir(ctx, b, z);
      const drewSerpent = b.id === "jormungand" && this.drawSerpent(ctx, b, z);
      const drewOdin = b.id === "odin" && this.drawOdin(ctx, b, z);
      if (!drewDwarf && !drewTerror && !drewLaufey && !drewElf && !drewHela && !drewGod && !drewSkadi && !drewSurtur && !drewGoat && !drewMimir && !drewFenrir && !drewSerpent && !drewOdin) drawFrame(ctx, this.atlas, bossFrame(def.sprite, b.facing, frame), b.x, b.y, def.h / z);
      if (b.fallen) ctx.globalAlpha = 0.85;
      ctx.fillStyle = "#f3e6c8";
      ctx.fillStyle = "#f3e6c8";
      ctx.font = `${Math.round(14 / z)}px Cinzel, serif`;
      ctx.textAlign = "center";
      ctx.fillText(b.fallen ? `${def.name} rests` : def.name, b.x, b.y - def.h / z - 8);
      ctx.globalAlpha = 1;
    }

    if (this.map.id === "nidavellir-nightmare" && this.bossUp.brokk === false) {
      const ky = this.map.platforms.find((p) => !p.oneWay)?.y ?? this.map.h * 0.9;
      drawNid(ctx, "dwarf.dark", -1, this.map.w - 280, ky, 90 / z);
    }

    const stand = this.figureStand();
    const blockStep = Math.floor(performance.now() / 180) % 2;
    for (const peer of this.peers) {
      const blocking = peer.pose === "block";
      const action = peer.pose === "dead" ? "dead" : peer.pose === "climb" ? "climb" : peer.pose === "crouch" ? "crouch" : "walk";
      const peerH = blocking ? (blockStep ? stand * 0.94 : stand) : action === "crouch" ? stand * 0.625 : stand;
      const drew =
        peer.hero !== "yeti" &&
        blocking &&
        drawBlock(ctx, peer.hero, peer.facing, blockStep, peer.x, peer.y, peerH);
      if (peer.hero === "yeti") {
        const peerIdle = action !== "climb" && action !== "dead" && action !== "crouch";
        drawYetiHero(ctx, peer.facing, action === "climb" ? this.peerClimbFrame(peer) : peerIdle ? 1 : Math.floor(this.anim), peer.x, peer.y, peerH);
      } else if (!drew) {
        drawActor(ctx, this.atlas, heroFrame(peer.hero, action, peer.facing, action === "climb" ? this.peerClimbFrame(peer) : Math.floor(this.anim)), peer.x, peer.y, peerH);
      }
      this.nameplate(ctx, peer.x, peer.y - peerH - 12 / z, peer.name, peer.criminal);
    }

    const action = this.pose();
    const blocking = action === "block";
    const heroH = blocking ? (blockStep ? stand * 0.94 : stand) : action === "crouch" ? stand * 0.625 : stand;
    const frameKey =
      action === "dead"
        ? heroFrame(this.state.hero, "dead", this.facing, 3)
        : action === "climb"
          ? heroFrame(this.state.hero, "climb", this.facing, Math.floor(this.climbFrame))
          : action === "crouch"
            ? heroFrame(this.state.hero, "crouch", this.facing, Math.floor(this.anim))
            : heroFrame(this.state.hero, "walk", this.facing, Math.abs(this.vx) > 15 || !this.grounded ? Math.floor(this.anim) : 1);
    ctx.save();
    if (!this.downed && this.iframe > 0 && Math.floor(this.iframe * 20) % 2 === 0) ctx.globalAlpha = 0.55;
    if (this.state.mounted && this.state.equip.mount) this.drawRider(ctx, stand, heroH, frameKey);
    else if (this.state.hero === "yeti") {
      const idle = action !== "climb" && action !== "dead" && this.grounded && Math.abs(this.vx) <= 15;
      const frame = action === "climb" ? this.climbFrame : action === "dead" ? 0 : idle ? 1 : Math.floor(this.anim);
      drawYetiHero(ctx, this.facing, frame, this.state.x, this.state.y, heroH);
    } else {
      const drewBlock = blocking && drawBlock(ctx, this.state.hero, this.facing, blockStep, this.state.x, this.state.y, heroH);
      if (!drewBlock) drawActor(ctx, this.atlas, frameKey, this.state.x, this.state.y, heroH);
    }
    ctx.restore();
    this.nameplate(ctx, this.state.x, this.state.y - heroH - 12 / z, this.state.name, this.state.criminal);
    this.drawBubbles(ctx, z);
    this.drawShocks(ctx);
    this.drawLevelUp(ctx, z);

    for (const p of this.projs) {
      ctx.save();
      ctx.translate(p.x, p.y);
      if (p.proj === "crescent") {
        ctx.rotate(performance.now() / 70);
        ctx.fillStyle = "#fff4c2";
        ctx.strokeStyle = "#ffe27a";
        ctx.lineWidth = 2 / z;
        ctx.beginPath();
        ctx.arc(0, 0, 16 / z, 0.5, Math.PI - 0.15);
        ctx.arc(0, 0, 8 / z, Math.PI - 0.15, 0.5, true);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else if (p.proj === "comet" || p.proj === "acid") {
        this.drawShot(ctx, p.proj, z, Math.atan2(p.vy, p.vx));
      } else if (p.proj === "terrorhammer") {
        ctx.rotate(Math.atan2(p.vy, p.vx));
        if (!drawExtraCentered(ctx, "terror-hammer", 0, 0, 30 / z)) this.drawTerrorHammer(ctx, z);
      } else if ((p.proj === "thorhammer" || p.proj === "hammer") && p.from === "boss") {
        ctx.rotate(Math.atan2(p.vy, p.vx));
        drawExtraCentered(ctx, "mount-hammer", 0, 0, 22 / z);
      } else if (p.proj === "odinblast") {
        this.drawOdinBlast(ctx, z, p.vx);
      } else if (p.proj === "serpentfire") {
        this.drawMouthFire(ctx, 0, 0, p.vx >= 0 ? 1 : -1, 90 / z);
      } else if (p.proj === "wave" || p.proj === "tornado" || p.proj === "arrow" || p.proj === "spear" || p.proj === "hammer" || p.proj === "pfire" || p.proj === "icicle" || p.proj === "star") {
        this.drawShot(ctx, p.proj, z, Math.atan2(p.vy, p.vx));
      } else {
        if (p.proj === "boomerang") ctx.rotate(performance.now() / 80);
        else ctx.rotate(Math.atan2(p.vy, p.vx));
        drawFrame(ctx, this.atlas, `proj.${p.proj}`, 0, 8, 28 / z);
      }
      ctx.restore();
    }

    for (const f of this.floaters) {
      ctx.globalAlpha = Math.max(0, f.life);
      ctx.fillStyle = f.color;
      ctx.font = `800 ${Math.round(16 / z)}px Nunito, sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText(f.text, f.x, f.y);
      ctx.globalAlpha = 1;
    }
  }

  drawGate(ctx: CanvasRenderingContext2D, gate: { x: number; y: number; to: string; label: string; key?: string; door?: string; secret?: boolean; back?: boolean; dwarf?: boolean; fenrir?: boolean; boat?: boolean }) {
    if (this.map.id === "serpent-barge" && gate.back) {
      drawExtra(ctx, "reaper", gate.x, gate.y, 220);
      return;
    }
    if (gate.secret && !this.secretReady()) return;
    if (gate.dwarf && this.bossUp.brokk !== false) return;
    if (gate.fenrir && this.bossUp.tyr !== false) return;
    if (gate.boat && this.bossUp.nidhogg !== false) return;
    if (gate.key || gate.secret || gate.fenrir || gate.dwarf || (gate.back && this.map.theme === "asgard")) {
      const z = this.viewZoom();
      const open = gate.back || gate.secret || this.doorOpen(gate.door);
      const h = 150 / z;
      const w = 86 / z;
      ctx.save();
      ctx.translate(gate.x, gate.y);
      ctx.fillStyle = open ? "rgba(255,220,120,0.35)" : "rgba(40,28,18,0.85)";
      ctx.strokeStyle = open ? "#ffe08a" : "#8a7040";
      ctx.lineWidth = 4 / z;
      ctx.beginPath();
      ctx.moveTo(-w / 2, 0);
      ctx.lineTo(-w / 2, -h);
      ctx.quadraticCurveTo(0, -h - 28 / z, w / 2, -h);
      ctx.lineTo(w / 2, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      if (open) {
        ctx.globalAlpha = 0.55 + Math.sin(performance.now() / 180) * 0.2;
        ctx.fillStyle = "#fff6c8";
        ctx.fillRect(-w * 0.18, -h * 0.72, w * 0.36, h * 0.5);
        ctx.globalAlpha = 1;
      }
      ctx.fillStyle = "#f3e6c8";
      ctx.font = `700 ${Math.round(13 / z)}px Cinzel, serif`;
      ctx.textAlign = "center";
      ctx.fillText(gate.label, 0, -h - 16 / z);
      ctx.restore();
      return;
    }
    this.drawPortal(ctx, gate);
  }

  drawLeftReturn(ctx: CanvasRenderingContext2D) {
    if (this.map.theme !== "niflheim" && this.map.theme !== "asgard") return;
    if (!this.map.left) return;
    const src = this.map.theme === "niflheim" ? PORTAL_ART.niflheim : PORTAL_ART.asgard;
    const img = src ? portals.get(src) : undefined;
    if (!img?.complete) return;
    const ground = this.map.platforms.find((plat) => !plat.oneWay)?.y ?? this.map.h * 0.9;
    const h = this.map.h * 0.46;
    const w = h * (img.naturalWidth / Math.max(1, img.naturalHeight));
    ctx.drawImage(img, 6, ground - h, w, h);
  }

  drawPortal(ctx: CanvasRenderingContext2D, gate: { x: number; y: number; to: string; label: string; boat?: boolean }) {
    if (this.map.id === "jail" || gate.to === "jail") return;
    const src = portalSrc(gate.to, gate.boat);
    const img = src ? portals.get(src) : undefined;
    const z = this.viewZoom();
    const color =
      gate.to.startsWith("forest") ? "#7dcea0" :
      gate.to.startsWith("nidavellir") ? "#d2a15a" :
      gate.to.startsWith("jotunheim") ? "#b9e4ff" :
      gate.to.startsWith("vanaheim") ? "#d7c07a" :
      gate.to.startsWith("fire") ? "#ff7828" :
      gate.to.startsWith("niflheim") ? "#8dff6a" :
      gate.to.startsWith("asgard") ? "#ffe08a" :
      "#c084fc";
    const detailed = (this.map.theme === "asgard" || this.map.theme === "niflheim") && gate.x < 560;
    const h = gate.boat ? this.map.h * 0.32 : detailed ? this.map.h * 0.46 : (112 * this.map.h) / 784;
    const w = img ? h * (img.naturalWidth / img.naturalHeight) : h * 0.72;
    if (img) ctx.drawImage(img, gate.x - w / 2, gate.y - h, w, h);
    else {
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      ctx.ellipse(gate.x, gate.y - h * 0.46, w * 0.36, h * 0.46, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = "#f3e6c8";
      ctx.lineWidth = 4 / z;
      ctx.stroke();
    }
  }

  drawShot(ctx: CanvasRenderingContext2D, kind: string, z: number, angle: number) {
    ctx.save();
    ctx.rotate(kind === "star" || kind === "tornado" ? performance.now() / 90 : angle);
    ctx.lineWidth = 2 / z;
    if (kind === "wave") {
      ctx.strokeStyle = "#ffe27a";
      ctx.fillStyle = "rgba(255,226,122,0.85)";
      ctx.beginPath();
      ctx.arc(0, 0, 18 / z, 0.4, Math.PI - 0.2);
      ctx.arc(0, 0, 8 / z, Math.PI - 0.2, 0.4, true);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (kind === "tornado") {
      ctx.strokeStyle = "#d7ecff";
      ctx.beginPath();
      ctx.ellipse(0, 0, 16 / z, 8 / z, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(0, -8 / z, 10 / z, 5 / z, 0, 0, Math.PI * 2);
      ctx.stroke();
    } else if (kind === "arrow") {
      if (!drawExtraCentered(ctx, "skadi-arrow", 0, 0, 86 / z)) {
        ctx.fillStyle = "#c9854a";
        ctx.beginPath();
        ctx.moveTo(48 / z, 0);
        ctx.lineTo(-22 / z, 7 / z);
        ctx.lineTo(-12 / z, 0);
        ctx.lineTo(-22 / z, -7 / z);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#d9e2ea";
        ctx.beginPath();
        ctx.moveTo(48 / z, 0);
        ctx.lineTo(28 / z, 8 / z);
        ctx.lineTo(28 / z, -8 / z);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#c4272f";
        ctx.beginPath();
        ctx.moveTo(-22 / z, 0);
        ctx.lineTo(-40 / z, 12 / z);
        ctx.lineTo(-18 / z, 2 / z);
        ctx.closePath();
        ctx.fill();
      }
    } else if (kind === "spear" || kind === "icicle") {
      const len = 16;
      ctx.fillStyle = kind === "icicle" ? "#b9e8ff" : kind === "spear" ? "#f2e2b0" : "#e8d8a8";
      ctx.beginPath();
      ctx.moveTo(len / z, 0);
      ctx.lineTo(-14 / z, 5 / z);
      ctx.lineTo(-8 / z, 0);
      ctx.lineTo(-14 / z, -5 / z);
      ctx.closePath();
      ctx.fill();
    } else if (kind === "comet") {
      const grd = ctx.createLinearGradient(-28 / z, 0, 14 / z, 0);
      grd.addColorStop(0, "rgba(180,220,255,0)");
      grd.addColorStop(0.45, "rgba(210,235,255,0.85)");
      grd.addColorStop(1, "#ffffff");
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.moveTo(16 / z, 0);
      ctx.lineTo(-30 / z, 7 / z);
      ctx.lineTo(-18 / z, 0);
      ctx.lineTo(-30 / z, -7 / z);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#d7ecff";
      ctx.beginPath();
      ctx.arc(8 / z, 0, 7 / z, 0, Math.PI * 2);
      ctx.fill();
    } else if (kind === "acid") {
      ctx.fillStyle = "#39d36a";
      ctx.beginPath();
      ctx.arc(0, 0, 11 / z, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#b6ff7a";
      ctx.beginPath();
      ctx.arc(-3 / z, -3 / z, 3 / z, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#6b3a1a";
      ctx.lineWidth = 2 / z;
      ctx.beginPath();
      ctx.moveTo(-9 / z, -6 / z);
      ctx.lineTo(9 / z, 6 / z);
      ctx.moveTo(-9 / z, 6 / z);
      ctx.lineTo(9 / z, -6 / z);
      ctx.stroke();
    } else if (kind === "hammer") {
      if (!drawExtra(ctx, "hammer", 0, 8 / z, 36 / z)) {
        ctx.fillStyle = "#d7dde6";
        ctx.fillRect(-16 / z, -10 / z, 22 / z, 14 / z);
        ctx.fillStyle = "#8a5a32";
        ctx.fillRect(-4 / z, -2 / z, 8 / z, 22 / z);
      }
    } else if (kind === "pfire" || kind === "flame") {
      const hot = kind === "flame";
      ctx.fillStyle = hot ? "#ff4a1a" : "#ff9a2e";
      ctx.beginPath();
      ctx.ellipse(0, 0, (hot ? 22 : 12) / z, (hot ? 10 : 12) / z, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffe27a";
      ctx.beginPath();
      ctx.arc(hot ? 6 / z : -2 / z, -1 / z, (hot ? 7 : 6) / z, 0, Math.PI * 2);
      ctx.fill();
    } else if (kind === "star") {
      ctx.fillStyle = "#ffe27a";
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const r = i % 2 === 0 ? 12 / z : 5 / z;
        ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  drawThrowHand(ctx: CanvasRenderingContext2D, heroH: number) {
    const t = 1 - Math.min(1, this.throwAnim / 0.28);
    const stand = heroH;
    const skin =
      this.state.hero === "trizzle" ? "#7dcea0" : this.state.hero === "luna" ? "#f4e2c4" : this.state.hero === "ezekiel" ? "#e7d3b0" : "#f0c197";
    const shoulderX = this.state.x + this.facing * stand * 0.08;
    const shoulderY = this.state.y - stand * 0.62;
    const swing = -1.15 + t * 2.05;
    const len = stand * 0.38;
    const hx = shoulderX + this.facing * Math.cos(swing) * len;
    const hy = shoulderY + Math.sin(swing) * len * 0.55;
    ctx.save();
    ctx.strokeStyle = skin;
    ctx.lineWidth = Math.max(3, stand * 0.06);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(shoulderX, shoulderY);
    ctx.lineTo(hx, hy);
    ctx.stroke();
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.arc(hx, hy, stand * 0.07, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  bossesCleared() {
    const ids = this.roster();
    return ids.length > 0 && ids.every((id) => this.bossUp[id] === false);
  }

  ropeOpen(rope: Rope) {
    return rope.need !== "clear" || !!rope.down || this.bossesCleared();
  }

  buySkinBox() {
    const item = newItem("skin-box");
    if (!stackInto(this.state.bag, item, BAG_MAX)) return "Bag full.";
    this.hooks.onChange();
    return "";
  }

  combineCards(id: string, plus = 0) {
    const def = itemDef(id);
    if (!def || def.kind !== "card") return "That is not a card.";
    if (def.border !== "Red" && def.border !== "Golden Yellow" && id !== "card-ultrahela") return "Ten cards of the same color make one random card of the next color. Red and yellow boss cards upgrade on their own.";
    const same = this.state.bag.filter((it) => it.id === id && itemDef(it.id)?.kind === "card" && (it.plus ?? 0) === plus);
    const total = same.reduce((sum, it) => sum + (it.qty ?? 1), 0);
    if (total < 10) return "Need ten of that exact boss card, all at the same bonus.";
    let left = 10;
    for (const it of same) {
      if (left <= 0) break;
      const qty = it.qty ?? 1;
      const take = Math.min(qty, left);
      it.qty = qty - take;
      left -= take;
    }
    this.state.bag = this.state.bag.filter((it) => (it.qty ?? 1) > 0);
    const fused = newItem(id);
    fused.plus = plus + 1;
    if (!stackInto(this.state.bag, fused, BAG_MAX)) this.state.bag.push(fused);
    this.toastMsg(`${def.name} bonus is now ${formatPlus(plus + 1)} on every stat it gives.`);
    this.hooks.onChange();
    return "";
  }

  fuseBorder(border: string) {
    const next: Record<string, string> = { White: "Green", Green: "Blue", Blue: "Purple" };
    const dest = next[border];
    if (!dest) return "Purple cards have no next tier.";
    const rows = this.state.bag.filter((it) => {
      const d = itemDef(it.id);
      return d?.kind === "card" && d.border === border && it.id !== "card-ultrahela";
    });
    const total = rows.reduce((sum, it) => sum + (it.qty ?? 1), 0);
    if (total < 10) return `Need ten ${border} cards.`;
    let left = 10;
    for (const it of rows) {
      if (left <= 0) break;
      const qty = it.qty ?? 1;
      const take = Math.min(qty, left);
      it.qty = qty - take;
      left -= take;
    }
    this.state.bag = this.state.bag.filter((it) => (it.qty ?? 1) > 0);
    const pool = CATALOG.filter((item) => item.kind === "card" && item.border === dest && item.id !== "card-ultrahela");
    const pick = pool[Math.floor(Math.random() * pool.length)];
    if (!pick) return "No card of the next color.";
    const fused = newItem(pick.id);
    if (!stackInto(this.state.bag, fused, BAG_MAX)) this.state.bag.push(fused);
    this.toastMsg(`Ten ${border} cards become ${pick.name}.`);
    this.hooks.onChange();
    return "";
  }

  drawRider(ctx: CanvasRenderingContext2D, stand: number, heroH: number, frameKey: string) {
    const worn = this.state.equip.mount;
    if (!worn) return;
    const creature = skinRoll(worn.skin) ? worn.skin! : worn.id;
    const hangH = stand * 1.42;
    const overlap = stand * 0.08;
    this.drawMountCreature(ctx, creature, this.state.y - hangH + overlap, stand * 1.55);
    const side = this.facing < 0 ? "l" : "r";
    const frame = Math.floor(performance.now() / 160) % 4;
    const drew = this.state.hero === "yeti"
      ? drawYetiHero(ctx, this.facing, Math.floor(performance.now() / 160), this.state.x, this.state.y, hangH)
      : drawExtra(ctx, `hang.${this.state.hero}.${side}.${frame}`, this.state.x, this.state.y, hangH, false);
    if (!drew) {
      if (this.state.hero === "yeti") drawYetiHero(ctx, this.facing, frame, this.state.x, this.state.y, hangH);
      else drawActor(ctx, this.atlas, frameKey, this.state.x, this.state.y, heroH);
    }
  }

  drawMountCreature(ctx: CanvasRenderingContext2D, key: string, footY: number, height: number) {
    if (key === "mount-eagle") {
      const reduce = typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
      const frame = reduce ? 3 : Math.floor(performance.now() / 80) % 8;
      if (drawExtra(ctx, `eagle.${frame}`, this.state.x, footY, height, this.facing < 0)) return;
    }
    if (key === "skin-dwarf-dragon") {
      const frame = Math.floor((performance.now() * 24) / 1000) % 50;
      const flip = this.facing < 0;
      const drew = drawExtra(ctx, `dragon.${frame}`, this.state.x, footY, height * 1.08, flip)
        || drawExtra(ctx, "skin-dwarf-dragon", this.state.x, footY, height * 1.08, flip);
      ctx.save();
      ctx.strokeStyle = "#ffe14a";
      ctx.lineWidth = Math.max(3, height * 0.018);
      ctx.lineCap = "round";
      const chestY = footY - height * 0.42;
      const lowY = footY - height * 0.02;
      const handY = this.state.y - height * 0.38;
      ctx.beginPath();
      ctx.moveTo(this.state.x + this.facing * height * 0.1, chestY);
      ctx.lineTo(this.state.x + this.facing * height * 0.1, lowY);
      ctx.lineTo(this.state.x, handY);
      ctx.stroke();
      ctx.restore();
      if (drew) return;
    }
    const winged = key !== "mount-wraith" && key !== "skin-hammer" && key !== "skin-cloud";
    const flap = Math.sin(performance.now() / 110);
    ctx.save();
    const skin = this.state.equip.mount?.skin;
    if (!skinRoll(skin)) {
      if (skin === "skin-frost") ctx.filter = "hue-rotate(170deg) saturate(1.2)";
      else if (skin === "skin-royal") ctx.filter = "sepia(0.45) saturate(1.4)";
      else if (skin === "skin-void") ctx.filter = "grayscale(0.85) brightness(0.7)";
      else if (skin === "skin-ember") ctx.filter = "saturate(1.4)";
    }
    const moving = Math.hypot(this.vx, this.vy) > 28;
    if (key === "mount-wraith" && moving) {
      ctx.strokeStyle = "rgba(255,60,60,0.55)";
      ctx.lineWidth = 3;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(this.state.x - this.facing * (18 + i * 14), footY - height * 0.45 + (i - 1) * 8);
        ctx.lineTo(this.state.x - this.facing * (46 + i * 18), footY - height * 0.45 + (i - 1) * 14);
        ctx.stroke();
      }
    }
    ctx.translate(this.state.x, footY - height * 0.45);
    if (winged) {
      ctx.rotate(flap * 0.07 * (this.facing < 0 ? -1 : 1));
      ctx.scale(1 + Math.abs(flap) * 0.04, 0.9 + (flap + 1) * 0.08);
    }
    ctx.translate(-this.state.x, -(footY - height * 0.45));
    const flip = this.facing < 0;
    const drew = drawExtra(ctx, key, this.state.x, footY, height, flip);
    ctx.restore();
    if (drew) return;
    ctx.save();
    ctx.translate(this.state.x, footY - height * 0.45);
    ctx.fillStyle = key.includes("phoenix") ? "#ff6a1a" : key.includes("dragon") ? "#c4492a" : key.includes("wraith") ? "#2a2430" : key.includes("raven") ? "#1a1a1a" : key.includes("demon") ? "#e36ad0" : key.includes("condor") ? "#d9d3c4" : "#8d6a3a";
    ctx.beginPath();
    ctx.ellipse(0, 0, height * 0.42, height * 0.16, winged ? flap * 0.2 : 0, 0, Math.PI * 2);
    ctx.fill();
    if (key.includes("wraith")) {
      ctx.fillStyle = "#ff2a2a";
      ctx.beginPath();
      ctx.arc(-height * 0.08, -height * 0.02, 3, 0, Math.PI * 2);
      ctx.arc(height * 0.08, -height * 0.02, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  updateFenrir(b: BossActor, dt: number) {
    const def = BOSSES.fenrir;
    b.anim += dt * 6;
    b.timer -= dt;
    b.prevY = b.y;
    const home = b.homeX ?? this.map.w * 0.5;
    const leash = this.map.w * 0.42;
    const dx = this.state.x - b.x;
    if (!this.downed && Math.abs(dx) > 20) b.facing = dx >= 0 ? 1 : -1;
    if (b.state === "wait" && b.timer <= 0) {
      b.face = (b.face ?? 0) + 1;
      if ((b.face ?? 0) % 2 === 0) {
        b.state = "shoot";
        b.timer = 0.7;
        const ground = this.map.platforms.find((plat) => !plat.oneWay)?.y ?? b.y;
        const viewH = this.cssH / Math.max(0.2, this.viewZoom());
        const dir = Math.sign(dx) || b.facing || 1;
        this.shocks.push({
          x: b.x + b.facing * 40,
          y: ground,
          r: 170,
          life: 2.4,
          max: 2.4,
          color: "#b06bff",
          dmg: def.touch,
          hit: false,
          kind: "column",
          wide: 180,
          tall: viewH * 0.72,
          vx: dir * Math.max(980, viewH * 0.9),
        });
      } else {
        b.state = "jump";
        b.timer = 0.3;
        b.vy = -980;
        b.vx = Math.max(-420, Math.min(420, dx * 1.3));
        b.grounded = false;
      }
    }
    if (!b.grounded) {
      b.vy += 2200 * dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.x < home - leash) {
        b.x = home - leash;
        b.vx = Math.abs(b.vx);
      }
      if (b.x > home + leash) {
        b.x = home + leash;
        b.vx = -Math.abs(b.vx);
      }
      if (b.vy > 0) {
        for (const plat of this.map.platforms) {
          if (b.x < plat.x || b.x > plat.x + plat.w) continue;
          if (b.prevY <= plat.y && b.y >= plat.y) {
            b.y = plat.y;
            b.vy = 0;
            b.vx = 0;
            b.grounded = true;
            b.state = "wait";
            b.timer = 0.45;
          }
        }
      }
    } else {
      b.x += b.facing * 90 * dt;
      if (b.x < home - leash) b.x = home - leash;
      if (b.x > home + leash) b.x = home + leash;
    }
    if (b.state === "shoot" && b.timer <= 0) {
      b.state = "wait";
      b.timer = 0.4;
    }
    this.bossStompPlayer(b, def.touch);
    this.tryStompBoss(b);
    this.bossTouch(b);
  }

  updateSerpent(b: BossActor, dt: number) {
    const deck = this.map.platforms[0]?.y ?? this.state.y;
    b.anim += dt * 5;
    b.timer -= dt;
    b.prevY = b.y;
    if (b.state === "dive") {
      const sink = this.map.h + 480;
      b.y += (sink - b.y) * Math.min(1, dt * 0.7);
      b.x += b.facing * 40 * dt;
      if (b.timer <= 0) {
        b.state = "rise";
        b.timer = 1.3;
        b.x = 180 + Math.random() * (this.map.w - 360);
        b.y = this.map.h + 80;
      }
    } else if (b.state === "rise") {
      const target = deck - 260;
      b.y += (target - b.y) * Math.min(1, dt * 3);
      if (b.timer <= 0) {
        b.state = "charge";
        b.timer = 2.4;
        b.facing = Math.random() < 0.5 ? -1 : 1;
        b.vx = b.facing * 520;
      }
    } else if (b.state === "charge") {
      b.x += b.vx * dt;
      b.y = deck - 240 + Math.sin(b.anim * 3) * 24;
      if (b.x < 120 || b.x > this.map.w - 120) {
        b.vx *= -1;
        b.facing *= -1;
        b.x = Math.max(120, Math.min(this.map.w - 120, b.x));
      }
      if (b.timer <= 0) {
        b.state = "breath";
        b.timer = 3.15;
        b.didHit = false;
        b.face = 0;
      }
    } else if (b.state === "breath") {
      b.face = (b.face ?? 0) + dt;
      if (b.face >= 0.45) {
        b.face = 0;
        const reach = 1680;
        const ahead = (this.state.x - b.x) * b.facing;
        if (ahead > 30 && ahead < reach && Math.abs(this.state.y - deck) < 160) this.hurtPlayer(Math.round(BOSSES.jormungand.proj * 0.2), "boss");
      }
      if (b.timer <= 0) {
        b.state = "dive";
        b.timer = 2.4;
      }
    } else if (b.state === "bite") {
      if (!b.didHit && Math.abs(this.state.x - b.x) < 160 && Math.abs(this.state.y - deck) < 80) {
        b.didHit = true;
        this.hurtPlayer(BOSSES.jormungand.melee, "boss");
      }
      if (b.timer <= 0) {
        b.state = "dive";
        b.timer = 1.2;
      }
    }
    if (b.state !== "dive") this.bossTouch(b);
    this.tryStompBoss(b);
  }

  updateMimir(b: BossActor, dt: number) {
    const def = BOSSES.mimir;
    b.anim += dt * 4;
    b.timer -= dt;
    b.prevY = b.y;
    const dx = this.state.x - b.x;
    if (Math.abs(dx) > 30) b.facing = dx >= 0 ? 1 : -1;
    if (b.state === "wait" && b.timer <= 0) {
      const roll = Math.random();
      b.face = (b.face ?? 0) + 1;
      if (roll < 0.45) {
        b.state = "stomp";
        b.timer = 0.25;
        b.vy = -760;
        b.vx = Math.max(-280, Math.min(280, dx * 0.8));
        b.grounded = false;
        b.didHit = false;
      } else {
        b.state = "smash";
        b.timer = 0.85;
        b.didHit = false;
        b.vx = 0;
      }
    }
    if (!b.grounded || b.state === "stomp") {
      b.vy += 2000 * dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.vy > 0) {
        for (const plat of this.map.platforms) {
          if (b.x < plat.x || b.x > plat.x + plat.w) continue;
          if (b.prevY <= plat.y && b.y >= plat.y) {
            b.y = plat.y;
            b.vy = 0;
            b.vx = 0;
            b.grounded = true;
            if (!b.didHit && Math.abs(this.state.x - b.x) < 120) {
              b.didHit = true;
              this.hurtPlayer(def.melee, "boss");
            }
            b.state = "wait";
            b.timer = 0.55;
          }
        }
      }
    }
    if (b.state === "smash" && !b.didHit && b.timer < 0.22) {
      b.didHit = true;
      const wide = this.figureStand() * 8;
      this.shocks.push({ x: b.x, y: b.y, r: wide, life: 0.34, max: 0.34, color: "#f0d48a", dmg: def.touch, hit: false, kind: "ground", wide, tall: 190 });
      for (let i = 0; i < 22; i++) {
        const ang = (i / 22) * Math.PI * 2;
        this.sparks.push({
          x: b.x + Math.cos(ang) * 30,
          y: b.y - 8,
          vx: Math.cos(ang) * 340,
          vy: Math.sin(ang) * 120 - 50,
          life: 0.55,
          color: i % 2 ? "#ffe7a1" : "#c9843a",
          size: 6,
        });
      }
    }
    if (b.state === "smash" && b.timer <= 0) {
      b.state = "wait";
      b.timer = 0.6;
    }
    this.tryStompBoss(b);
    if (b.state !== "wait") this.bossTouch(b);
  }

  drawFenrirChain(ctx: CanvasRenderingContext2D, b: BossActor, z: number) {
    const ground = this.map.platforms.find((plat) => !plat.oneWay)?.y ?? b.y;
    const stakeX = this.map.w * 0.5;
    const stakeY = ground;
    const neckX = b.x + b.facing * (70 / z);
    const neckY = b.y - (460 / z) * 0.62;
    const dist = Math.hypot(stakeX - neckX, stakeY - neckY);
    const links = Math.max(14, Math.min(90, Math.round(dist / 38)));
    const slack = Math.max(0, 1100 - dist);
    const sag = Math.min(520, dist * 0.16 + slack * 0.28);
    const swing = Math.sin(performance.now() / 320) * (26 + slack * 0.04) + b.vx * 0.06;
    ctx.save();
    ctx.fillStyle = "#3a322c";
    ctx.fillRect(stakeX - 10, stakeY - 92, 20, 96);
    ctx.fillStyle = "#6e675e";
    ctx.fillRect(stakeX - 6, stakeY - 92, 6, 96);
    ctx.fillStyle = "#2a241c";
    ctx.beginPath();
    ctx.moveTo(stakeX - 28, stakeY - 8);
    ctx.lineTo(stakeX + 28, stakeY - 8);
    ctx.lineTo(stakeX + 16, stakeY + 8);
    ctx.lineTo(stakeX - 16, stakeY + 8);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#8d8478";
    ctx.beginPath();
    ctx.moveTo(stakeX - 26, stakeY - 108);
    ctx.lineTo(stakeX + 30, stakeY - 96);
    ctx.lineTo(stakeX + 10, stakeY - 78);
    ctx.lineTo(stakeX - 34, stakeY - 88);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#1c1610";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.strokeStyle = "#d7c9a4";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(stakeX, stakeY - 96, 12, 0, Math.PI * 2);
    ctx.stroke();
    let prevX = stakeX;
    let prevY = stakeY - 96;
    for (let i = 1; i <= links; i++) {
      const t = i / links;
      const x = stakeX + (neckX - stakeX) * t + Math.sin(Math.PI * t) * swing;
      const y = stakeY - 96 + (neckY - (stakeY - 96)) * t + Math.sin(Math.PI * t) * sag;
      const ang = Math.atan2(y - prevY, x - prevX);
      ctx.save();
      ctx.translate((x + prevX) / 2, (y + prevY) / 2);
      ctx.rotate(ang);
      const flat = i % 2 === 0;
      ctx.lineWidth = flat ? 7 : 5;
      ctx.strokeStyle = flat ? "#c8c2b4" : "#6a6458";
      ctx.beginPath();
      ctx.ellipse(0, 0, flat ? 16 : 8, flat ? 9 : 15, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = "rgba(255,255,255,0.55)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(-3, -3, flat ? 7 : 3, flat ? 3 : 6, 0, Math.PI, 0);
      ctx.stroke();
      ctx.restore();
      prevX = x;
      prevY = y;
    }
    ctx.fillStyle = "#1a120c";
    ctx.beginPath();
    ctx.arc(neckX, neckY, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#e6d7a8";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();
  }

  drawBoatHull(ctx: CanvasRenderingContext2D, x: number, y: number, w: number) {
    const depth = Math.max(180, Math.min(320, w * 0.16));
    const stern = x - 90;
    const prow = x + w + 70;
    const keel = y + depth;
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.28)";
    ctx.beginPath();
    ctx.ellipse(x + w * 0.5, keel + 18, w * 0.46, 28, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(stern + 30, y + 10);
    ctx.quadraticCurveTo(stern - 20, y + depth * 0.55, x + w * 0.16, keel);
    ctx.lineTo(x + w * 0.8, keel);
    ctx.quadraticCurveTo(prow + 30, y + depth * 0.5, x + w - 8, y + 4);
    ctx.lineTo(stern + 30, y + 10);
    ctx.closePath();
    ctx.save();
    ctx.clip();
    const bands = 7;
    for (let i = 0; i < bands; i++) {
      const y0 = y + (depth * i) / bands;
      const y1 = y + (depth * (i + 1)) / bands;
      const g = ctx.createLinearGradient(0, y0, 0, y1);
      const warm = i % 2 === 0;
      g.addColorStop(0, warm ? "#e2b072" : "#c48a48");
      g.addColorStop(0.18, warm ? "#f0d0a0" : "#e2b57a");
      g.addColorStop(0.55, warm ? "#b8743a" : "#8d5528");
      g.addColorStop(1, warm ? "#6b3c18" : "#4e2a12");
      ctx.fillStyle = g;
      ctx.fillRect(stern - 40, y0, prow - stern + 120, y1 - y0 + 2);
      ctx.strokeStyle = "rgba(40,18,8,0.65)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(stern - 20, y1);
      ctx.lineTo(prow + 20, y1);
      ctx.stroke();
      ctx.fillStyle = "#f4e2b0";
      for (let rx = x + 30; rx < x + w - 10; rx += 86) {
        const nx = rx + (i % 2) * 28;
        const ny = (y0 + y1) / 2;
        ctx.beginPath();
        ctx.arc(nx, ny, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#7a5a28";
        ctx.beginPath();
        ctx.arc(nx + 1.4, ny + 1.4, 2.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#f4e2b0";
      }
    }
    ctx.restore();
    ctx.lineWidth = 8;
    ctx.strokeStyle = "#3a2212";
    ctx.stroke();
    ctx.strokeStyle = "#f0d2a0";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(stern + 36, y + 6);
    ctx.lineTo(x + w - 12, y + 2);
    ctx.stroke();
    const shields: Array<[number, string, string]> = [
      [0.12, "#b4332a", "#f2d16a"],
      [0.28, "#2a4e86", "#f4f4f4"],
      [0.44, "#8a2a2a", "#f2d16a"],
      [0.6, "#245c3a", "#f4f4f4"],
      [0.76, "#2a4e86", "#e8c56a"],
    ];
    for (const [t, paint, ring] of shields) {
      const sx = x + w * t;
      ctx.beginPath();
      ctx.arc(sx, y - 8, 28, 0, Math.PI * 2);
      ctx.fillStyle = paint;
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = "#f0d7a4";
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(sx, y - 8, 12, 0, Math.PI * 2);
      ctx.strokeStyle = ring;
      ctx.stroke();
    }
    ctx.fillStyle = "#6a3a18";
    ctx.beginPath();
    ctx.moveTo(x + w - 20, y);
    ctx.quadraticCurveTo(prow + 80, y - 70, prow + 40, y - 130);
    ctx.quadraticCurveTo(prow + 10, y - 80, x + w + 10, y + 20);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#e8c56a";
    ctx.beginPath();
    ctx.ellipse(prow + 18, y - 96, 10, 7, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#1a120c";
    ctx.beginPath();
    ctx.arc(prow + 20, y - 96, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#c23a2a";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(prow + 34, y - 108);
    ctx.quadraticCurveTo(prow + 70, y - 90, prow + 28, y - 78);
    ctx.stroke();
    ctx.restore();
  }

  drawFerryman(ctx: CanvasRenderingContext2D, deckY: number) {
    const guide = this.map.npcs.find((n) => n.shop === "ferry");
    if (!guide) return;
    const h = 380;
    drawExtra(ctx, "reaper-stand", guide.x, guide.y, h);
    const w = h * 1.044;
    const handX = guide.x + (0.46 - 0.5) * w;
    const handY = guide.y - h * 0.46;
    const tipX = guide.x + (0.11 - 0.5) * w;
    const tipY = guide.y - 2;
    const waterY = deckY + 210;
    const endX = tipX + (tipX - handX) * 0.85;
    const endY = waterY;
    ctx.save();
    ctx.lineCap = "round";
    ctx.strokeStyle = "#3a2414";
    ctx.lineWidth = 16;
    ctx.beginPath();
    ctx.moveTo(handX, handY);
    ctx.lineTo(endX, endY);
    ctx.stroke();
    ctx.strokeStyle = "#c89458";
    ctx.lineWidth = 7;
    ctx.stroke();
    ctx.fillStyle = "#d5dbe4";
    ctx.beginPath();
    ctx.moveTo(endX - 8, endY - 10);
    ctx.lineTo(endX + 46, endY + 36);
    ctx.lineTo(endX - 36, endY + 28);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#8d97a6";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = "rgba(180,230,255,0.35)";
    ctx.beginPath();
    ctx.ellipse(endX, endY + 18, 54, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawFenrir(ctx: CanvasRenderingContext2D, b: BossActor, z: number) {
    this.drawFenrirChain(ctx, b, z);
    const leaping = !b.grounded || b.state === "jump";
    const frame = leaping ? Math.min(3, Math.floor((1 - Math.max(0, b.timer) / 0.45) * 4)) : Math.floor(Math.abs(b.anim) * 0.35) % 4;
    const side = b.facing < 0 ? "l" : "r";
    const h = 460 / z;
    if (!drawExtra(ctx, `fenrir.${side}.${frame}`, b.x, b.y, h, false)) {
      drawExtra(ctx, `fenrir.${side}.0`, b.x, b.y, h, false);
    }
    return true;
  }

  drawSerpent(ctx: CanvasRenderingContext2D, b: BossActor, z: number) {
    const deckPlat = this.map.platforms.find((plat) => !plat.oneWay);
    const deck = deckPlat?.y ?? this.map.platforms[0]?.y ?? b.y;
    this.drawSea(ctx, deck);
    if (deckPlat) this.drawBoatHull(ctx, deckPlat.x, deckPlat.y, deckPlat.w);
    for (const plat of this.map.platforms) this.drawPlatform(ctx, plat, z);
    this.drawFerryman(ctx, deck);
    if (b.y < this.map.h - 20) {
      const bite = b.state === "bite";
      const breath = b.state === "breath";
      const frame = breath ? 2 : bite ? 3 : b.state === "rise" ? 0 : Math.floor(Math.abs(b.anim)) % 5;
      const side = b.facing < 0 ? "l" : "r";
      const h = 340 / z;
      if (!drawExtra(ctx, `jorm.${side}.${frame}`, b.x, b.y, h, false)) {
        drawExtra(ctx, `jorm.${frame % 4}`, b.x, b.y, h, b.facing < 0);
      }
      if (breath) this.drawMouthFire(ctx, b.x + b.facing * (80 / z), b.y - 150 / z, b.facing, 980 / z);
    } else {
      ctx.save();
      ctx.fillStyle = "rgba(140, 220, 255, 0.4)";
      ctx.beginPath();
      ctx.ellipse(b.x, deck + 30, 110, 18, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    return true;
  }

  drawSea(ctx: CanvasRenderingContext2D, deck: number) {
    const w = this.map.w;
    const h = this.map.h;
    const g = ctx.createLinearGradient(0, deck, 0, h);
    g.addColorStop(0, "rgba(40, 140, 190, 0.15)");
    g.addColorStop(0.2, "#1a6f9a");
    g.addColorStop(1, "#06324d");
    ctx.fillStyle = g;
    ctx.fillRect(0, deck + 8, w, h - deck);
    ctx.fillStyle = "rgba(190, 240, 255, 0.55)";
    for (let i = 0; i < 18; i++) {
      const x = ((i * 230 + performance.now() / 18) % (w + 80)) - 40;
      ctx.beginPath();
      ctx.ellipse(x, deck + 24 + (i % 3) * 10, 36, 8, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawMouthFire(ctx: CanvasRenderingContext2D, x: number, y: number, dir: number, len: number) {
    const flick = 0.82 + Math.sin(performance.now() / 35) * 0.18;
    ctx.save();
    const g = ctx.createLinearGradient(x, y, x + dir * len, y);
    g.addColorStop(0, "#fffef0");
    g.addColorStop(0.12, "#ffe27a");
    g.addColorStop(0.4, "#ff7a1a");
    g.addColorStop(0.72, "#e23b12");
    g.addColorStop(1, "rgba(80, 8, 0, 0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x, y - 18);
    ctx.quadraticCurveTo(x + dir * len * 0.25, y - 70 * flick, x + dir * len * 0.62, y - 28);
    ctx.quadraticCurveTo(x + dir * len * 0.84, y - 46 * flick, x + dir * len, y - 8);
    ctx.quadraticCurveTo(x + dir * len * 0.78, y + 36 * flick, x + dir * len * 0.4, y + 22);
    ctx.quadraticCurveTo(x + dir * len * 0.2, y + 48, x, y + 16);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 0.75;
    ctx.fillStyle = "#fff6c2";
    ctx.beginPath();
    ctx.moveTo(x, y - 8);
    ctx.quadraticCurveTo(x + dir * len * 0.35, y - 36 * flick, x + dir * len * 0.7, y - 6);
    ctx.quadraticCurveTo(x + dir * len * 0.4, y + 18, x, y + 8);
    ctx.closePath();
    ctx.fill();
    for (let i = 0; i < 10; i++) {
      const px = x + dir * len * (0.12 + i * 0.08);
      const py = y + Math.sin(performance.now() / 40 + i * 1.3) * (8 + (i % 4) * 4);
      ctx.fillStyle = i % 3 === 0 ? "#fffef0" : "#ffb03a";
      ctx.beginPath();
      ctx.ellipse(px, py, 5 + (i % 3) * 2, 3 + (i % 2), dir * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  drawMapFire(ctx: CanvasRenderingContext2D, y: number) {
    const w = this.map.w;
    const flick = 0.8 + Math.sin(performance.now() / 50) * 0.2;
    ctx.save();
    const g = ctx.createLinearGradient(0, y - 40, 0, y + 50);
    g.addColorStop(0, "rgba(255, 246, 200, 0.1)");
    g.addColorStop(0.35, `rgba(255, 120, 20, ${0.75 * flick})`);
    g.addColorStop(1, "rgba(90, 8, 0, 0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, y - 36, w, 90);
    ctx.fillStyle = "#ffe9a0";
    for (let i = 0; i < 28; i++) {
      const x = (i + 0.5) * (w / 28);
      ctx.beginPath();
      ctx.ellipse(x, y - 8 - (i % 4) * 6, 28, 16 * flick, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  drawOdin(ctx: CanvasRenderingContext2D, b: BossActor, z: number) {
    const side = b.facing < 0 ? "l" : "r";
    const attacking = b.state === "swing" || b.state === "shoot";
    let frame = 0;
    if (attacking) {
      const span = b.state === "swing" ? 0.72 : 0.64;
      const t = 1 - Math.max(0, Math.min(1, b.timer / span));
      frame = Math.min(3, Math.floor(t * 4));
    }
    const h = 260 / z;
    if (!drawExtra(ctx, `odin.${side}.${frame}`, b.x, b.y, h, false)) {
      drawExtra(ctx, `odin.${frame % 4}`, b.x, b.y, h, b.facing < 0);
    }
    return true;
  }

  drawBrokkAxe(ctx: CanvasRenderingContext2D, b: BossActor, h: number) {
    const swing = b.state === "flame" ? 0.2 : 1 - Math.max(0, Math.min(1, b.timer / 0.55));
    const ang = (-0.8 + swing * 2.2) * b.facing;
    ctx.save();
    ctx.translate(b.x + b.facing * h * 0.2, b.y - h * 0.55);
    ctx.rotate(ang);
    ctx.fillStyle = "#6b3a1a";
    ctx.fillRect(0, -h * 0.04, h * 0.42 * b.facing, h * 0.08);
    ctx.fillStyle = "#c5ccd6";
    ctx.beginPath();
    ctx.moveTo(h * 0.42 * b.facing, -h * 0.12);
    ctx.lineTo(h * 0.62 * b.facing, 0);
    ctx.lineTo(h * 0.42 * b.facing, h * 0.12);
    ctx.fill();
    ctx.restore();
  }

  drawColiseum(ctx: CanvasRenderingContext2D) {
    const w = this.map.w;
    const h = this.map.h;
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, "#7ea6c8");
    sky.addColorStop(0.35, "#d7c39a");
    sky.addColorStop(1, "#b08958");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#8d8478";
    ctx.fillRect(0, h * 0.06, w, h * 0.16);
    ctx.fillStyle = "#6d675e";
    for (let i = 0; i < 22; i++) ctx.fillRect((i * w) / 22, h * 0.07, w / 22 - 10, h * 0.13);
    ctx.strokeStyle = "#5e6560";
    ctx.lineWidth = 90;
    ctx.beginPath();
    ctx.ellipse(w / 2, h * 0.58, w * 0.48, h * 0.42, 0, Math.PI * 1.05, Math.PI * 1.95);
    ctx.stroke();
    for (let i = 0; i < 16; i++) {
      const t = i / 15;
      const x = w * (0.06 + t * 0.88);
      const archY = h * 0.22 + Math.sin(t * Math.PI) * h * 0.05;
      ctx.fillStyle = "#72786f";
      ctx.fillRect(x, archY, 48, h * 0.46);
      ctx.fillStyle = "#2c312e";
      ctx.beginPath();
      ctx.arc(x + 24, archY + 54, 28, Math.PI, 0);
      ctx.fill();
    }
    ctx.fillStyle = "#c6a56a";
    ctx.beginPath();
    ctx.ellipse(w / 2, h * 0.78, w * 0.42, h * 0.16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#a88852";
    ctx.beginPath();
    ctx.ellipse(w / 2, h * 0.8, w * 0.28, h * 0.08, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  drawMimir(ctx: CanvasRenderingContext2D, b: BossActor, z: number) {
    const attacking = !b.asleep && (b.state === "smash" || b.state === "stomp");
    const frame = Math.min(3, Math.floor(Math.abs(b.anim)) % 4);
    const side = b.facing < 0 ? "l" : "r";
    const key = b.asleep ? "mimir.sleep" : `mimir.${side}.${attacking ? frame : 3}`;
    const h = (b.asleep ? 280 : 340) / z;
    drawExtra(ctx, key, b.x, b.y, h, false);
    return true;
  }

  drawMimirTree(ctx: CanvasRenderingContext2D, b: BossActor, z: number) {
    const trunk = b.x + 150 / z;
    const ground = b.y + 8 / z;
    const crown = ground - 980 / z;
    ctx.save();
    ctx.fillStyle = "#4e3118";
    ctx.beginPath();
    ctx.moveTo(trunk - 34 / z, ground);
    ctx.lineTo(trunk + 46 / z, ground);
    ctx.lineTo(trunk + 28 / z, crown + 280 / z);
    ctx.lineTo(trunk - 18 / z, crown + 280 / z);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#3a2412";
    ctx.lineWidth = 16 / z;
    ctx.beginPath();
    ctx.moveTo(trunk, crown + 320 / z);
    ctx.quadraticCurveTo(trunk - 180 / z, crown + 180 / z, trunk - 240 / z, crown + 40 / z);
    ctx.moveTo(trunk, crown + 300 / z);
    ctx.quadraticCurveTo(trunk + 160 / z, crown + 120 / z, trunk + 220 / z, crown + 10 / z);
    ctx.stroke();
    const puffs: [number, number, number, string][] = [
      [0, 0, 210, "#2f6a28"],
      [-150, 40, 160, "#3e7c32"],
      [140, 30, 170, "#4c8a38"],
      [-40, -90, 150, "#d2de62"],
      [70, -70, 120, "#efe07a"],
      [-90, -20, 110, "#8fba45"],
    ];
    for (const [ox, oy, r, color] of puffs) {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.ellipse(trunk + ox / z, crown + oy / z, r / z, (r * 0.72) / z, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  drawMimirFace(ctx: CanvasRenderingContext2D, b: BossActor, z: number) {
    const mood = (b.face ?? 0) % 3;
    const y = b.y - 150 / z;
    ctx.save();
    ctx.translate(b.x, y);
    ctx.strokeStyle = "#2a1408";
    ctx.fillStyle = mood === 2 ? "#ff5d7a" : "#2a1408";
    ctx.lineWidth = 3 / z;
    ctx.beginPath();
    if (mood === 0) {
      ctx.moveTo(-18 / z, -8 / z);
      ctx.lineTo(-6 / z, -2 / z);
      ctx.moveTo(6 / z, -2 / z);
      ctx.lineTo(18 / z, -8 / z);
    } else if (mood === 1) {
      ctx.arc(0, 4 / z, 8 / z, 0.1, Math.PI - 0.1);
    } else {
      ctx.arc(0, 8 / z, 10 / z, Math.PI + 0.2, -0.2);
    }
    ctx.stroke();
    if (!b.grounded && b.state === "stomp") {
      ctx.strokeStyle = "#6b3a1a";
      ctx.beginPath();
      ctx.moveTo((b.anim % 2 < 1 ? -20 : 16) / z, 80 / z);
      ctx.lineTo((b.anim % 2 < 1 ? -8 : 28) / z, 20 / z);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawMount(ctx: CanvasRenderingContext2D, stand: number) {
    this.drawMountCreature(ctx, this.state.equip.mount?.id ?? "mount-eagle", this.state.y - stand * 0.05, stand * 1.35);
  }

  drawBubbles(ctx: CanvasRenderingContext2D, z: number) {
    ctx.save();
    ctx.textAlign = "center";
    ctx.font = `700 ${Math.round(13 / z)}px Nunito, sans-serif`;
    for (const bubble of this.bubbles) {
      const who = bubble.who === this.myId ? this.state : this.peers.find((p) => p.id === bubble.who);
      if (!who) continue;
      const x = who.x;
      const y = who.y - this.figureStand() - 36 / z;
      const text = bubble.text.length > 42 ? `${bubble.text.slice(0, 40)}…` : bubble.text;
      const w = Math.max(48, text.length * 7) / z;
      const h = 22 / z;
      ctx.globalAlpha = Math.min(1, bubble.life);
      ctx.fillStyle = "rgba(255, 248, 230, 0.94)";
      ctx.strokeStyle = "#2a1408";
      ctx.lineWidth = 2 / z;
      ctx.beginPath();
      ctx.roundRect(x - w / 2, y - h, w, h, 8 / z);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x - 4 / z, y);
      ctx.lineTo(x, y + 7 / z);
      ctx.lineTo(x + 4 / z, y);
      ctx.fill();
      ctx.fillStyle = "#2a1408";
      ctx.fillText(text, x, y - 6 / z);
    }
    ctx.restore();
  }

  drawShocks(ctx: CanvasRenderingContext2D) {
    for (const shock of this.shocks) {
      const t = 1 - shock.life / shock.max;
      if (shock.kind === "bolt") {
        ctx.save();
        ctx.globalAlpha = Math.max(0.25, shock.life / shock.max);
        ctx.translate(shock.x, shock.y);
        ctx.strokeStyle = "#fff6b0";
        ctx.fillStyle = "rgba(255, 225, 70, 0.35)";
        ctx.lineWidth = 4;
        const wide = (shock.wide ?? shock.r) * (0.45 + t * 0.7);
        ctx.beginPath();
        ctx.ellipse(0, -8, wide, 54, 0, 0, Math.PI * 2);
        ctx.fill();
        for (let i = 0; i < 5; i++) {
          const y0 = -30 + i * 14;
          ctx.beginPath();
          ctx.moveTo(-wide * 0.85, y0);
          ctx.lineTo(-wide * 0.2, y0 - 10);
          ctx.lineTo(wide * 0.15, y0 + 8);
          ctx.lineTo(wide * 0.9, y0 - 6);
          ctx.stroke();
        }
        ctx.strokeStyle = "#ffe14a";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
        continue;
      }
      if (shock.kind === "ground") {
        const wide = (shock.wide ?? shock.r) * (0.28 + t * 0.85);
        const thick = (shock.tall ?? 90) * (1.15 - t * 0.35);
        ctx.save();
        ctx.globalAlpha = Math.max(0, shock.life / shock.max);
        ctx.translate(shock.x, shock.y);
        ctx.strokeStyle = shock.color;
        ctx.fillStyle = shock.color;
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.ellipse(0, -6, wide, thick * 0.35, 0, 0, Math.PI * 2);
        ctx.globalAlpha *= 0.35;
        ctx.fill();
        ctx.globalAlpha = Math.max(0, shock.life / shock.max);
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(0, -4, wide * 0.55, thick * 0.22, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
        continue;
      }
      if (shock.kind === "column") {
        const tall = (shock.tall ?? this.map.h * 0.48) * (0.72 + t * 0.28);
        const wide = shock.wide ?? 140;
        const bend = Math.sin(performance.now() / 160) * wide * 0.55;
        ctx.save();
        ctx.globalAlpha = Math.max(0.2, shock.life / shock.max);
        ctx.beginPath();
        ctx.moveTo(shock.x, shock.y);
        ctx.bezierCurveTo(shock.x - wide * 0.8 + bend, shock.y - tall * 0.32, shock.x + wide + bend, shock.y - tall * 0.68, shock.x + bend * 0.25, shock.y - tall);
        ctx.lineCap = "round";
        ctx.lineWidth = wide * 0.95;
        ctx.strokeStyle = "rgba(70, 0, 140, 0.45)";
        ctx.stroke();
        ctx.lineWidth = wide * 0.42;
        ctx.strokeStyle = "#9a3dff";
        ctx.stroke();
        ctx.lineWidth = wide * 0.16;
        ctx.strokeStyle = "#f6e6ff";
        ctx.stroke();
        ctx.strokeStyle = "#ffe27a";
        ctx.lineWidth = 4;
        for (let i = 0; i < 6; i++) {
          const yy = shock.y - (tall * (i + 0.6)) / 6;
          const xx = shock.x + Math.sin(i + performance.now() / 200) * wide * 0.2;
          ctx.beginPath();
          ctx.moveTo(xx - 16, yy);
          ctx.lineTo(xx + (i % 2 ? 28 : -22), yy - 36);
          ctx.stroke();
        }
        ctx.fillStyle = "#d7a6ff";
        ctx.beginPath();
        ctx.arc(shock.x + bend * 0.25, shock.y - tall, wide * 0.28, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        continue;
      }
      const r = shock.r * (0.35 + t * 0.85);
      ctx.save();
      ctx.globalAlpha = Math.max(0, shock.life / shock.max);
      const g = ctx.createRadialGradient(shock.x, shock.y, r * 0.2, shock.x, shock.y, r);
      g.addColorStop(0, "rgba(255,255,255,0.0)");
      g.addColorStop(0.55, shock.color);
      g.addColorStop(1, "rgba(40,0,60,0)");
      ctx.strokeStyle = shock.color;
      ctx.fillStyle = g;
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.arc(shock.x, shock.y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  }

  drawTerrorHammer(ctx: CanvasRenderingContext2D, z: number) {
    const s = 28 / z;
    ctx.save();
    ctx.fillStyle = "#4a2a68";
    ctx.fillRect(-s * 0.12, -s * 0.1, s * 1.1, s * 0.22);
    const g = ctx.createLinearGradient(0, -s, 0, s);
    g.addColorStop(0, "#ffb0ff");
    g.addColorStop(0.4, "#7a2bff");
    g.addColorStop(1, "#2a0848");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(s * 0.7, -s * 0.85);
    ctx.lineTo(s * 1.35, -s * 0.2);
    ctx.lineTo(s * 0.85, s * 0.15);
    ctx.lineTo(s * 0.15, -s * 0.35);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#ffd2ff";
    ctx.lineWidth = 2 / z;
    ctx.stroke();
    ctx.fillStyle = "#ff6a2a";
    ctx.fillRect(s * 0.45, -s * 0.55, s * 0.28, s * 0.18);
    ctx.restore();
  }

  drawOdinBlast(ctx: CanvasRenderingContext2D, z: number, vx: number) {
    const dir = vx >= 0 ? 1 : -1;
    const len = 86 / z;
    ctx.save();
    const g = ctx.createLinearGradient(0, 0, dir * len, 0);
    g.addColorStop(0, "#fffef2");
    g.addColorStop(0.35, "#7ee7ff");
    g.addColorStop(0.7, "#3a6bff");
    g.addColorStop(1, "rgba(20, 10, 80, 0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, -8 / z);
    ctx.quadraticCurveTo(dir * len * 0.5, -22 / z, dir * len, 0);
    ctx.quadraticCurveTo(dir * len * 0.5, 22 / z, 0, 8 / z);
    ctx.fill();
    ctx.restore();
  }

  updatePuddles(dt: number) {
    for (const puddle of this.puddles) {
      puddle.life -= dt;
      puddle.tick -= dt;
      if (puddle.tick > 0) continue;
      const body = this.figureStand();
      const touch = (x: number, y: number) => Math.abs(x - puddle.x) < 150 && y > puddle.y - 36 && y < puddle.y + body * 0.45;
      if (touch(this.state.x, this.state.y) && !this.downed) this.hurtPlayer(puddle.dmg, "acid");
      for (const m of this.mobs) {
        if (m.dead > 0) continue;
        if (touch(m.x, m.y)) this.hurtMob(m, puddle.dmg * 0.55);
      }
      for (const b of this.bosses) {
        if (!b.fallen && touch(b.x, b.y)) this.hurtBoss(b, puddle.dmg * 0.4);
      }
      for (const peer of this.peers) {
        if (touch(peer.x, peer.y)) this.hooks.onPvp?.(peer.id, puddle.dmg);
      }
      puddle.tick = 0.25;
    }
    this.puddles = this.puddles.filter((p) => p.life > 0);
  }

  drawPuddle(ctx: CanvasRenderingContext2D, puddle: { x: number; y: number; life: number }) {
    ctx.save();
    ctx.globalAlpha = Math.min(0.98, 0.72 + puddle.life / 14);
    ctx.fillStyle = "rgba(70, 255, 50, 0.55)";
    ctx.beginPath();
    ctx.ellipse(puddle.x, puddle.y - 4, 128, 42, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#b6ff4a";
    ctx.beginPath();
    ctx.ellipse(puddle.x, puddle.y - 2, 96, 26, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#f4ffb0";
    ctx.globalAlpha *= 0.9;
    ctx.beginPath();
    ctx.ellipse(puddle.x - 22, puddle.y - 8, 28, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawLoot(ctx: CanvasRenderingContext2D, d: GroundDrop) {
    const s = 1 / Math.max(0.2, this.viewZoom());
    const ground = this.dropSpot(d);
    const pouch = d.items.some((it) => it.bag) || d.items.length > 1;
    if (pouch) this.drawPouch(ctx, d.x, ground, s * 1.15);
    else if (d.items.length === 1) {
      const id = d.items[0]!.id;
      const kind = itemDef(id)?.kind;
      const scale = id === "soul-gem" ? 0.38 : kind === "potion" ? 0.52 : kind === "head" || kind === "body" || kind === "legs" ? 0.7 : id.startsWith("key-") ? 0.62 : 1.55;
      this.drawItemIcon(ctx, id, d.x, ground, s * scale);
    }
    if (d.gold > 0) this.drawGoldPile(ctx, d.x + (d.items.length ? 16 * s : 0), ground, s * 0.68);
  }

  drawItemIcon(ctx: CanvasRenderingContext2D, id: string, x: number, y: number, s: number) {
    const icon = itemIcon(id);
    if (icon) {
      const h = 46 * s;
      const w = h * (icon.naturalWidth / icon.naturalHeight);
      ctx.drawImage(icon, x - w / 2, y - h, w, h);
      return;
    }
    const def = itemDef(id);
    const kind = def?.kind ?? "relic";
    const liquid = id.includes("blue") ? "#6ec8ff" : id.includes("violet") ? "#c58bff" : id.includes("gold") ? "#ffe27a" : "#e23b3b";
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.beginPath();
    ctx.ellipse(0, -2 * s, 16 * s, 4 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 1.6 * s;
    ctx.strokeStyle = "#2a1408";
    if (kind === "potion") {
      ctx.fillStyle = "#d7ecf5";
      ctx.fillRect(-3 * s, -28 * s, 6 * s, 8 * s);
      ctx.beginPath();
      ctx.moveTo(-8 * s, -20 * s);
      ctx.lineTo(8 * s, -20 * s);
      ctx.lineTo(10 * s, -6 * s);
      ctx.quadraticCurveTo(0, -2 * s, -10 * s, -6 * s);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = liquid;
      ctx.fillRect(-7 * s, -14 * s, 14 * s, 8 * s);
      ctx.stroke();
    } else if (kind === "weapon") {
      this.drawWeaponIcon(ctx, id, s);
    } else if (kind === "gem") {
      ctx.fillStyle = "#9b6bff";
      ctx.beginPath();
      ctx.moveTo(0, -30 * s);
      ctx.lineTo(10 * s, -16 * s);
      ctx.lineTo(0, -4 * s);
      ctx.lineTo(-10 * s, -16 * s);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (kind === "head") {
      ctx.fillStyle = "#c0c6d4";
      ctx.beginPath();
      ctx.arc(0, -16 * s, 10 * s, Math.PI, 0);
      ctx.lineTo(10 * s, -10 * s);
      ctx.lineTo(-10 * s, -10 * s);
      ctx.fill();
      ctx.stroke();
    } else if (kind === "body") {
      ctx.fillStyle = "#8d5a32";
      ctx.fillRect(-10 * s, -26 * s, 20 * s, 18 * s);
      ctx.strokeRect(-10 * s, -26 * s, 20 * s, 18 * s);
    } else if (kind === "legs") {
      ctx.fillStyle = "#6d7f55";
      ctx.fillRect(-9 * s, -24 * s, 7 * s, 16 * s);
      ctx.fillRect(2 * s, -24 * s, 7 * s, 16 * s);
      ctx.strokeRect(-9 * s, -24 * s, 7 * s, 16 * s);
      ctx.strokeRect(2 * s, -24 * s, 7 * s, 16 * s);
    } else if (kind === "neck") {
      ctx.strokeStyle = "#ffe27a";
      ctx.lineWidth = 3 * s;
      ctx.beginPath();
      ctx.arc(0, -18 * s, 8 * s, Math.PI * 0.15, Math.PI * 0.85);
      ctx.stroke();
      ctx.fillStyle = "#ffe27a";
      ctx.beginPath();
      ctx.arc(0, -10 * s, 3.5 * s, 0, Math.PI * 2);
      ctx.fill();
    } else if (kind === "acc") {
      ctx.strokeStyle = "#e4b15a";
      ctx.lineWidth = 3 * s;
      ctx.beginPath();
      ctx.arc(0, -14 * s, 7 * s, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = "#9b6bff";
      ctx.beginPath();
      ctx.arc(0, -14 * s, 3 * s, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = "#f0d48a";
      ctx.beginPath();
      ctx.arc(0, -14 * s, 8 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }

  drawWeaponIcon(ctx: CanvasRenderingContext2D, id: string, s: number) {
    ctx.lineWidth = 1.6 * s;
    ctx.strokeStyle = "#2a1408";
    if (id.includes("boomerang")) {
      ctx.strokeStyle = "#f0d48a";
      ctx.lineWidth = 4.5 * s;
      ctx.beginPath();
      ctx.arc(0, -16 * s, 14 * s, Math.PI * 0.1, Math.PI * 1.55);
      ctx.stroke();
      ctx.strokeStyle = "#fff6d0";
      ctx.lineWidth = 1.4 * s;
      ctx.beginPath();
      ctx.arc(-2 * s, -16 * s, 8 * s, Math.PI * 0.2, Math.PI * 1.2);
      ctx.stroke();
      return;
    }
    if (id.includes("star")) {
      ctx.fillStyle = id.includes("magic") ? "#ffe27a" : "#e8eef8";
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = -Math.PI / 2 + (i / 8) * Math.PI * 2;
        const r = (i % 2 === 0 ? 14 : 6) * s;
        const px = Math.cos(a) * r;
        const py = -16 * s + Math.sin(a) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      return;
    }
    if (id.includes("fire")) {
      ctx.fillStyle = "#ff7a1a";
      ctx.beginPath();
      ctx.moveTo(0, -32 * s);
      ctx.quadraticCurveTo(12 * s, -18 * s, 8 * s, -8 * s);
      ctx.quadraticCurveTo(4 * s, -14 * s, 0, -6 * s);
      ctx.quadraticCurveTo(-6 * s, -14 * s, -8 * s, -8 * s);
      ctx.quadraticCurveTo(-12 * s, -18 * s, 0, -32 * s);
      ctx.fill();
      ctx.fillStyle = "#ffe27a";
      ctx.beginPath();
      ctx.arc(0, -14 * s, 4 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      return;
    }
    if (id.includes("acid")) {
      ctx.fillStyle = "#d7f5c8";
      ctx.beginPath();
      ctx.moveTo(-5 * s, -28 * s);
      ctx.lineTo(5 * s, -28 * s);
      ctx.lineTo(4 * s, -22 * s);
      ctx.lineTo(-4 * s, -22 * s);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#39d36a";
      ctx.beginPath();
      ctx.moveTo(-9 * s, -20 * s);
      ctx.lineTo(9 * s, -20 * s);
      ctx.quadraticCurveTo(11 * s, -6 * s, 0, -2 * s);
      ctx.quadraticCurveTo(-11 * s, -6 * s, -9 * s, -20 * s);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#e23b3b";
      ctx.fillRect(-2 * s, -18 * s, 8 * s, 2 * s);
      return;
    }
    if (id.includes("comet")) {
      ctx.fillStyle = "#d7ecff";
      ctx.beginPath();
      ctx.moveTo(12 * s, -14 * s);
      ctx.lineTo(-14 * s, -8 * s);
      ctx.lineTo(-6 * s, -14 * s);
      ctx.lineTo(-14 * s, -20 * s);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(8 * s, -14 * s, 6 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      return;
    }
    if (id.includes("ice")) {
      ctx.fillStyle = "#b9e8ff";
      ctx.beginPath();
      ctx.moveTo(0, -32 * s);
      ctx.lineTo(7 * s, -8 * s);
      ctx.lineTo(0, -4 * s);
      ctx.lineTo(-7 * s, -8 * s);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      return;
    }
    if (id.includes("rock")) {
      ctx.fillStyle = "#8d8478";
      ctx.beginPath();
      ctx.moveTo(-10 * s, -10 * s);
      ctx.lineTo(-4 * s, -26 * s);
      ctx.lineTo(8 * s, -24 * s);
      ctx.lineTo(12 * s, -12 * s);
      ctx.lineTo(4 * s, -4 * s);
      ctx.lineTo(-8 * s, -6 * s);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      return;
    }
    if (id.includes("baseball")) {
      ctx.fillStyle = "#f4f4f4";
      ctx.beginPath();
      ctx.arc(0, -14 * s, 10 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = "#c4394a";
      ctx.beginPath();
      ctx.arc(-2 * s, -14 * s, 6 * s, 0.6, 2.2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(2 * s, -14 * s, 6 * s, Math.PI + 0.6, Math.PI + 2.2);
      ctx.stroke();
      return;
    }
    ctx.fillStyle = "#d9dde6";
    ctx.fillRect(-3 * s, -28 * s, 6 * s, 18 * s);
    ctx.fillStyle = "#cfc6b4";
    ctx.beginPath();
    ctx.moveTo(-12 * s, -12 * s);
    ctx.lineTo(12 * s, -12 * s);
    ctx.lineTo(8 * s, -6 * s);
    ctx.lineTo(-8 * s, -6 * s);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  drawPouch(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
    const w = 40 * s;
    const h = 36 * s;
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.beginPath();
    ctx.ellipse(x, y - 2 * s, w * 0.46, 6 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#6b2e0e";
    ctx.beginPath();
    ctx.ellipse(x, y - h * 0.42, w * 0.48, h * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#a85a28";
    ctx.beginPath();
    ctx.ellipse(x - w * 0.1, y - h * 0.5, w * 0.22, h * 0.16, -0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#4a1e08";
    ctx.beginPath();
    ctx.moveTo(x - w * 0.16, y - h * 0.72);
    ctx.quadraticCurveTo(x, y - h * 0.95, x + w * 0.16, y - h * 0.72);
    ctx.quadraticCurveTo(x, y - h * 0.58, x - w * 0.16, y - h * 0.72);
    ctx.fill();
    ctx.strokeStyle = "#f0d48a";
    ctx.lineWidth = Math.max(2, 2.4 * s);
    ctx.beginPath();
    ctx.moveTo(x, y - h * 0.78);
    ctx.quadraticCurveTo(x - w * 0.28, y - h * 1.05, x - w * 0.12, y - h * 0.7);
    ctx.moveTo(x, y - h * 0.78);
    ctx.quadraticCurveTo(x + w * 0.28, y - h * 1.05, x + w * 0.12, y - h * 0.7);
    ctx.stroke();
    ctx.fillStyle = "#f0d48a";
    ctx.beginPath();
    ctx.arc(x, y - h * 0.78, 3.2 * s, 0, Math.PI * 2);
    ctx.fill();
  }

  drawGoldPile(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
    const coins: [number, number, number, number][] = [
      [-11, -4, 7.2, -0.35],
      [10, -3, 7.6, 0.4],
      [-1, -12, 8.1, 0.05],
      [3, -5, 6.4, 0.2],
      [-6, -9, 6.2, -0.15],
      [7, -10, 5.8, 0.55],
      [0, -2, 6.8, 0],
    ];
    ctx.fillStyle = "rgba(0,0,0,0.38)";
    ctx.beginPath();
    ctx.ellipse(x, y - 1 * s, 16 * s, 4.2 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    for (const [ox, oy, r, tilt] of coins) {
      const cx = x + ox * s;
      const cy = y + oy * s;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(tilt);
      ctx.fillStyle = "#6a3e08";
      ctx.beginPath();
      ctx.ellipse(0, 1.2 * s, r * s, r * 0.42 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#c9841c";
      ctx.beginPath();
      ctx.ellipse(0, 0, r * s, r * 0.42 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#ffe7a0";
      ctx.lineWidth = Math.max(0.6, 0.7 * s);
      ctx.beginPath();
      ctx.ellipse(0, -0.4 * s, r * 0.78 * s, r * 0.3 * s, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = "#ffe27a";
      ctx.beginPath();
      ctx.ellipse(0, -0.6 * s, r * 0.62 * s, r * 0.22 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff6c8";
      ctx.beginPath();
      ctx.ellipse(-r * 0.22 * s, -1.1 * s, r * 0.16 * s, r * 0.06 * s, -0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#8a5a10";
      ctx.lineWidth = Math.max(0.5, 0.55 * s);
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.16 * s);
      ctx.lineTo(r * 0.16 * s, 0);
      ctx.lineTo(0, r * 0.16 * s);
      ctx.lineTo(-r * 0.16 * s, 0);
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    }
  }

  drawPlatform(ctx: CanvasRenderingContext2D, plat: Platform, z: number) {
    if (this.map.id === "serpent-barge") {
      const face = (plat.oneWay ? 28 : 44) / z;
      const tile = scenery.get("plank");
      if (tile?.complete && tile.naturalWidth) {
        const tileW = face * (tile.width / tile.height);
        ctx.save();
        ctx.beginPath();
        ctx.rect(plat.x, plat.y, plat.w, face);
        ctx.clip();
        for (let x = plat.x; x < plat.x + plat.w; x += tileW - 0.5) ctx.drawImage(tile, x, plat.y, tileW, face);
        ctx.restore();
      } else {
        ctx.fillStyle = "#8a5a32";
        ctx.fillRect(plat.x, plat.y, plat.w, face);
      }
      ctx.strokeStyle = "#2a160c";
      ctx.lineWidth = 3 / z;
      ctx.strokeRect(plat.x, plat.y, plat.w, face);
      ctx.fillStyle = "rgba(255,226,170,0.55)";
      ctx.fillRect(plat.x, plat.y, plat.w, 6 / z);
      return;
    }
    if (this.map.id === "ffa" || this.map.id === "ffa-ultra") {
      const ultra = this.map.id === "ffa-ultra";
      const cloud = !ultra && plat.oneWay && plat.y < (this.map.platforms.find((p) => !p.oneWay)?.y ?? plat.y) - WORLD_H * 0.7;
      const face = (plat.oneWay ? 28 : 40) / z;
      if (cloud) {
        ctx.save();
        const cx = plat.x + plat.w * 0.5;
        const cy = plat.y - face * 0.15;
        const puffs: [number, number, number, number][] = [
          [cx, cy - face * 0.35, plat.w * 0.22, face * 0.7],
          [cx - plat.w * 0.22, cy - face * 0.1, plat.w * 0.2, face * 0.62],
          [cx + plat.w * 0.22, cy - face * 0.12, plat.w * 0.18, face * 0.58],
          [cx - plat.w * 0.08, cy + face * 0.05, plat.w * 0.28, face * 0.5],
          [cx + plat.w * 0.1, cy + face * 0.02, plat.w * 0.24, face * 0.48],
        ];
        ctx.fillStyle = "rgba(255,255,255,0.96)";
        ctx.beginPath();
        for (const [x, y, rx, ry] of puffs) ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(214, 230, 255, 0.9)";
        ctx.beginPath();
        ctx.ellipse(cx, cy + face * 0.22, plat.w * 0.4, face * 0.28, 0, 0, Math.PI);
        ctx.fill();
        ctx.fillStyle = "rgba(255, 244, 210, 0.55)";
        ctx.beginPath();
        ctx.ellipse(cx - plat.w * 0.08, cy - face * 0.42, plat.w * 0.12, face * 0.22, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        return;
      }
      const top = ultra ? "#c56bff" : "#d9d3c4";
      const mid = ultra ? "#6d3d9a" : "#8d8678";
      const edge = ultra ? "#39c06a" : "#4a453c";
      ctx.fillStyle = mid;
      ctx.fillRect(plat.x, plat.y - face, plat.w, face + (plat.oneWay ? 8 : 18) / z);
      ctx.fillStyle = top;
      ctx.fillRect(plat.x, plat.y - face, plat.w, face * 0.38);
      if (ultra) {
        ctx.fillStyle = "#7dff9a";
        for (let x = plat.x + 8 / z; x < plat.x + plat.w; x += 36 / z) {
          ctx.beginPath();
          ctx.ellipse(x, plat.y - face * 0.2, 8 / z, 5 / z, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.strokeStyle = edge;
      ctx.lineWidth = 2 / z;
      const block = 54 / z;
      for (let x = plat.x; x < plat.x + plat.w; x += block) {
        ctx.strokeRect(x, plat.y - face, Math.min(block, plat.x + plat.w - x), face);
      }
      return;
    }
    const tile = scenery.get(this.map.theme);
    const face = (plat.oneWay ? 20 : 30) / z;
    const top = plat.y - face * 0.28;
    if (!tile) {
      ctx.fillStyle = THEME_LIP[this.map.theme];
      ctx.fillRect(plat.x, plat.y - 5 / z, plat.w, 5 / z);
      return;
    }
    const tileW = face * (tile.width / tile.height);
    ctx.save();
    ctx.beginPath();
    ctx.rect(plat.x, top, plat.w, face);
    ctx.clip();
    for (let x = plat.x; x < plat.x + plat.w; x += tileW - 0.5) {
      ctx.drawImage(tile, x, top, tileW, face);
    }
    ctx.restore();
  }

  drawRope(ctx: CanvasRenderingContext2D, rope: Rope) {
    if (!this.ropeOpen(rope)) return;
    const z = this.viewZoom();
    if (rope.kind === "glow" || rope.kind === "swing") {
      ctx.save();
      ctx.strokeStyle = rope.kind === "swing" ? "#fff4b0" : "#ffe14a";
      ctx.shadowColor = "#ffe14a";
      ctx.shadowBlur = 16;
      ctx.lineWidth = (rope.kind === "swing" ? 7 : 5) / z;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(rope.x, rope.y);
      ctx.lineTo(rope.x, rope.y + rope.h);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = "rgba(255,255,255,0.85)";
      ctx.lineWidth = 2 / z;
      ctx.stroke();
      ctx.restore();
      return;
    }
    const art = rope.kind === "chain" ? chainImg : scenery.get(rope.kind) ?? null;
    if (art) {
      const w = (rope.kind === "vine" ? 46 : rope.kind === "rope" ? 18 : 26) / z;
      const tileH = w * (art.height / art.width);
      ctx.save();
      ctx.beginPath();
      ctx.rect(rope.x - w / 2, rope.y, w, rope.h);
      ctx.clip();
      for (let y = rope.y; y < rope.y + rope.h + tileH; y += tileH * 0.985) {
        ctx.drawImage(art, rope.x - w / 2, y, w, tileH);
      }
      ctx.restore();
      return;
    }
    ctx.strokeStyle = rope.kind === "chain" ? "#8d8478" : rope.kind === "vine" ? "#3f8f45" : "#c2a15a";
    ctx.lineWidth = (rope.kind === "chain" ? 4 : 3) / z;
    ctx.beginPath();
    ctx.moveTo(rope.x, rope.y);
    ctx.lineTo(rope.x, rope.y + rope.h);
    ctx.stroke();
  }

  nameplate(ctx: CanvasRenderingContext2D, x: number, y: number, name: string, criminal: boolean) {
    const z = this.viewZoom();
    ctx.textAlign = "center";
    ctx.font = `800 ${Math.round(13 / z)}px Nunito, sans-serif`;
    ctx.fillStyle = criminal ? "#ff4d4d" : "#f3e6c8";
    ctx.fillText(criminal ? `${name}  Criminal` : name, x, y);
  }

  bar(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, t: number, color: string) {
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(x - w / 2, y, w, 5);
    ctx.fillStyle = color;
    ctx.fillRect(x - w / 2, y, w * Math.max(0, Math.min(1, t)), 5);
  }

  drawToast(ctx: CanvasRenderingContext2D) {
    if (this.toastT <= 0 || !this.toast) return;
    ctx.globalAlpha = Math.min(1, this.toastT);
    ctx.fillStyle = "rgba(20,14,24,0.8)";
    ctx.fillRect(this.cssW / 2 - 200, 68, 400, 40);
    ctx.fillStyle = "#f3e6c8";
    ctx.font = "700 14px Nunito, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(this.toast, this.cssW / 2, 93);
    ctx.globalAlpha = 1;
  }

  adoptEconomy(next: SaveState) {
    this.state.gold = next.gold;
    this.state.bankGold = next.bankGold;
    this.state.bag = next.bag;
    this.state.storage = next.storage;
    this.state.equip = next.equip;
    if (next.criminal) this.state.criminal = true;
  }

  snapshot(): HudSnap {
    const w = this.state.equip.weapon ? itemDef(this.state.equip.weapon.id) : undefined;
    const potions = this.state.bag.filter((it) => itemDef(it.id)?.kind === "potion").length;
    const live = this.bosses.filter((b) => !b.fallen);
    const a = live[0];
    const c = live[1];
    return {
      name: this.state.name,
      hero: this.state.hero,
      level: this.state.level,
      exp: this.state.exp,
      next: nextExp(this.state.level),
      points: this.state.points,
      hp: this.state.hp,
      maxHp: maxHp(this.state),
      sp: this.state.sp,
      maxSp: maxSp(this.state),
      gold: this.state.gold,
      criminal: this.state.criminal,
      stance: this.state.stance,
      mapId: this.map.id,
      mapName: this.map.name,
      weapon: w?.name ?? "Fists",
      potions,
      near: this.nearLabel,
      shop: this.nearShop,
      gate: this.nearGate,
      peerId: this.nearPeer,
      toast: this.toastT > 0 ? this.toast : "",
      jailedUntil: this.state.jailedUntil,
      bossName: a ? BOSSES[a.id].name : "",
      bossHp: a?.hp ?? 0,
      bossMax: a?.max ?? 1,
      boss2Name: c ? BOSSES[c.id].name : "",
      boss2Hp: c?.hp ?? 0,
      boss2Max: c?.max ?? 1,
      paused: this.paused,
    };
  }
}

const backgrounds = new Map<string, HTMLImageElement>();
const portals = new Map<string, HTMLImageElement>();
const scenery = new Map<string, HTMLImageElement>();
const itemIcons = new Map<string, HTMLImageElement>();
function itemIcon(id: string) {
  const src = `/assets/items/icons/${id}.png?v=11`;
  let img = itemIcons.get(id);
  if (!img || !img.src.endsWith(src)) {
    img = new Image();
    img.src = src;
    itemIcons.set(id, img);
  }
  return img.complete && img.naturalWidth ? img : null;
}
let chainImg: HTMLImageElement | null = null;

const SCENERY_ART: Record<string, string> = {
  vine: "/assets/scenery/vine.png",
  rope: "/assets/scenery/rope.png",
  city: "/assets/scenery/city.png",
  forest: "/assets/scenery/forest.png",
  fire: "/assets/scenery/fire.png",
  death: "/assets/scenery/death.png",
  jail: "/assets/scenery/jail.png",
  nidavellir: "/assets/scenery/nidavellir.png",
  jotunheim: "/assets/scenery/jotunheim.png",
  vanaheim: "/assets/scenery/vanaheim.png",
  niflheim: "/assets/scenery/niflheim.png",
  asgard: "/assets/scenery/asgard.png",
  plank: "/assets/scenery/plank.png?v=8",
  hull: "/assets/scenery/hull.png",
};

const PORTAL_ART: Record<string, string> = {
  forest: "/assets/portals/forest.png",
  nidavellir: "/assets/portals/nidavellir.png",
  jotunheim: "/assets/portals/jotunheim.png",
  vanaheim: "/assets/portals/vanaheim.png",
  fire: "/assets/portals/fire.png",
  niflheim: "/assets/portals/niflheim.png",
  asgard: "/assets/portals/asgard.png",
  death: "/assets/portals/death.png",
  midgard: "/assets/portals/street.png",
  boat: "/assets/portals/boat.png",
};
const CHAIN_ART = "/assets/chain.png";

function portalSrc(to: string, boat?: boolean) {
  if (boat || to === "serpent-barge") return PORTAL_ART.boat ?? "";
  if (to === "midgard") return PORTAL_ART.midgard ?? "";
  const key = to.split("-")[0] ?? "";
  return PORTAL_ART[key] ?? "";
}

export function preloadMap(src: string) {
  if (!src || backgrounds.has(src)) return;
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src = src;
  img.onload = () => backgrounds.set(src, img);
}

export function preloadPortals() {
  for (const src of Object.values(PORTAL_ART)) {
    if (portals.has(src)) continue;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = src;
    img.onload = () => portals.set(src, img);
  }
}

export function preloadChain() {
  if (chainImg) return;
  const img = new Image();
  img.src = CHAIN_ART;
  img.onload = () => {
    chainImg = img;
  };
}

export function preloadScenery() {
  for (const [key, src] of Object.entries(SCENERY_ART)) {
    const prev = scenery.get(key);
    if (prev && prev.src.endsWith(src)) continue;
    const img = new Image();
    img.src = src;
    img.onload = () => scenery.set(key, img);
    scenery.set(key, img);
  }
}

declare global {
  interface Window {
    __controlsTest?: {
      getYaw: () => number;
      getSpeed: () => number;
      getX: () => number;
      setKeys: (codes: string[]) => void;
      setSteer: (v: number) => void;
    };
  }
}
