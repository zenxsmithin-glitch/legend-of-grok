import { BAG_MAX, BOSSES as BOSS_DEFS, consolidateBag, freshState, isBoundItem, itemDef, rollBossLoot, yetiUnlocked, type BossId } from "@/game/balance";
import { installCards } from "@/game/cards";
import type { GroundDrop, HeroId, ItemInst, Peer, SaveState } from "@/game/types";
import { getSql, type Sql } from "@/lib/db";
import { ensureArena } from "./arena.server";
import type { ChatLine, HeroInput, HeroCard, HeroRecord, Listing, PulseResult, SaveResult, TradeOffer, TradeView } from "./types";

installCards();

const HEROES: HeroId[] = ["hermy", "champo", "tanya", "trizzle", "luna", "ezekiel", "yeti"];
const BOSS_IDS = Object.keys(BOSS_DEFS) as BossId[];

function parseState(raw: unknown): SaveState {
  if (typeof raw === "string") return JSON.parse(raw) as SaveState;
  return raw as SaveState;
}

function parseItems(raw: unknown): ItemInst[] {
  const value = typeof raw === "string" ? JSON.parse(raw) : raw;
  if (!Array.isArray(value)) return [];
  return value.filter((it) => it && typeof it.uid === "string" && typeof it.id === "string") as ItemInst[];
}

async function purgeExpired(sql: Sql, userId: string) {
  await sql`
    delete from characters
    where user_id = ${userId} and delete_at is not null and delete_at <= now()
  `;
}

async function load(sql: Sql, userId: string, characterId: string): Promise<HeroRecord | null> {
  const rows = await sql<{ id: string; state: unknown; revision: number; criminal: boolean }>`
    select id, state, revision, criminal from characters
    where id = ${characterId} and user_id = ${userId}
      and (delete_at is null or delete_at > now())
  `;
  const row = rows[0];
  if (!row) return null;
  const state = parseState(row.state);
  state.criminal = Boolean(row.criminal) || Boolean(state.criminal);
  if (Array.isArray(state.bag)) consolidateBag(state.bag);
  if (Array.isArray(state.storage)) consolidateBag(state.storage);
  return { id: row.id, state, revision: Number(row.revision) };
}

async function loadById(sql: Sql, characterId: string): Promise<HeroRecord | null> {
  const rows = await sql<{ id: string; state: unknown; revision: number; criminal: boolean }>`
    select id, state, revision, criminal from characters
    where id = ${characterId} and (delete_at is null or delete_at > now())
  `;
  const row = rows[0];
  if (!row) return null;
  const state = parseState(row.state);
  state.criminal = Boolean(row.criminal) || Boolean(state.criminal);
  if (Array.isArray(state.bag)) consolidateBag(state.bag);
  if (Array.isArray(state.storage)) consolidateBag(state.storage);
  return { id: row.id, state, revision: Number(row.revision) };
}

export async function listHeroesFor(userId: string): Promise<HeroCard[]> {
  const sql = await getSql();
  await purgeExpired(sql, userId);
  const rows = await sql<{ id: string; name: string; hero: HeroId; state: unknown; delete_ms: unknown }>`
    select id, name, hero, state, extract(epoch from delete_at) * 1000 as delete_ms
    from characters where user_id = ${userId}
    order by name
  `;
  return rows.map((row) => {
    const state = parseState(row.state);
    const ms = Number(row.delete_ms);
    return {
      id: row.id,
      name: row.name,
      hero: row.hero,
      level: Number(state.level) || 1,
      reborn: Number(state.reborn) || 0,
      deleteAt: Number.isFinite(ms) && ms > 0 ? ms : null,
    };
  });
}

export async function loadHeroFor(userId: string, characterId: string): Promise<HeroRecord | { error: string }> {
  const sql = await getSql();
  await purgeExpired(sql, userId);
  const hero = await load(sql, userId, characterId);
  if (!hero) return { error: "That hero is gone." };
  return hero;
}

export async function scheduleDeleteFor(userId: string, characterId: string): Promise<{ ok: true; deleteAt: number } | { error: string }> {
  const sql = await getSql();
  const rows = await sql<{ delete_ms: unknown }>`
    update characters set delete_at = coalesce(delete_at, now() + interval '24 hours')
    where id = ${characterId} and user_id = ${userId}
    returning extract(epoch from delete_at) * 1000 as delete_ms
  `;
  const ms = Number(rows[0]?.delete_ms);
  if (!rows.length || !Number.isFinite(ms)) return { error: "That hero is gone." };
  return { ok: true, deleteAt: ms };
}

export async function cancelDeleteFor(userId: string, characterId: string): Promise<{ ok: true } | { error: string }> {
  const sql = await getSql();
  const rows = await sql`
    update characters set delete_at = null
    where id = ${characterId} and user_id = ${userId} and delete_at > now()
    returning id
  `;
  if (!rows.length) return { error: "Nothing to cancel." };
  return { ok: true };
}

export async function createHeroFor(userId: string, input: HeroInput): Promise<HeroRecord | { error: string }> {
  const name = input.name.trim().replace(/\s+/g, " ");
  if (name.length < 2 || name.length > 16) return { error: "Name must be 2–16 characters." };
  if (!/^[A-Za-z0-9 ]+$/.test(name)) return { error: "Letters, numbers, and spaces only." };
  if (!HEROES.includes(input.hero)) return { error: "Pick one of the heroes." };
  const sql = await getSql();
  await purgeExpired(sql, userId);
  const mine = await sql<{ state: unknown }>`select state from characters where user_id = ${userId}`;
  if (mine.length >= 7) return { error: "Seven heroes is the limit." };
  if (input.hero === "yeti") {
    let max = 0;
    for (const row of mine) {
      const state = parseState(row.state);
      max = Math.max(max, Number(state.reborn) || 0);
    }
    if (!yetiUnlocked(max)) return { error: "Baby Yeti unlocks after 10 reborns." };
  }
  const taken = await sql<{ id: string }>`select id from characters where lower(name) = lower(${name})`;
  if (taken.length) return { error: "That name is already taken." };
  const state = freshState(name, input.hero);
  const id = crypto.randomUUID();
  try {
    await sql`
      insert into characters (id, user_id, name, hero, revision, state, map_id, px, py, pose, facing, criminal)
      values (
        ${id}, ${userId}, ${name}, ${input.hero}, 1, ${JSON.stringify(state)},
        ${state.map}, ${state.x}, ${state.y}, 'idle', 1, false
      )
    `;
  } catch (err) {
    const msg = err instanceof Error ? err.message.toLowerCase() : "";
    if (msg.includes("unique") || msg.includes("duplicate")) return { error: "That name is already taken." };
    throw err;
  }
  return { id, state, revision: 1 };
}

export async function saveHeroFor(
  userId: string,
  input: { characterId: string; revision: number; state: SaveState; pose: string; facing: number },
): Promise<SaveResult> {
  const sql = await getSql();
  const current = await sql<{ revision: number; criminal: boolean }>`
    select revision, criminal from characters
    where id = ${input.characterId} and user_id = ${userId}
      and (delete_at is null or delete_at > now())
  `;
  const row = current[0];
  if (!row) return { error: "No hero." };
  if (Number(row.revision) !== input.revision) {
    const fresh = await load(sql, userId, input.characterId);
    if (!fresh) return { error: "No hero." };
    return { conflict: true, state: fresh.state, revision: fresh.revision };
  }
  const criminal = Boolean(row.criminal) || Boolean(input.state.criminal);
  const next: SaveState = { ...input.state, criminal, name: input.state.name.slice(0, 16) };
  const rev = input.revision + 1;
  const updated = await sql<{ revision: number }>`
    update characters set
      state = ${JSON.stringify(next)},
      revision = ${rev},
      map_id = ${next.map},
      px = ${next.x},
      py = ${next.y},
      pose = ${input.pose.slice(0, 16)},
      facing = ${input.facing >= 0 ? 1 : -1},
      criminal = ${criminal},
      seen_at = now()
    where id = ${input.characterId} and user_id = ${userId} and revision = ${input.revision}
    returning revision
  `;
  if (!updated.length) {
    const fresh = await load(sql, userId, input.characterId);
    if (!fresh) return { error: "No hero." };
    return { conflict: true, state: fresh.state, revision: fresh.revision };
  }
  await sql`
    insert into account_vault (user_id, storage, bank_gold)
    values (${userId}, ${JSON.stringify(next.storage ?? [])}, ${Math.max(0, Math.floor(next.bankGold || 0))})
    on conflict (user_id) do update set storage = excluded.storage, bank_gold = excluded.bank_gold
  `;
  return { ok: true, revision: rev, criminal };
}

function bossMap(boss: BossId): string {
  const sky: Record<string, string> = {
    sky1: "cloud-1",
    sky2: "cloud-2",
    sky3: "cloud-2",
    sky4: "cloud-3",
    sky5: "cloud-3",
    sky6: "cloud-3",
    sky7: "asgard-secret",
    sky8: "asgard-secret",
    sky9: "asgard-secret",
    odin: "asgard-secret",
    fenrir: "fenrir-pit",
    jormungand: "serpent-barge",
  };
  if (sky[boss]) return sky[boss]!;
  if (boss === "catcher") return "forest-nightmare";
  if (boss === "brokk") return "nidavellir-nightmare";
  if (boss === "thrym") return "jotunheim-nightmare";
  if (boss === "grove") return "vanaheim-nightmare";
  if (boss === "surtur") return "fire-nightmare";
  if (boss === "nidhogg") return "niflheim-nightmare";
  if (boss === "heimdall") return "asgard-easy";
  if (boss === "tyr") return "asgard-medium";
  if (boss === "skadi") return "asgard-hard";
  if (boss === "thor" || boss === "loki") return "asgard-nightmare";
  if (boss === "freyja2") return "thingstead-easy";
  if (boss === "hela2") return "thingstead-medium";
  if (boss === "thor2") return "thingstead-hard";
  if (boss === "terror") return "dwarf-den";
  if (boss === "valkyrie") return "thingstead-nightmare";
  if (boss === "mimir") return "yggdrasil";
  return "death-nightmare";
}

function bossesFor(map: string): BossId[] {
  if (map === "asgard-easy") return ["heimdall"];
  if (map === "asgard-medium") return ["tyr"];
  if (map === "asgard-hard") return ["skadi"];
  if (map === "asgard-nightmare") return ["thor", "loki"];
  if (map === "thingstead-easy") return ["freyja2"];
  if (map === "thingstead-medium") return ["hela2"];
  if (map === "thingstead-hard") return ["thor2"];
  if (map === "thingstead-nightmare") return ["valkyrie"];
  if (map === "dwarf-den") return ["terror"];
  if (map === "forest-nightmare") return ["catcher"];
  if (map === "nidavellir-nightmare") return ["brokk"];
  if (map === "jotunheim-nightmare") return ["thrym"];
  if (map === "vanaheim-nightmare") return ["grove"];
  if (map === "fire-nightmare") return ["surtur"];
  if (map === "niflheim-nightmare") return ["nidhogg"];
  if (map === "death-nightmare") return ["baphomet"];
  if (map === "yggdrasil") return ["mimir"];
  if (map === "cloud-1") return ["sky1"];
  if (map === "cloud-2") return ["sky2", "sky3"];
  if (map === "cloud-3") return ["sky4", "sky5", "sky6"];
  if (map === "asgard-secret") return ["odin", "sky7", "sky8", "sky9"];
  if (map === "fenrir-pit") return ["fenrir"];
  if (map === "serpent-barge") return ["jormungand"];
  if (map === "ffa-ultra") return ["ultrahela"];
  return [];
}

function respawnMs(boss: BossId) {
  if (boss === "heimdall" || boss === "tyr" || boss === "skadi") return 5 * 60 * 1000;
  return 60 * 60 * 1000;
}

export async function pulseFor(
  userId: string,
  input: { characterId: string; map: string; x: number; y: number; pose: string; facing: number; boss: BossId | null; bossHits?: { boss: string; amount: number }[] },
): Promise<PulseResult> {
  const sql = await getSql();
  if (input.bossHits?.length) {
    const hero = await load(sql, userId, input.characterId);
    const name = hero?.state.name ?? "Hero";
    await sql`
      create table if not exists boss_credit (
        boss text not null,
        character_id text not null,
        damage integer not null default 0,
        name text not null default '',
        updated_at timestamptz not null default now(),
        primary key (boss, character_id)
      )
    `;
    for (const hit of input.bossHits) {
      const amount = Math.max(0, Math.floor(hit.amount));
      if (!hit.boss || amount <= 0) continue;
      await sql`
        insert into boss_credit (boss, character_id, damage, name, updated_at)
        values (${hit.boss}, ${input.characterId}, ${amount}, ${name}, now())
        on conflict (boss, character_id) do update
        set damage = boss_credit.damage + excluded.damage, name = excluded.name, updated_at = now()
      `;
    }
  }
  const me = await sql<{ criminal: boolean }>`
    update characters set
      map_id = ${input.map},
      px = ${input.x},
      py = ${input.y},
      pose = ${input.pose.slice(0, 16)},
      facing = ${input.facing >= 0 ? 1 : -1},
      seen_at = now()
    where id = ${input.characterId} and user_id = ${userId}
      and (delete_at is null or delete_at > now())
    returning criminal
  `;
  const peers = await sql<{
    id: string;
    name: string;
    hero: HeroId;
    x: number;
    y: number;
    pose: string;
    facing: number;
    criminal: boolean;
  }>`
    select id, name, hero, px as x, py as y, pose, facing, criminal
    from characters
    where map_id = ${input.map}
      and id <> ${input.characterId}
      and seen_at > now() - interval '8 seconds'
      and (delete_at is null or delete_at > now())
  `;
  await sql`alter table drops add column if not exists kind text`;
  await sql`delete from drops where kind = 'monster' and created_at < now() - interval '3 minutes'`;
  const dropRows = await sql<{
    id: string;
    x: number;
    y: number;
    gold: number;
    items: unknown;
    claim_id: string | null;
    public_ms: unknown;
    kind: string | null;
    born_ms: unknown;
  }>`
    select id, x, y, gold, items, claim_id, kind,
      extract(epoch from public_at) * 1000 as public_ms,
      extract(epoch from created_at) * 1000 as born_ms
    from drops where map_id = ${input.map}
  `;
  const hits = await sql<{ amount: number; attacker_name: string; attacker_id: string }>`
    delete from hits where victim_id = ${input.characterId}
    returning amount, attacker_name, attacker_id
  `;
  const revives = await sql<{ healer_name: string }>`
    delete from revives where victim_id = ${input.characterId}
    returning healer_name
  `;
  const payouts = await sql<{ gold: number }>`
    delete from payouts where user_id = ${input.characterId} returning gold
  `;
  let bossUp: boolean | null = null;
  const ids = bossesFor(input.map);
  const bosses: { id: BossId; up: boolean }[] = [];
  for (const id of ids) {
    const bossRows = await sql<{ ms: unknown }>`
      select extract(epoch from respawn_at) * 1000 as ms from bosses where id = ${id}
    `;
    const ms = bossRows[0] ? Number(bossRows[0].ms) : 0;
    const up = !ms || ms <= Date.now();
    bosses.push({ id, up });
  }
  if (bosses.length) bossUp = bosses[0]!.up;
  await sql`create table if not exists doors (id text primary key, open_until timestamptz)`;
  const doorRows = await sql<{ id: string; ms: unknown }>`
    select id, extract(epoch from open_until) * 1000 as ms from doors where open_until > now()
  `;
  const doors = doorRows.map((row) => ({ id: row.id, openUntil: Number(row.ms) || 0 }));
  const drops: GroundDrop[] = dropRows.map((d) => {
    const kind = d.kind === "monster" || d.kind === "player" || d.kind === "boss" ? d.kind : d.claim_id ? "boss" : undefined;
    return {
      id: d.id,
      x: Number(d.x),
      y: Number(d.y),
      gold: Number(d.gold),
      items: parseItems(d.items),
      claimId: d.claim_id,
      publicAt: Number(d.public_ms) || 0,
      local: false,
      kind,
      born: Number(d.born_ms) || 0,
    };
  });
  let visible = peers;
  if (input.map === "duel") {
    await ensureArena(sql);
    const room = await sql<{ host_id: string; guest_id: string | null }>`
      select host_id, guest_id from arena_rooms
      where status = 'live' and (host_id = ${input.characterId} or guest_id = ${input.characterId})
      order by created_at desc limit 1
    `;
    const other = room[0] ? (room[0].host_id === input.characterId ? room[0].guest_id : room[0].host_id) : null;
    visible = other ? peers.filter((p) => p.id === other) : [];
  }
  return {
    criminal: Boolean(me[0]?.criminal),
    peers: visible.map((p) => ({
      id: p.id,
      name: p.name,
      hero: p.hero,
      x: Number(p.x),
      y: Number(p.y),
      pose: p.pose,
      facing: Number(p.facing) >= 0 ? 1 : -1,
      criminal: Boolean(p.criminal),
    })),
    drops,
    hits: hits.map((h) => ({
      amount: Number(h.amount),
      attackerName: h.attacker_name,
      attackerId: h.attacker_id,
    })),
    revives: revives.map((row) => ({ healerName: row.healer_name })),
    payoutGold: payouts.reduce((sum, row) => sum + Number(row.gold), 0),
    bossUp,
    bosses,
    doors,
  };
}

export async function chatSyncFor(
  userId: string,
  input: { characterId: string; since: number; say?: string; dmName?: string; guild?: boolean },
): Promise<{ lines: ChatLine[]; opened?: { id: string; name: string }; error?: string }> {
  const sql = await getSql();
  const owned = await load(sql, userId, input.characterId);
  if (!owned) return { lines: [], error: "No hero." };
  const { guildChannelFor } = await import("./social.server");
  const guildChannel = await guildChannelFor(input.characterId);
  await sql`
    create table if not exists chat_messages (
      id text primary key,
      channel text not null,
      from_id text not null,
      from_name text not null,
      body text not null,
      created_at timestamptz not null default now()
    )
  `;
  const say = (input.say ?? "").replace(/\s+/g, " ").trim().slice(0, 160);
  let opened: { id: string; name: string } | undefined;
  let error: string | undefined;
  const wanted = (input.dmName ?? "").trim().slice(0, 24);
  if (wanted) {
    const found = await sql<{ id: string; name: string }>`
      select id, name from characters
      where lower(name) = lower(${wanted})
        and (delete_at is null or delete_at > now())
      limit 1
    `;
    const other = found[0];
    if (!other) error = "No hero by that name.";
    else if (other.id === input.characterId) error = "You cannot message yourself.";
    else {
      opened = { id: other.id, name: other.name };
      if (say) {
        const channel = [input.characterId, other.id].sort().join("|");
        await sql`
          insert into chat_messages (id, channel, from_id, from_name, body)
          values (${crypto.randomUUID()}, ${channel}, ${input.characterId}, ${owned.state.name}, ${say})
        `;
      }
    }
  } else if (say && input.guild) {
    if (!guildChannel) error = "Join a guild before using guild chat.";
    else {
      await sql`
        insert into chat_messages (id, channel, from_id, from_name, body)
        values (${crypto.randomUUID()}, ${guildChannel}, ${input.characterId}, ${owned.state.name}, ${say})
      `;
    }
  } else if (say) {
    await sql`
      insert into chat_messages (id, channel, from_id, from_name, body)
      values (${crypto.randomUUID()}, ${"world"}, ${input.characterId}, ${owned.state.name}, ${say})
    `;
  }
  const sinceIso = new Date(input.since > 0 ? input.since : Date.now() - 10 * 60 * 1000).toISOString();
  const left = `${input.characterId}|%`;
  const right = `%|${input.characterId}`;
  const rows = await sql<{
    id: string;
    channel: string;
    from_id: string;
    from_name: string;
    body: string;
    at: unknown;
  }>`
    select id, channel, from_id, from_name, body, extract(epoch from created_at) * 1000 as at
    from chat_messages
    where created_at > ${sinceIso}::timestamptz
      and (
        channel = 'world'
        or channel = ${guildChannel || "g:none"}
        or channel like ${left}
        or channel like ${right}
      )
    order by created_at asc
    limit 80
  `;
  return {
    lines: rows.map((row) => ({
      id: row.id,
      channel: row.channel,
      fromId: row.from_id,
      fromName: row.from_name,
      body: row.body,
      at: Number(row.at) || 0,
    })),
    opened,
    error,
  };
}

export async function placeDropFor(
  userId: string,
  input: { characterId: string; map: string; x: number; y: number; gold: number; items: ItemInst[]; kind?: "monster" | "player" | "boss" },
): Promise<GroundDrop> {
  const sql = await getSql();
  const owned = await load(sql, userId, input.characterId);
  if (!owned) return { id: "", x: input.x, y: input.y, gold: 0, items: [], claimId: null, publicAt: 0, local: true };
  const id = crypto.randomUUID();
  const items = input.items.slice(0, 60);
  const gold = Math.max(0, Math.floor(input.gold));
  const kind = input.kind === "monster" || input.kind === "boss" ? input.kind : "player";
  const born = Date.now();
  await sql`alter table drops add column if not exists kind text`;
  await sql`
    insert into drops (id, map_id, x, y, gold, items, owner_id, claim_id, public_at, kind)
    values (${id}, ${input.map}, ${input.x}, ${input.y}, ${gold}, ${JSON.stringify(items)}, ${input.characterId}, null, now(), ${kind})
  `;
  return { id, x: input.x, y: input.y, gold, items, claimId: null, publicAt: 0, local: false, kind, born };
}

export async function claimDropFor(
  userId: string,
  input: { characterId: string; id: string },
): Promise<{ ok: true; gold: number; items: ItemInst[] } | { ok: false; error: string }> {
  const sql = await getSql();
  if (!(await load(sql, userId, input.characterId))) return { ok: false, error: "No hero." };
  const rows = await sql<{ gold: number; items: unknown; claim_id: string | null; public_ms: unknown }>`
    select gold, items, claim_id, extract(epoch from public_at) * 1000 as public_ms
    from drops where id = ${input.id}
  `;
  const row = rows[0];
  if (!row) return { ok: false, error: "Already taken." };
  const locked = row.claim_id && row.claim_id !== input.characterId && Number(row.public_ms) > Date.now();
  if (locked) return { ok: false, error: "The killer still holds this loot." };
  const gone = await sql`delete from drops where id = ${input.id} returning id`;
  if (!gone.length) return { ok: false, error: "Already taken." };
  return { ok: true, gold: Number(row.gold), items: parseItems(row.items) };
}

export async function claimBossFor(
  userId: string,
  input: { characterId: string; boss: BossId; map: string; x: number; y: number; damage?: number },
): Promise<{ ok: true; drops: GroundDrop[]; winnerId: string; youWon: boolean } | { ok: false; error: string }> {
  if (!BOSS_IDS.includes(input.boss)) return { ok: false, error: "Unknown boss." };
  if (bossMap(input.boss) !== input.map) return { ok: false, error: "Wrong battlefield." };
  const sql = await getSql();
  if (!(await load(sql, userId, input.characterId))) return { ok: false, error: "No hero." };
  const until = Date.now() + respawnMs(input.boss);
  const won = await sql<{ id: string }>`
    insert into bosses (id, respawn_at)
    values (${input.boss}, to_timestamp(${until} / 1000.0))
    on conflict (id) do update set respawn_at = excluded.respawn_at
    where bosses.respawn_at is null or bosses.respawn_at <= now()
    returning id
  `;
  if (!won.length) return { ok: false, error: "Already claimed." };
  const hero = await load(sql, userId, input.characterId);
  const name = hero?.state.name ?? "Hero";
  const dealt = Math.max(0, Math.floor(input.damage ?? 0));
  await sql`
    create table if not exists boss_credit (
      boss text not null,
      character_id text not null,
      damage integer not null default 0,
      name text not null default '',
      updated_at timestamptz not null default now(),
      primary key (boss, character_id)
    )
  `;
  if (dealt > 0) {
    await sql`
      insert into boss_credit (boss, character_id, damage, name, updated_at)
      values (${input.boss}, ${input.characterId}, ${dealt}, ${name}, now())
      on conflict (boss, character_id) do update
      set damage = boss_credit.damage + excluded.damage, name = excluded.name, updated_at = now()
    `;
  }
  const top = await sql<{ character_id: string; damage: number }>`
    select character_id, damage from boss_credit
    where boss = ${input.boss} and updated_at > now() - interval '20 minutes'
    order by damage desc, updated_at asc
    limit 1
  `;
  const winnerId = top[0]?.character_id || input.characterId;
  await sql`delete from boss_credit where boss = ${input.boss}`;
  const loot = rollBossLoot(input.boss);
  const publicAt = new Date(Date.now() + 30_000).toISOString();
  const publicMs = Date.now() + 30_000;
  const x = Math.max(40, Math.min(3960, input.x));
  const y = Math.max(40, Math.min(2160, input.y));
  const pieces: { gold: number; items: ItemInst[] }[] = [];
  if (loot.gold > 0) pieces.push({ gold: loot.gold, items: [] });
  loot.items.forEach((item) => pieces.push({ gold: 0, items: [item] }));
  if (!pieces.length) pieces.push({ gold: loot.gold, items: [] });
  const drops: GroundDrop[] = [];
  for (let i = 0; i < pieces.length; i++) {
    const piece = pieces[i]!;
    const id = crypto.randomUUID();
    const ang = (i / Math.max(1, pieces.length)) * Math.PI * 2;
    const px = Math.max(40, Math.min(3960, x + Math.cos(ang) * 36));
    const py = y;
    await sql`alter table drops add column if not exists kind text`;
    await sql`
      insert into drops (id, map_id, x, y, gold, items, owner_id, claim_id, public_at, kind)
      values (
        ${id}, ${input.map}, ${px}, ${py}, ${piece.gold}, ${JSON.stringify(piece.items)},
        ${input.characterId}, ${winnerId}, ${publicAt}, ${"boss"}
      )
    `;
    drops.push({
      id,
      x: px,
      y: py,
      gold: piece.gold,
      items: piece.items,
      claimId: winnerId,
      publicAt: publicMs,
      local: false,
      kind: "boss",
      born: Date.now(),
    });
  }
  return { ok: true as const, drops, winnerId, youWon: winnerId === input.characterId };
}

export async function unlockDoorFor(
  _userId: string,
  input: { door: string },
): Promise<{ ok: true; openUntil: number } | { ok: false; error: string }> {
  const doors = ["asgard-easy", "asgard-medium", "asgard-hard", "thingstead-easy", "thingstead-medium", "thingstead-hard"];
  if (!doors.includes(input.door)) return { ok: false, error: "No such door." };
  const sql = await getSql();
  await sql`create table if not exists doors (id text primary key, open_until timestamptz)`;
  const until = Date.now() + 30_000;
  await sql`
    insert into doors (id, open_until)
    values (${input.door}, to_timestamp(${until} / 1000.0))
    on conflict (id) do update set open_until = excluded.open_until
  `;
  return { ok: true, openUntil: until };
}

export async function hitPlayerFor(
  userId: string,
  input: { characterId: string; victimId: string; amount: number },
): Promise<{ ok: true } | { error: string }> {
  if (!input.victimId || input.victimId === input.characterId) return { error: "No target." };
  const amount = Math.max(1, Math.min(4000, Math.round(input.amount)));
  const sql = await getSql();
  const me = await load(sql, userId, input.characterId);
  if (!me) return { error: "No hero." };
  await sql`
    insert into hits (victim_id, amount, attacker_name, attacker_id)
    values (${input.victimId}, ${amount}, ${me.state.name}, ${input.characterId})
  `;
  return { ok: true };
}

export async function revivePlayerFor(
  userId: string,
  input: { characterId: string; victimId: string },
): Promise<{ ok: true } | { error: string }> {
  if (!input.victimId || input.victimId === input.characterId) return { error: "You can't revive yourself." };
  const sql = await getSql();
  const me = await load(sql, userId, input.characterId);
  if (!me) return { error: "No hero." };
  await sql`
    insert into revives (victim_id, healer_name)
    values (${input.victimId}, ${me.state.name})
  `;
  return { ok: true };
}

export async function reportCityKillFor(
  userId: string,
  input: { characterId: string; attackerId: string; victimCriminal: boolean },
): Promise<{ branded: boolean }> {
  if (!input.attackerId || input.attackerId === input.characterId || input.victimCriminal) return { branded: false };
  const sql = await getSql();
  if (!(await load(sql, userId, input.characterId))) return { branded: false };
  await sql`update characters set criminal = true where id = ${input.attackerId}`;
  return { branded: true };
}

export async function listMarketFor(): Promise<Listing[]> {
  const sql = await getSql();
  const rows = await sql<{ id: string; seller_id: string; seller_name: string; item: unknown; price: number }>`
    select id, seller_id, seller_name, item, price from market order by created_at desc limit 40
  `;
  return rows
    .map((row) => {
      const items = parseItems([typeof row.item === "string" ? JSON.parse(row.item) : row.item]);
      const item = items[0];
      if (!item) return null;
      return {
        id: row.id,
        sellerId: row.seller_id,
        sellerName: row.seller_name,
        item,
        price: Number(row.price),
      };
    })
    .filter((row): row is Listing => row !== null);
}

export async function postListingFor(
  userId: string,
  input: { characterId: string; uid: string; price: number },
): Promise<{ state: SaveState; revision: number } | { error: string }> {
  const price = Math.floor(input.price);
  if (price < 1 || price > 5_000_000) return { error: "Set a price between 1 and 5,000,000." };
  const sql = await getSql();
  const loaded = await load(sql, userId, input.characterId);
  if (!loaded) return { error: "No hero." };
  const item = loaded.state.bag.find((it) => it.uid === input.uid);
  const def = item ? itemDef(item.id) : undefined;
  if (!item || !def || def.kind === "potion" || def.kind === "gem") return { error: "The post will not take that." };
  if (isBoundItem(item)) return { error: "That item is bound to you." };
  const qty = item.qty ?? 1;
  let listed = item;
  if (qty > 1) {
    item.qty = qty - 1;
    listed = { ...item, uid: crypto.randomUUID(), qty: 1 };
  } else {
    loaded.state.bag = loaded.state.bag.filter((it) => it.uid !== item.uid);
  }
  const rev = loaded.revision + 1;
  const updated = await sql`
    update characters set state = ${JSON.stringify(loaded.state)}, revision = ${rev}
    where id = ${input.characterId} and user_id = ${userId} and revision = ${loaded.revision}
    returning revision
  `;
  if (!updated.length) return { error: "Save raced. Try again." };
  await sql`
    insert into market (id, seller_id, seller_name, item, price)
    values (${crypto.randomUUID()}, ${input.characterId}, ${loaded.state.name}, ${JSON.stringify(listed)}, ${price})
  `;
  return { state: loaded.state, revision: rev };
}

export async function buyListingFor(
  userId: string,
  input: { characterId: string; id: string },
): Promise<{ state: SaveState; revision: number } | { error: string }> {
  const sql = await getSql();
  const loaded = await load(sql, userId, input.characterId);
  if (!loaded) return { error: "No hero." };
  const found = await sql<{ seller_id: string; item: unknown; price: number }>`
    select seller_id, item, price from market where id = ${input.id}
  `;
  const listing = found[0];
  if (!listing) return { error: "Already sold." };
  if (listing.seller_id === input.characterId) return { error: "That listing is yours." };
  const price = Number(listing.price);
  if (loaded.state.gold < price) return { error: "Not enough gold." };
  if (loaded.state.bag.length >= BAG_MAX) return { error: "Bag full." };
  const removed = await sql<{ item: unknown; price: number; seller_id: string }>`
    delete from market where id = ${input.id} returning item, price, seller_id
  `;
  const bought = removed[0];
  if (!bought) return { error: "Already sold." };
  const item = parseItems([typeof bought.item === "string" ? JSON.parse(bought.item) : bought.item])[0];
  if (!item) return { error: "The listing was empty." };
  loaded.state.gold -= Number(bought.price);
  loaded.state.bag = [...loaded.state.bag, item];
  const rev = loaded.revision + 1;
  const updated = await sql`
    update characters set state = ${JSON.stringify(loaded.state)}, revision = ${rev}
    where id = ${input.characterId} and user_id = ${userId} and revision = ${loaded.revision}
    returning revision
  `;
  if (!updated.length) {
    await sql`
      insert into market (id, seller_id, seller_name, item, price)
      values (${input.id}, ${bought.seller_id}, ${"Returned"}, ${JSON.stringify(item)}, ${Number(bought.price)})
    `;
    return { error: "Save raced. The listing was restored." };
  }
  await sql`insert into payouts (user_id, gold) values (${bought.seller_id}, ${Number(bought.price)})`;
  return { state: loaded.state, revision: rev };
}

function parseOffer(raw: unknown): TradeOffer {
  try {
    const value = typeof raw === "string" ? JSON.parse(raw) : raw;
    const gold = Math.max(0, Math.floor(Number((value as TradeOffer | null)?.gold) || 0));
    const items = parseItems((value as TradeOffer | null)?.items ?? []);
    return { gold, items };
  } catch {
    return { gold: 0, items: [] };
  }
}

type TradeRow = {
  id: string;
  a_id: string;
  b_id: string;
  a_offer: unknown;
  b_offer: unknown;
  a_ok: number;
  b_ok: number;
  status: string;
};

async function tradeRow(sql: Sql, id: string): Promise<TradeRow | null> {
  const rows = await sql<TradeRow>`select id, a_id, b_id, a_offer, b_offer, a_ok, b_ok, status from trades where id = ${id}`;
  return rows[0] ?? null;
}

function viewOf(row: TradeRow, userId: string, partnerName: string, extra?: Partial<TradeView>): TradeView {
  const youAre = row.a_id === userId ? "a" : "b";
  const mine = parseOffer(youAre === "a" ? row.a_offer : row.b_offer);
  const theirs = parseOffer(youAre === "a" ? row.b_offer : row.a_offer);
  return {
    phase: row.status === "done" ? "done" : "open",
    id: row.id,
    youAre,
    myOk: Number(youAre === "a" ? row.a_ok : row.b_ok),
    theirOk: Number(youAre === "a" ? row.b_ok : row.a_ok),
    mine,
    theirs,
    partnerName,
    ...extra,
  };
}

async function partnerName(sql: Sql, id: string): Promise<string> {
  const rows = await sql<{ name: string }>`select name from characters where id = ${id}`;
  return rows[0]?.name ?? "Traveler";
}

export async function tradeOpenFor(accountId: string, userId: string, otherId: string): Promise<TradeView> {
  if (!otherId || otherId === userId) return { phase: "none", error: "Face another adventurer." };
  const sql = await getSql();
  if (!(await load(sql, accountId, userId))) return { phase: "none", error: "No hero." };
  const existing = await sql<TradeRow>`
    select id, a_id, b_id, a_offer, b_offer, a_ok, b_ok, status from trades
    where status = 'open' and ((a_id = ${userId} and b_id = ${otherId}) or (a_id = ${otherId} and b_id = ${userId}))
    limit 1
  `;
  let row = existing[0];
  if (!row) {
    const id = crypto.randomUUID();
    await sql`
      insert into trades (id, a_id, b_id, a_offer, b_offer)
      values (${id}, ${userId}, ${otherId}, ${JSON.stringify({ gold: 0, items: [] })}, ${JSON.stringify({ gold: 0, items: [] })})
    `;
    row = (await tradeRow(sql, id))!;
  }
  const other = row.a_id === userId ? row.b_id : row.a_id;
  return viewOf(row, userId, await partnerName(sql, other));
}

export async function tradeOfferFor(
  accountId: string,
  userId: string,
  input: { id: string; gold: number; uids: string[] },
): Promise<TradeView> {
  const sql = await getSql();
  const row = await tradeRow(sql, input.id);
  if (!row || row.status !== "open") return { phase: "none", error: "Trade closed." };
  if (row.a_id !== userId && row.b_id !== userId) return { phase: "none", error: "Not your trade." };
  const loaded = await load(sql, accountId, userId);
  if (!loaded) return { phase: "none", error: "No hero." };
  const wanted = new Set(input.uids);
  const items = loaded.state.bag.filter((it) => wanted.has(it.uid)).slice(0, 12);
  const gold = Math.max(0, Math.min(loaded.state.gold, Math.floor(input.gold)));
  const offer = JSON.stringify({ gold, items });
  if (row.a_id === userId) {
    await sql`update trades set a_offer = ${offer}, a_ok = 0, b_ok = 0, updated_at = now() where id = ${row.id}`;
  } else {
    await sql`update trades set b_offer = ${offer}, a_ok = 0, b_ok = 0, updated_at = now() where id = ${row.id}`;
  }
  const next = (await tradeRow(sql, row.id))!;
  const other = next.a_id === userId ? next.b_id : next.a_id;
  return viewOf(next, userId, await partnerName(sql, other));
}

function takeOffer(state: SaveState, offer: TradeOffer): string | null {
  if (state.gold < offer.gold) return "Not enough gold.";
  for (const item of offer.items) {
    if (isBoundItem(item)) return "A bound item cannot be traded.";
    if (!state.bag.some((it) => it.uid === item.uid)) return "An offered item is gone.";
  }
  return null;
}

export async function tradeConfirmFor(accountId: string, userId: string, id: string): Promise<TradeView> {
  const sql = await getSql();
  const row = await tradeRow(sql, id);
  if (!row || (row.a_id !== userId && row.b_id !== userId)) return { phase: "none", error: "Not your trade." };
  if (!(await load(sql, accountId, userId))) return { phase: "none", error: "No hero." };
  if (row.status === "done") {
    const loaded = await loadById(sql, userId);
    const other = row.a_id === userId ? row.b_id : row.a_id;
    return viewOf(row, userId, await partnerName(sql, other), {
      state: loaded?.state,
      revision: loaded?.revision,
    });
  }
  const mineIsA = row.a_id === userId;
  const nextOk = Math.min(2, Number(mineIsA ? row.a_ok : row.b_ok) + 1);
  if (mineIsA) await sql`update trades set a_ok = ${nextOk}, updated_at = now() where id = ${id}`;
  else await sql`update trades set b_ok = ${nextOk}, updated_at = now() where id = ${id}`;
  const mid = (await tradeRow(sql, id))!;
  if (Number(mid.a_ok) < 2 || Number(mid.b_ok) < 2) {
    const other = mid.a_id === userId ? mid.b_id : mid.a_id;
    return viewOf(mid, userId, await partnerName(sql, other));
  }
  const a = await loadById(sql, mid.a_id);
  const b = await loadById(sql, mid.b_id);
  const offerA = parseOffer(mid.a_offer);
  const offerB = parseOffer(mid.b_offer);
  const fail = !a || !b ? "Someone logged out." : takeOffer(a.state, offerA) || takeOffer(b.state, offerB);
  if (fail || !a || !b) {
    await sql`update trades set a_ok = 0, b_ok = 0, updated_at = now() where id = ${id}`;
    const other = mid.a_id === userId ? mid.b_id : mid.a_id;
    const reset = (await tradeRow(sql, id))!;
    return viewOf(reset, userId, await partnerName(sql, other), { error: fail ?? "Trade failed." });
  }
  const aUids = new Set(offerA.items.map((it) => it.uid));
  const bUids = new Set(offerB.items.map((it) => it.uid));
  const aKeep = a.state.bag.filter((it) => !aUids.has(it.uid));
  const bKeep = b.state.bag.filter((it) => !bUids.has(it.uid));
  if (aKeep.length + offerB.items.length > BAG_MAX || bKeep.length + offerA.items.length > BAG_MAX) {
    await sql`update trades set a_ok = 0, b_ok = 0 where id = ${id}`;
    const other = mid.a_id === userId ? mid.b_id : mid.a_id;
    return viewOf((await tradeRow(sql, id))!, userId, await partnerName(sql, other), { error: "A bag is too full." });
  }
  a.state.gold = a.state.gold - offerA.gold + offerB.gold;
  b.state.gold = b.state.gold - offerB.gold + offerA.gold;
  a.state.bag = [...aKeep, ...offerB.items];
  b.state.bag = [...bKeep, ...offerA.items];
  const aRev = a.revision + 1;
  const bRev = b.revision + 1;
  await sql`
    update characters set state = ${JSON.stringify(a.state)}, revision = ${aRev}
    where id = ${mid.a_id} and revision = ${a.revision}
  `;
  await sql`
    update characters set state = ${JSON.stringify(b.state)}, revision = ${bRev}
    where id = ${mid.b_id} and revision = ${b.revision}
  `;
  await sql`update trades set status = 'done', updated_at = now() where id = ${id}`;
  const done = (await tradeRow(sql, id))!;
  const other = done.a_id === userId ? done.b_id : done.a_id;
  const mine = userId === mid.a_id ? a : b;
  const rev = userId === mid.a_id ? aRev : bRev;
  return viewOf(done, userId, await partnerName(sql, other), { state: mine.state, revision: rev });
}

export async function tradeReadFor(accountId: string, userId: string, id: string): Promise<TradeView> {
  const sql = await getSql();
  const row = await tradeRow(sql, id);
  if (!row || (row.a_id !== userId && row.b_id !== userId)) return { phase: "none" };
  if (!(await load(sql, accountId, userId))) return { phase: "none" };
  const other = row.a_id === userId ? row.b_id : row.a_id;
  if (row.status === "done") {
    const loaded = await loadById(sql, userId);
    return viewOf(row, userId, await partnerName(sql, other), {
      state: loaded?.state,
      revision: loaded?.revision,
    });
  }
  return viewOf(row, userId, await partnerName(sql, other));
}
