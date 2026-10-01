export type Frame = { x: number; y: number; w: number; h: number };

export type Atlas = {
  image: HTMLImageElement;
  frames: Record<string, Frame>;
};

export async function loadAtlas(): Promise<Atlas> {
  const meta = (await fetch("/assets/atlas.json").then((r) => r.json())) as {
    frames: Record<string, Frame>;
  };
  const image = new Image();
  image.crossOrigin = "anonymous";
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("atlas"));
    image.src = "/assets/atlas.webp";
  });
  return { image, frames: meta.frames };
}

export function drawFrame(
  ctx: CanvasRenderingContext2D,
  atlas: Atlas,
  key: string,
  footX: number,
  footY: number,
  height: number,
) {
  const f = atlas.frames[key];
  if (!f) return;
  const scale = height / f.h;
  const w = f.w * scale;
  const h = f.h * scale;
  ctx.drawImage(atlas.image, f.x, f.y, f.w, f.h, footX - w / 2, footY - h, w, h);
}

export function heroFrame(hero: string, action: "walk" | "crouch" | "climb" | "dead", facing: number, frame: number) {
  const i = ((frame % 4) + 4) % 4;
  if (action === "climb" || action === "dead") return `${hero}.cd.${action}.${i}`;
  return `${hero}.${action}.${facing < 0 ? "l" : "r"}.${i}`;
}

const blockFrames = new Map<string, HTMLImageElement>();
const nidFrames = new Map<string, HTMLImageElement>();

const NID_ART = [
  "rock",
  "spider.0",
  "spider.1",
  "spark.0",
  "spark.1",
  "dwarf.idle",
  "dwarf.swing",
  "dwarf.shoot",
  "dwarf.jump",
  "dwarf.dark",
];

export function preloadNid() {
  for (const key of NID_ART) {
    if (nidFrames.has(key)) continue;
    const image = new Image();
    image.src = `/assets/nidavellir/${key}.png`;
    image.onload = () => nidFrames.set(key, image);
  }
}

export function drawNid(
  ctx: CanvasRenderingContext2D,
  key: string,
  facing: number,
  footX: number,
  footY: number,
  height: number,
  spin = 0,
) {
  const image = nidFrames.get(key);
  if (!image?.complete || !image.naturalWidth) return false;
  const scale = height / image.naturalHeight;
  const w = image.naturalWidth * scale;
  const h = image.naturalHeight * scale;
  ctx.save();
  ctx.translate(footX, footY - h / 2);
  if (spin) ctx.rotate(spin);
  if (facing < 0) ctx.scale(-1, 1);
  ctx.drawImage(image, -w / 2, -h / 2, w, h);
  ctx.restore();
  return true;
}

const jotFrames = new Map<string, HTMLImageElement>();

const JOT_ART = [
  ...[0, 1, 2, 3].flatMap((i) => [`seal.r.${i}`, `seal.l.${i}`, `yeti.r.${i}`, `yeti.l.${i}`, `laufey.r.${i}`, `laufey.l.${i}`]),
  "snow.0",
  "snow.1",
  "snow.2",
  "snow.3",
];

const jotWaiters = new Set<() => void>();

export function onJot(fn: () => void) {
  jotWaiters.add(fn);
  return () => {
    jotWaiters.delete(fn);
  };
}

export function preloadJot() {
  for (const key of JOT_ART) {
    if (jotFrames.has(key)) continue;
    const image = new Image();
    image.src = `/assets/jotunheim/${key}.png`;
    image.onload = () => {
      jotFrames.set(key, image);
      jotWaiters.forEach((fn) => fn());
    };
  }
}

export function drawJot(
  ctx: CanvasRenderingContext2D,
  key: string,
  footX: number,
  footY: number,
  height: number,
) {
  const image = jotFrames.get(key);
  if (!image?.complete || !image.naturalWidth) return false;
  const scale = height / image.naturalHeight;
  const w = image.naturalWidth * scale;
  const h = image.naturalHeight * scale;
  ctx.drawImage(image, footX - w / 2, footY - h, w, h);
  return true;
}

const vanFrames = new Map<string, HTMLImageElement>();
const VAN_ART = [
  ...["gnome", "fairy", "elf"].flatMap((name) => [0, 1, 2, 3].map((i) => `${name}.${i}`)),
  ...[0, 1, 2, 3, 4, 5].map((i) => `fawn.${i}`),
];

export function preloadVan() {
  for (const key of VAN_ART) {
    if (vanFrames.has(key)) continue;
    const image = new Image();
    image.src = `/assets/vanaheim/${key}.png`;
    image.onload = () => vanFrames.set(key, image);
  }
}

export function drawVan(
  ctx: CanvasRenderingContext2D,
  key: string,
  flip: boolean,
  footX: number,
  footY: number,
  height: number,
) {
  const image = vanFrames.get(key);
  if (!image?.complete || !image.naturalWidth) return false;
  const scale = height / image.naturalHeight;
  const w = image.naturalWidth * scale;
  const h = image.naturalHeight * scale;
  ctx.save();
  ctx.translate(footX, footY);
  if (flip) ctx.scale(-1, 1);
  ctx.drawImage(image, -w / 2, -h, w, h);
  ctx.restore();
  return true;
}

const niflFrames = new Map<string, HTMLImageElement>();
const NIFL_ART = ["serpent", "wolf", "demon", "hela"].flatMap((name) => [0, 1, 2, 3].map((i) => `${name}.${i}`));

export function preloadNifl() {
  for (const key of NIFL_ART) {
    if (niflFrames.has(key)) continue;
    const image = new Image();
    image.src = `/assets/niflheim/${key}.png`;
    image.onload = () => niflFrames.set(key, image);
  }
}

export function drawNifl(
  ctx: CanvasRenderingContext2D,
  key: string,
  flip: boolean,
  footX: number,
  footY: number,
  height: number,
) {
  const image = niflFrames.get(key);
  if (!image?.complete || !image.naturalWidth) return false;
  const scale = height / image.naturalHeight;
  const w = image.naturalWidth * scale;
  const h = image.naturalHeight * scale;
  ctx.save();
  ctx.translate(footX, footY);
  if (flip) ctx.scale(-1, 1);
  ctx.drawImage(image, -w / 2, -h, w, h);
  ctx.restore();
  return true;
}

const asgFrames = new Map<string, HTMLImageElement>();
const ASG_ART = ["heimdall", "tyr", "skadi", "thor", "loki", "thor2", "valkyrie"].flatMap((name) =>
  [0, 1, 2, 3].map((i) => `${name}.${i}`),
);

export function preloadAsg() {
  for (const key of ASG_ART) {
    if (asgFrames.has(key)) continue;
    const image = new Image();
    image.src = `/assets/asgard/${key}.png`;
    image.onload = () => asgFrames.set(key, image);
  }
}

export function drawAsg(
  ctx: CanvasRenderingContext2D,
  key: string,
  flip: boolean,
  footX: number,
  footY: number,
  height: number,
) {
  const image = asgFrames.get(key);
  if (!image?.complete || !image.naturalWidth) return false;
  const scale = height / image.naturalHeight;
  const w = image.naturalWidth * scale;
  const h = image.naturalHeight * scale;
  ctx.save();
  ctx.translate(footX, footY);
  if (flip) ctx.scale(-1, 1);
  ctx.drawImage(image, -w / 2, -h, w, h);
  ctx.restore();
  return true;
}

export function preloadBlocks() {
  for (const hero of ["hermy", "champo", "tanya", "trizzle", "luna", "ezekiel"]) {
    for (const frame of [0, 1]) {
      const key = `${hero}.${frame}`;
      if (blockFrames.has(key)) continue;
      const image = new Image();
      image.src = `/assets/block/${key}.png?v=2`;
      image.onload = () => blockFrames.set(key, image);
    }
  }
}

export function drawBlock(
  ctx: CanvasRenderingContext2D,
  hero: string,
  facing: number,
  frame: number,
  footX: number,
  footY: number,
  height: number,
) {
  const image = blockFrames.get(`${hero}.${((frame % 2) + 2) % 2}`);
  if (!image?.complete || !image.naturalWidth) return false;
  const scale = height / image.naturalHeight;
  const w = image.naturalWidth * scale;
  const h = image.naturalHeight * scale;
  ctx.save();
  if (facing < 0) {
    ctx.translate(footX, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(image, -w / 2, footY - h, w, h);
  } else {
    ctx.drawImage(image, footX - w / 2, footY - h, w, h);
  }
  ctx.restore();
  return true;
}

const heroFrames = new Map<string, HTMLImageElement>();
const heroWaiters = new Set<() => void>();
const EXTRA_HEROES = ["luna", "ezekiel"];

function extraHeroKeys(hero: string) {
  const keys: string[] = [];
  for (const action of ["walk", "crouch"]) {
    for (const side of ["l", "r"]) {
      for (let i = 0; i < 4; i++) keys.push(`${hero}.${action}.${side}.${i}`);
    }
  }
  for (const action of ["climb", "dead"]) {
    for (let i = 0; i < 4; i++) keys.push(`${hero}.cd.${action}.${i}`);
  }
  return keys;
}

const heroStarted = new Set<string>();

export function preloadHeroes() {
  for (const hero of EXTRA_HEROES) {
    for (const key of extraHeroKeys(hero)) {
      if (heroStarted.has(key)) continue;
      heroStarted.add(key);
      const image = new Image();
      image.src = `/assets/heroes/${key}.png`;
      image.onload = () => {
        heroFrames.set(key, image);
        heroWaiters.forEach((fn) => fn());
      };
    }
  }
}

export function onHeroes(fn: () => void) {
  heroWaiters.add(fn);
  return () => {
    heroWaiters.delete(fn);
  };
}

export function drawActor(
  ctx: CanvasRenderingContext2D,
  atlas: Atlas,
  key: string,
  footX: number,
  footY: number,
  height: number,
) {
  const image = heroFrames.get(key);
  if (image?.complete && image.naturalWidth) {
    const scale = height / image.naturalHeight;
    const w = image.naturalWidth * scale;
    const h = image.naturalHeight * scale;
    ctx.drawImage(image, footX - w / 2, footY - h, w, h);
    return;
  }
  drawFrame(ctx, atlas, key, footX, footY, height);
}

export function mobFrame(sprite: string, facing: number, frame: number) {
  const i = ((frame % 4) + 4) % 4;
  return `${sprite}.${facing < 0 ? "l" : "r"}.${i}`;
}

export function bossFrame(sprite: string, facing: number, frame: number) {
  const i = ((frame % 4) + 4) % 4;
  return `${sprite}.${facing < 0 ? "l" : "r"}.${i}`;
}

export function drawYetiHero(
  ctx: CanvasRenderingContext2D,
  facing: number,
  frame: number,
  footX: number,
  footY: number,
  height: number,
) {
  const side = facing < 0 ? "l" : "r";
  const i = ((Math.floor(frame) % 4) + 4) % 4;
  return drawJot(ctx, `yeti.${side}.${i}`, footX, footY, height);
}

const bossArt = new Map<string, HTMLImageElement>();
const BOSS_ART = ["surtur", "baphomet"].flatMap((name) =>
  ["l", "r"].flatMap((side) => [0, 1, 2, 3].map((i) => `${name}.${side}.${i}`)),
);

export function preloadBossArt() {
  for (const key of BOSS_ART) {
    if (bossArt.has(key)) continue;
    const image = new Image();
    image.src = `/assets/bosses/${key}.png`;
    image.onload = () => bossArt.set(key, image);
  }
}

export function drawBossArt(
  ctx: CanvasRenderingContext2D,
  key: string,
  footX: number,
  footY: number,
  height: number,
  maxW?: number,
) {
  const image = bossArt.get(key);
  if (!image?.complete || !image.naturalWidth) return false;
  let scale = height / image.naturalHeight;
  let w = image.naturalWidth * scale;
  let h = image.naturalHeight * scale;
  if (maxW && w > maxW) {
    scale = maxW / image.naturalWidth;
    w = maxW;
    h = image.naturalHeight * scale;
  }
  ctx.drawImage(image, footX - w / 2, footY - h, w, h);
  return true;
}

const extraArt = new Map<string, HTMLImageElement>();

export function preloadExtra(pairs: [string, string][]) {
  if (typeof Image === "undefined") return;
  for (const [key, src] of pairs) {
    const have = extraArt.get(key);
    if (have && have.src.endsWith(src)) continue;
    const image = new Image();
    image.src = src;
    image.onload = () => extraArt.set(key, image);
    extraArt.set(key, image);
  }
}

export function drawExtra(
  ctx: CanvasRenderingContext2D,
  key: string,
  footX: number,
  footY: number,
  height: number,
  flip = false,
) {
  const image = extraArt.get(key);
  if (!image?.complete || !image.naturalWidth) return false;
  const scale = height / image.naturalHeight;
  const w = image.naturalWidth * scale;
  const h = image.naturalHeight * scale;
  ctx.save();
  ctx.translate(footX, footY);
  if (flip) ctx.scale(-1, 1);
  ctx.drawImage(image, -w / 2, -h, w, h);
  ctx.restore();
  return true;
}

export function drawExtraCentered(
  ctx: CanvasRenderingContext2D,
  key: string,
  x: number,
  y: number,
  height: number,
) {
  const image = extraArt.get(key);
  if (!image?.complete || !image.naturalWidth) return false;
  const scale = height / image.naturalHeight;
  const w = image.naturalWidth * scale;
  const h = image.naturalHeight * scale;
  ctx.drawImage(image, x - w / 2, y - h / 2, w, h);
  return true;
}
