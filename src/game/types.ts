export type HeroId = "hermy" | "champo" | "tanya" | "trizzle" | "luna" | "ezekiel";
export type Stance = "peace" | "lethal";
export type StatKey = "str" | "agi" | "vit" | "int" | "dex" | "luck";
export type EquipSlot = "weapon" | "head" | "body" | "legs" | "acc";

export type ItemInst = {
  uid: string;
  id: string;
  charges?: number;
};

export type Equip = Partial<Record<EquipSlot, ItemInst>>;

export type SaveState = {
  name: string;
  hero: HeroId;
  level: number;
  exp: number;
  points: number;
  str: number;
  agi: number;
  vit: number;
  int: number;
  dex: number;
  luck: number;
  hp: number;
  sp: number;
  gold: number;
  bankGold: number;
  bag: ItemInst[];
  storage: ItemInst[];
  equip: Equip;
  stance: Stance;
  criminal: boolean;
  jailedUntil: number;
  map: string;
  x: number;
  y: number;
};

export type Peer = {
  id: string;
  name: string;
  hero: HeroId;
  x: number;
  y: number;
  pose: string;
  facing: number;
  criminal: boolean;
};

export type GroundDrop = {
  id: string;
  x: number;
  y: number;
  gold: number;
  items: ItemInst[];
  claimId: string | null;
  publicAt: number;
  local: boolean;
};
