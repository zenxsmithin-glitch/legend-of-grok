import { createServerFn } from "@tanstack/react-start";
import type { BossId } from "@/game/balance";
import type { GroundDrop, ItemInst, SaveState } from "@/game/types";
import { authMiddleware } from "@/lib/auth/middleware";
import type { HeroCard, HeroInput, HeroRecord, Listing, PulseResult, SaveResult, TradeView } from "./types";

export const listHeroes = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<HeroCard[]> => {
    const { listHeroesFor } = await import("./logic.server");
    return listHeroesFor(context.userId);
  });

export const loadHero = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { characterId: string }) => input)
  .handler(async ({ data, context }): Promise<HeroRecord | { error: string }> => {
    const { loadHeroFor } = await import("./logic.server");
    return loadHeroFor(context.userId, data.characterId);
  });

export const createHero = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: HeroInput) => input)
  .handler(async ({ data, context }): Promise<HeroRecord | { error: string }> => {
    const { createHeroFor } = await import("./logic.server");
    return createHeroFor(context.userId, data);
  });

export const scheduleDelete = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { characterId: string }) => input)
  .handler(async ({ data, context }) => {
    const { scheduleDeleteFor } = await import("./logic.server");
    return scheduleDeleteFor(context.userId, data.characterId);
  });

export const cancelDelete = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { characterId: string }) => input)
  .handler(async ({ data, context }) => {
    const { cancelDeleteFor } = await import("./logic.server");
    return cancelDeleteFor(context.userId, data.characterId);
  });

export const saveHero = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { characterId: string; revision: number; state: SaveState; pose: string; facing: number }) => input)
  .handler(async ({ data, context }): Promise<SaveResult> => {
    const { saveHeroFor } = await import("./logic.server");
    return saveHeroFor(context.userId, data);
  });

export const pulse = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { characterId: string; map: string; x: number; y: number; pose: string; facing: number; boss: BossId | null; bossHits?: { boss: string; amount: number }[] }) => input)
  .handler(async ({ data, context }): Promise<PulseResult> => {
    const { pulseFor } = await import("./logic.server");
    return pulseFor(context.userId, data);
  });

export const placeDrop = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { characterId: string; map: string; x: number; y: number; gold: number; items: ItemInst[]; kind?: "monster" | "player" | "boss" }) => input)
  .handler(async ({ data, context }): Promise<GroundDrop> => {
    const { placeDropFor } = await import("./logic.server");
    return placeDropFor(context.userId, data);
  });

export const claimDrop = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { characterId: string; id: string }) => input)
  .handler(async ({ data, context }) => {
    const { claimDropFor } = await import("./logic.server");
    return claimDropFor(context.userId, data);
  });

export const claimBoss = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { characterId: string; boss: BossId; map: string; x: number; y: number; damage?: number }) => input)
  .handler(async ({ data, context }) => {
    const { claimBossFor } = await import("./logic.server");
    return claimBossFor(context.userId, data);
  });

export const unlockDoor = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { door: string }) => input)
  .handler(async ({ data, context }) => {
    const { unlockDoorFor } = await import("./logic.server");
    return unlockDoorFor(context.userId, data);
  });

export const chatSync = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { characterId: string; since: number; say?: string; dmName?: string; guild?: boolean }) => input)
  .handler(async ({ data, context }) => {
    const { chatSyncFor } = await import("./logic.server");
    return chatSyncFor(context.userId, data);
  });

export const arenaBoard = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { characterId: string }) => input)
  .handler(async ({ data, context }) => {
    const { arenaBoardFor } = await import("./arena.server");
    return arenaBoardFor(context.userId, data.characterId);
  });

export const arenaCreate = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { characterId: string }) => input)
  .handler(async ({ data, context }) => {
    const { arenaCreateFor } = await import("./arena.server");
    return arenaCreateFor(context.userId, data.characterId);
  });

export const arenaJoin = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { characterId: string; roomId: string }) => input)
  .handler(async ({ data, context }) => {
    const { arenaJoinFor } = await import("./arena.server");
    return arenaJoinFor(context.userId, data.characterId, data.roomId);
  });

export const arenaReady = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { characterId: string }) => input)
  .handler(async ({ data, context }) => {
    const { arenaReadyFor } = await import("./arena.server");
    return arenaReadyFor(context.userId, data.characterId);
  });

export const arenaLeave = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { characterId: string }) => input)
  .handler(async ({ data, context }) => {
    const { arenaLeaveFor } = await import("./arena.server");
    return arenaLeaveFor(context.userId, data.characterId);
  });

export const arenaEnd = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { characterId: string; mode: "duel" | "ffa"; attackerId: string }) => input)
  .handler(async ({ data, context }) => {
    const { arenaEndFor } = await import("./arena.server");
    return arenaEndFor(context.userId, data);
  });

export const hitPlayer = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { characterId: string; victimId: string; amount: number }) => input)
  .handler(async ({ data, context }) => {
    const { hitPlayerFor } = await import("./logic.server");
    return hitPlayerFor(context.userId, data);
  });

export const revivePlayer = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { characterId: string; victimId: string }) => input)
  .handler(async ({ data, context }) => {
    const { revivePlayerFor } = await import("./logic.server");
    return revivePlayerFor(context.userId, data);
  });

export const reportCityKill = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { characterId: string; attackerId: string; victimCriminal: boolean }) => input)
  .handler(async ({ data, context }) => {
    const { reportCityKillFor } = await import("./logic.server");
    return reportCityKillFor(context.userId, data);
  });

export const listMarket = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async (): Promise<Listing[]> => {
    const { listMarketFor } = await import("./logic.server");
    return listMarketFor();
  });

export const postListing = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { characterId: string; uid: string; price: number }) => input)
  .handler(async ({ data, context }) => {
    const { postListingFor } = await import("./logic.server");
    return postListingFor(context.userId, data);
  });

export const buyListing = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { characterId: string; id: string }) => input)
  .handler(async ({ data, context }) => {
    const { buyListingFor } = await import("./logic.server");
    return buyListingFor(context.userId, data);
  });

export const tradeOpen = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { characterId: string; otherId: string }) => input)
  .handler(async ({ data, context }): Promise<TradeView> => {
    const { tradeOpenFor } = await import("./logic.server");
    return tradeOpenFor(context.userId, data.characterId, data.otherId);
  });

export const tradeOffer = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { characterId: string; id: string; gold: number; uids: string[] }) => input)
  .handler(async ({ data, context }): Promise<TradeView> => {
    const { tradeOfferFor } = await import("./logic.server");
    return tradeOfferFor(context.userId, data.characterId, data);
  });

export const tradeConfirm = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { characterId: string; id: string }) => input)
  .handler(async ({ data, context }): Promise<TradeView> => {
    const { tradeConfirmFor } = await import("./logic.server");
    return tradeConfirmFor(context.userId, data.characterId, data.id);
  });

export const tradeRead = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { characterId: string; id: string }) => input)
  .handler(async ({ data, context }): Promise<TradeView> => {
    const { tradeReadFor } = await import("./logic.server");
    return tradeReadFor(context.userId, data.characterId, data.id);
  });

export const socialSync = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { characterId: string }) => input)
  .handler(async ({ data, context }) => {
    const { socialSyncFor } = await import("./social.server");
    return socialSyncFor(context.userId, data.characterId);
  });

export const partyCreate = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { characterId: string }) => input)
  .handler(async ({ data, context }) => {
    const { partyCreateFor } = await import("./social.server");
    return partyCreateFor(context.userId, data.characterId);
  });

export const partyInvite = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { characterId: string; name: string }) => input)
  .handler(async ({ data, context }) => {
    const { partyInviteFor } = await import("./social.server");
    return partyInviteFor(context.userId, data.characterId, data.name);
  });

export const partyAnswer = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { characterId: string; inviteId: string; yes: boolean }) => input)
  .handler(async ({ data, context }) => {
    const { partyAnswerFor } = await import("./social.server");
    return partyAnswerFor(context.userId, data.characterId, data.inviteId, data.yes);
  });

export const partyKick = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { characterId: string; memberId: string }) => input)
  .handler(async ({ data, context }) => {
    const { partyKickFor } = await import("./social.server");
    return partyKickFor(context.userId, data.characterId, data.memberId);
  });

export const partyLead = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { characterId: string; memberId: string }) => input)
  .handler(async ({ data, context }) => {
    const { partyLeadFor } = await import("./social.server");
    return partyLeadFor(context.userId, data.characterId, data.memberId);
  });

export const partyLeave = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { characterId: string }) => input)
  .handler(async ({ data, context }) => {
    const { partyLeaveFor } = await import("./social.server");
    return partyLeaveFor(context.userId, data.characterId);
  });

export const grantPartyExp = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { characterId: string; share: number }) => input)
  .handler(async ({ data, context }) => {
    const { grantPartyExpFor } = await import("./social.server");
    return grantPartyExpFor(context.userId, data.characterId, data.share);
  });

export const guildCreate = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { characterId: string; name: string }) => input)
  .handler(async ({ data, context }) => {
    const { guildCreateFor } = await import("./social.server");
    return guildCreateFor(context.userId, data.characterId, data.name);
  });

export const guildJoin = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { characterId: string; guildId: string }) => input)
  .handler(async ({ data, context }) => {
    const { guildJoinFor } = await import("./social.server");
    return guildJoinFor(context.userId, data.characterId, data.guildId);
  });

export const guildLeave = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { characterId: string; appointId?: string; disband?: boolean }) => input)
  .handler(async ({ data, context }) => {
    const { guildLeaveFor } = await import("./social.server");
    return guildLeaveFor(context.userId, data.characterId, data.appointId, data.disband);
  });

export const guildPoint = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { characterId: string }) => input)
  .handler(async ({ data, context }) => {
    const { guildPointFor } = await import("./social.server");
    return guildPointFor(context.userId, data.characterId);
  });

export const claimSkin = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { characterId: string; skinId: string }) => input)
  .handler(async ({ data, context }) => {
    const { grantSkinFor } = await import("./social.server");
    return grantSkinFor(context.userId, data.characterId, data.skinId);
  });

