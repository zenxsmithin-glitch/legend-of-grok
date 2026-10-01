import type { SaveState } from "@/game/types";
import { getSql, type Sql } from "@/lib/db";

async function heroName(sql: Sql, userId: string, characterId: string) {
  const rows = await sql<{ name: string; state: unknown }>`
    select name, state from characters
    where id = ${characterId} and user_id = ${userId}
      and (delete_at is null or delete_at > now())
  `;
  const row = rows[0];
  if (!row) return null;
  const state = (typeof row.state === "string" ? JSON.parse(row.state) : row.state) as SaveState;
  return state?.name || row.name;
}

async function nameOf(sql: Sql, characterId: string) {
  const rows = await sql<{ name: string; state: unknown }>`
    select name, state from characters
    where id = ${characterId} and (delete_at is null or delete_at > now())
  `;
  const row = rows[0];
  if (!row) return null;
  const state = (typeof row.state === "string" ? JSON.parse(row.state) : row.state) as SaveState;
  return state?.name || row.name;
}

export async function ensureArena(sql: Sql) {
  await sql`
    create table if not exists arena_rooms (
      id text primary key,
      host_id text not null,
      host_name text not null,
      guest_id text,
      guest_name text,
      host_ready integer not null default 0,
      guest_ready integer not null default 0,
      status text not null default 'open',
      created_at timestamptz not null default now()
    )
  `;
  await sql`
    create table if not exists arena_rank (
      character_id text primary key,
      name text not null,
      wins integer not null default 0,
      losses integer not null default 0,
      ffa integer not null default 0
    )
  `;
}

export type ArenaRoom = {
  id: string;
  hostId: string;
  hostName: string;
  guestId: string | null;
  guestName: string | null;
  hostReady: boolean;
  guestReady: boolean;
  status: string;
};

export type ArenaBoard = {
  rooms: ArenaRoom[];
  mine: ArenaRoom | null;
  go: "duel" | null;
  ranks: { name: string; wins: number; losses: number; ffa: number }[];
  ffa: number;
};

function roomOf(row: {
  id: string;
  host_id: string;
  host_name: string;
  guest_id: string | null;
  guest_name: string | null;
  host_ready: number;
  guest_ready: number;
  status: string;
}): ArenaRoom {
  return {
    id: row.id,
    hostId: row.host_id,
    hostName: row.host_name,
    guestId: row.guest_id,
    guestName: row.guest_name,
    hostReady: Number(row.host_ready) > 0,
    guestReady: Number(row.guest_ready) > 0,
    status: row.status,
  };
}

export async function arenaBoardFor(userId: string, characterId: string): Promise<ArenaBoard | { error: string }> {
  const sql = await getSql();
  if (!(await heroName(sql, userId, characterId))) return { error: "No hero." };
  await ensureArena(sql);
  await sql`update arena_rooms set status = 'gone' where status = 'open' and created_at < now() - interval '30 minutes'`;
  const rows = await sql<{
    id: string;
    host_id: string;
    host_name: string;
    guest_id: string | null;
    guest_name: string | null;
    host_ready: number;
    guest_ready: number;
    status: string;
  }>`
    select id, host_id, host_name, guest_id, guest_name, host_ready, guest_ready, status
    from arena_rooms
    where status in ('open', 'live')
    order by created_at desc
    limit 24
  `;
  const rooms = rows.map(roomOf);
  const mine = rooms.find((room) => room.hostId === characterId || room.guestId === characterId) ?? null;
  const ranks = await sql<{ name: string; wins: number; losses: number; ffa: number }>`
    select name, wins, losses, ffa from arena_rank order by wins desc, ffa desc, name asc limit 20
  `;
  const ffaRows = await sql<{ n: number }>`
    select count(*)::int as n from characters
    where map_id = 'ffa' and seen_at > now() - interval '12 seconds'
  `;
  return {
    rooms: rooms.filter((room) => room.status === "open"),
    mine,
    go: mine?.status === "live" ? "duel" : null,
    ranks: ranks.map((row) => ({ name: row.name, wins: Number(row.wins), losses: Number(row.losses), ffa: Number(row.ffa) })),
    ffa: Number(ffaRows[0]?.n ?? 0),
  };
}

export async function arenaCreateFor(userId: string, characterId: string) {
  const sql = await getSql();
  const name = await heroName(sql, userId, characterId);
  if (!name) return { error: "No hero." };
  await ensureArena(sql);
  const existing = await sql<{ id: string }>`
    select id from arena_rooms
    where status in ('open', 'live') and (host_id = ${characterId} or guest_id = ${characterId})
    limit 1
  `;
  if (!existing.length) {
    await sql`
      insert into arena_rooms (id, host_id, host_name)
      values (${crypto.randomUUID()}, ${characterId}, ${name})
    `;
  }
  return arenaBoardFor(userId, characterId);
}

export async function arenaJoinFor(userId: string, characterId: string, roomId: string) {
  const sql = await getSql();
  const name = await heroName(sql, userId, characterId);
  if (!name) return { error: "No hero." };
  await ensureArena(sql);
  const joined = await sql`
    update arena_rooms set guest_id = ${characterId}, guest_name = ${name}
    where id = ${roomId} and status = 'open' and guest_id is null and host_id <> ${characterId}
    returning id
  `;
  if (!joined.length) return { error: "That room is full." };
  return arenaBoardFor(userId, characterId);
}

export async function arenaReadyFor(userId: string, characterId: string) {
  const sql = await getSql();
  if (!(await heroName(sql, userId, characterId))) return { error: "No hero." };
  await ensureArena(sql);
  await sql`update arena_rooms set host_ready = 1 where host_id = ${characterId} and status = 'open'`;
  await sql`update arena_rooms set guest_ready = 1 where guest_id = ${characterId} and status = 'open'`;
  await sql`
    update arena_rooms set status = 'live'
    where status = 'open' and host_ready = 1 and guest_ready = 1 and guest_id is not null
      and (host_id = ${characterId} or guest_id = ${characterId})
  `;
  return arenaBoardFor(userId, characterId);
}

export async function arenaLeaveFor(userId: string, characterId: string) {
  const sql = await getSql();
  if (!(await heroName(sql, userId, characterId))) return { error: "No hero." };
  await ensureArena(sql);
  await sql`update arena_rooms set status = 'gone' where host_id = ${characterId} and status = 'open'`;
  await sql`
    update arena_rooms set guest_id = null, guest_name = null, guest_ready = 0, host_ready = 0
    where guest_id = ${characterId} and status = 'open'
  `;
  return arenaBoardFor(userId, characterId);
}

export async function arenaEndFor(userId: string, input: { characterId: string; mode: "duel" | "ffa"; attackerId: string }) {
  const sql = await getSql();
  const name = await heroName(sql, userId, input.characterId);
  if (!name) return { ok: true as const };
  await ensureArena(sql);
  await sql`
    insert into arena_rank (character_id, name, wins, losses, ffa)
    values (${input.characterId}, ${name}, 0, 0, 0)
    on conflict (character_id) do update set name = excluded.name
  `;
  if (input.mode === "ffa") {
    if (input.attackerId && input.attackerId !== input.characterId) {
      const foe = await nameOf(sql, input.attackerId);
      if (foe) {
        await sql`
          insert into arena_rank (character_id, name, wins, losses, ffa)
          values (${input.attackerId}, ${foe}, 0, 0, 1)
          on conflict (character_id) do update set ffa = arena_rank.ffa + 1, name = excluded.name
        `;
      }
    }
    return { ok: true as const };
  }
  await sql`update arena_rank set losses = losses + 1 where character_id = ${input.characterId}`;
  const room = await sql<{ host_id: string; guest_id: string | null }>`
    select host_id, guest_id from arena_rooms
    where status = 'live' and (host_id = ${input.characterId} or guest_id = ${input.characterId})
    order by created_at desc limit 1
  `;
  const other = room[0] ? (room[0].host_id === input.characterId ? room[0].guest_id : room[0].host_id) : null;
  if (other) {
    const foe = await nameOf(sql, other);
    if (foe) {
      await sql`
        insert into arena_rank (character_id, name, wins, losses, ffa)
        values (${other}, ${foe}, 1, 0, 0)
        on conflict (character_id) do update set wins = arena_rank.wins + 1, name = excluded.name
      `;
    }
  }
  await sql`
    update arena_rooms set status = 'done'
    where status = 'live' and (host_id = ${input.characterId} or guest_id = ${input.characterId})
  `;
  return { ok: true as const };
}
