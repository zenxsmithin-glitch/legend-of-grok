import type { GroundDrop, HeroId, ItemInst, Peer, SaveState } from "@/game/types";

export type HeroRecord = { id: string; state: SaveState; revision: number };

export type HeroCard = {
  id: string;
  name: string;
  hero: HeroId;
  level: number;
  reborn: number;
  deleteAt: number | null;
};

export type SaveResult =
  | { ok: true; revision: number; criminal: boolean }
  | { conflict: true; state: SaveState; revision: number }
  | { error: string };

export type PulseHit = { amount: number; attackerName: string; attackerId: string };
export type PulseRevive = { healerName: string };

export type PulseResult = {
  criminal: boolean;
  peers: Peer[];
  drops: GroundDrop[];
  hits: PulseHit[];
  revives: PulseRevive[];
  payoutGold: number;
  bossUp: boolean | null;
  bosses: { id: string; up: boolean }[];
  doors: { id: string; openUntil: number }[];
};

export type TradeOffer = { gold: number; items: ItemInst[] };

export type TradeView = {
  phase: "open" | "done" | "none";
  id?: string;
  youAre?: "a" | "b";
  myOk?: number;
  theirOk?: number;
  mine?: TradeOffer;
  theirs?: TradeOffer;
  partnerName?: string;
  state?: SaveState;
  revision?: number;
  error?: string;
};

export type Listing = {
  id: string;
  sellerId: string;
  sellerName: string;
  item: ItemInst;
  price: number;
};

export type ChatLine = {
  id: string;
  channel: string;
  fromId: string;
  fromName: string;
  body: string;
  at: number;
};

export type HeroInput = { name: string; hero: HeroId };
