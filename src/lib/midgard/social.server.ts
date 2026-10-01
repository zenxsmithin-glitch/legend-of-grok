import { newItem } from "@/game/balance";
import type { SaveState } from "@/game/types";
import { getSql } from "@/lib/db";

export type SocialView = {
  party: { id: string; leaderId: string; members: { id: string; name: string }[] } | null;
  invites: { id: string; fromName: string; partyId: string }[];
  guilds: { id: string; name: string; members: number; points: number }[];
  mine: { id: string; name: string; leaderId: string; points: number; members: { id: string; name: string }[] } | null;
  pendingExp: number;
};

async function ensure(sql: Awaited<ReturnType<typeof getSql>>) {
  await sql`
    create table if not exists guilds (
      id text primary key,
      name text not null,
      leader_id text not null,
      points integer not null default 0
    )
  `;
  await sql`create table if not exists guild_members (character_id text primary key, guild_id text not null, name text not null)`;
  await sql`create table if not exists parties (id text primary key, leader_id text not null)`;
  await sql`create table if not exists party_members (character_id text primary key, party_id text not null, name text not null)`;
  await sql`create table if not exists party_invites (id text primary key, party_id text not null, from_name text not null, to_name text not null, created_at timestamptz not null default now())`;
  await sql`create table if not exists pending_exp (character_id text primary key, amount integer not null default 0)`;
  await sql`create table if not exists account_vault (user_id text primary key, storage text not null default '[]', bank_gold integer not null default 0)`;
}

export async function socialSyncFor(userId: string, characterId: string): Promise<SocialView | { error: string }> {
  const sql = await getSql();
  await ensure(sql);
  const me = await sql<{ name: string }>`select name from characters where id = ${characterId} and user_id = ${userId}`;
  if (!me[0]) return { error: "No hero." };
  const name = me[0].name;
  const membership = await sql<{ party_id: string; leader_id: string }>`
    select m.party_id, p.leader_id from party_members m join parties p on p.id = m.party_id where m.character_id = ${characterId}
  `;
  let party: SocialView["party"] = null;
  if (membership[0]) {
    const members = await sql<{ character_id: string; name: string }>`
      select character_id, name from party_members where party_id = ${membership[0].party_id}
    `;
    party = {
      id: membership[0].party_id,
      leaderId: membership[0].leader_id,
      members: members.map((row) => ({ id: row.character_id, name: row.name })),
    };
  }
  const invites = await sql<{ id: string; from_name: string; party_id: string }>`
    select id, from_name, party_id from party_invites where lower(to_name) = lower(${name}) order by created_at desc limit 8
  `;
  const guildRows = await sql<{ id: string; name: string; points: number; members: number }>`
    select g.id, g.name, g.points, (select count(*) from guild_members gm where gm.guild_id = g.id)::int as members
    from guilds g order by g.name limit 40
  `;
  const mineRow = await sql<{ guild_id: string }>`select guild_id from guild_members where character_id = ${characterId}`;
  let mine: SocialView["mine"] = null;
  if (mineRow[0]) {
    const g = await sql<{ id: string; name: string; leader_id: string; points: number }>`
      select id, name, leader_id, points from guilds where id = ${mineRow[0].guild_id}
    `;
    const members = await sql<{ character_id: string; name: string }>`
      select character_id, name from guild_members where guild_id = ${mineRow[0].guild_id} order by name
    `;
    if (g[0]) {
      mine = {
        id: g[0].id,
        name: g[0].name,
        leaderId: g[0].leader_id,
        points: Number(g[0].points) || 0,
        members: members.map((row) => ({ id: row.character_id, name: row.name })),
      };
    }
  }
  const pending = await sql<{ amount: number }>`select amount from pending_exp where character_id = ${characterId}`;
  if (pending[0]?.amount) await sql`delete from pending_exp where character_id = ${characterId}`;
  return {
    party,
    invites: invites.map((row) => ({ id: row.id, fromName: row.from_name, partyId: row.party_id })),
    guilds: guildRows.map((row) => ({ id: row.id, name: row.name, members: Number(row.members) || 0, points: Number(row.points) || 0 })),
    mine,
    pendingExp: Number(pending[0]?.amount) || 0,
  };
}

export async function partyCreateFor(userId: string, characterId: string) {
  const sql = await getSql();
  await ensure(sql);
  const me = await sql<{ name: string }>`select name from characters where id = ${characterId} and user_id = ${userId}`;
  if (!me[0]) return { error: "No hero." };
  const have = await sql`select party_id from party_members where character_id = ${characterId}`;
  if (have.length) return { error: "You are already in a party." };
  const id = crypto.randomUUID();
  await sql`insert into parties (id, leader_id) values (${id}, ${characterId})`;
  await sql`insert into party_members (character_id, party_id, name) values (${characterId}, ${id}, ${me[0].name})`;
  return { ok: true };
}

export async function partyInviteFor(userId: string, characterId: string, name: string) {
  const sql = await getSql();
  await ensure(sql);
  const me = await sql<{ name: string }>`select name from characters where id = ${characterId} and user_id = ${userId}`;
  if (!me[0]) return { error: "No hero." };
  const party = await sql<{ party_id: string }>`select party_id from party_members where character_id = ${characterId}`;
  if (!party[0]) return { error: "Start a party first." };
  const count = await sql<{ n: number }>`select count(*)::int as n from party_members where party_id = ${party[0].party_id}`;
  if ((count[0]?.n ?? 0) >= 6) return { error: "A party holds six." };
  const who = name.trim();
  if (!who) return { error: "Say their name." };
  const found = await sql`select id from characters where lower(name) = lower(${who})`;
  if (!found.length) return { error: "No hero by that name." };
  await sql`
    insert into party_invites (id, party_id, from_name, to_name)
    values (${crypto.randomUUID()}, ${party[0].party_id}, ${me[0].name}, ${who})
  `;
  return { ok: true };
}

export async function partyAnswerFor(userId: string, characterId: string, inviteId: string, yes: boolean) {
  const sql = await getSql();
  await ensure(sql);
  const me = await sql<{ name: string }>`select name from characters where id = ${characterId} and user_id = ${userId}`;
  if (!me[0]) return { error: "No hero." };
  const invite = await sql<{ id: string; party_id: string; to_name: string }>`select id, party_id, to_name from party_invites where id = ${inviteId}`;
  if (!invite[0] || invite[0].to_name.toLowerCase() !== me[0].name.toLowerCase()) return { error: "That invite is gone." };
  await sql`delete from party_invites where id = ${inviteId}`;
  if (!yes) return { ok: true };
  const count = await sql<{ n: number }>`select count(*)::int as n from party_members where party_id = ${invite[0].party_id}`;
  if ((count[0]?.n ?? 0) >= 6) return { error: "That party is full." };
  await sql`delete from party_members where character_id = ${characterId}`;
  await sql`insert into party_members (character_id, party_id, name) values (${characterId}, ${invite[0].party_id}, ${me[0].name})`;
  return { ok: true };
}

export async function partyKickFor(userId: string, characterId: string, memberId: string) {
  const sql = await getSql();
  await ensure(sql);
  const party = await sql<{ party_id: string; leader_id: string }>`
    select m.party_id, p.leader_id from party_members m join parties p on p.id = m.party_id where m.character_id = ${characterId}
  `;
  if (!party[0] || party[0].leader_id !== characterId) return { error: "Only the leader can kick." };
  await sql`delete from party_members where character_id = ${memberId} and party_id = ${party[0].party_id}`;
  return { ok: true };
}

export async function partyLeadFor(userId: string, characterId: string, memberId: string) {
  const sql = await getSql();
  await ensure(sql);
  const party = await sql<{ party_id: string; leader_id: string }>`
    select m.party_id, p.leader_id from party_members m join parties p on p.id = m.party_id where m.character_id = ${characterId}
  `;
  if (!party[0] || party[0].leader_id !== characterId) return { error: "Only the leader can appoint." };
  const member = await sql`select character_id from party_members where character_id = ${memberId} and party_id = ${party[0].party_id}`;
  if (!member.length) return { error: "They are not in the party." };
  await sql`update parties set leader_id = ${memberId} where id = ${party[0].party_id}`;
  return { ok: true };
}

export async function partyLeaveFor(userId: string, characterId: string) {
  const sql = await getSql();
  await ensure(sql);
  const party = await sql<{ party_id: string; leader_id: string }>`
    select m.party_id, p.leader_id from party_members m join parties p on p.id = m.party_id where m.character_id = ${characterId}
  `;
  if (!party[0]) return { ok: true };
  await sql`delete from party_members where character_id = ${characterId}`;
  const left = await sql<{ character_id: string }>`select character_id from party_members where party_id = ${party[0].party_id} limit 1`;
  if (!left.length) {
    await sql`delete from parties where id = ${party[0].party_id}`;
    await sql`delete from party_invites where party_id = ${party[0].party_id}`;
  } else if (party[0].leader_id === characterId) {
    await sql`update parties set leader_id = ${left[0]!.character_id} where id = ${party[0].party_id}`;
  }
  return { ok: true };
}

export async function grantPartyExpFor(userId: string, characterId: string, share: number) {
  const sql = await getSql();
  await ensure(sql);
  const amount = Math.max(0, Math.min(5_000_000, Math.round(share)));
  if (!amount) return { ok: true };
  const owned = await sql`select id from characters where id = ${characterId} and user_id = ${userId}`;
  if (!owned.length) return { error: "No hero." };
  const party = await sql<{ party_id: string }>`select party_id from party_members where character_id = ${characterId}`;
  if (!party[0]) return { ok: true };
  const others = await sql<{ character_id: string }>`
    select character_id from party_members where party_id = ${party[0].party_id} and character_id <> ${characterId}
  `;
  for (const other of others) {
    await sql`
      insert into pending_exp (character_id, amount) values (${other.character_id}, ${amount})
      on conflict (character_id) do update set amount = pending_exp.amount + ${amount}
    `;
  }
  return { ok: true };
}

export async function guildCreateFor(userId: string, characterId: string, rawName: string) {
  const sql = await getSql();
  await ensure(sql);
  const name = rawName.trim().replace(/\s+/g, " ").slice(0, 18);
  if (name.length < 2) return { error: "Name the guild." };
  const me = await sql<{ name: string }>`select name from characters where id = ${characterId} and user_id = ${userId}`;
  if (!me[0]) return { error: "No hero." };
  const already = await sql`select guild_id from guild_members where character_id = ${characterId}`;
  if (already.length) return { error: "Leave your guild first." };
  const taken = await sql`select id from guilds where lower(name) = lower(${name})`;
  if (taken.length) return { error: "That guild name is taken." };
  const id = crypto.randomUUID();
  await sql`insert into guilds (id, name, leader_id, points) values (${id}, ${name}, ${characterId}, 0)`;
  await sql`insert into guild_members (character_id, guild_id, name) values (${characterId}, ${id}, ${me[0].name})`;
  return { ok: true };
}

export async function guildJoinFor(userId: string, characterId: string, guildId: string) {
  const sql = await getSql();
  await ensure(sql);
  const me = await sql<{ name: string }>`select name from characters where id = ${characterId} and user_id = ${userId}`;
  if (!me[0]) return { error: "No hero." };
  const already = await sql`select guild_id from guild_members where character_id = ${characterId}`;
  if (already.length) return { error: "Leave your guild first." };
  const count = await sql<{ n: number }>`select count(*)::int as n from guild_members where guild_id = ${guildId}`;
  if ((count[0]?.n ?? 0) >= 50) return { error: "That guild is full (50)." };
  const exists = await sql`select id from guilds where id = ${guildId}`;
  if (!exists.length) return { error: "No such guild." };
  await sql`insert into guild_members (character_id, guild_id, name) values (${characterId}, ${guildId}, ${me[0].name})`;
  return { ok: true };
}

export async function guildLeaveFor(userId: string, characterId: string, appointId?: string, disband?: boolean) {
  const sql = await getSql();
  await ensure(sql);
  const row = await sql<{ guild_id: string }>`select guild_id from guild_members where character_id = ${characterId}`;
  if (!row[0]) return { ok: true };
  const g = await sql<{ leader_id: string }>`select leader_id from guilds where id = ${row[0].guild_id}`;
  const leader = g[0]?.leader_id === characterId;
  if (leader && disband) {
    await sql`delete from guild_members where guild_id = ${row[0].guild_id}`;
    await sql`delete from guilds where id = ${row[0].guild_id}`;
    return { ok: true };
  }
  if (leader) {
    const next = appointId
      ? await sql<{ character_id: string }>`select character_id from guild_members where character_id = ${appointId} and guild_id = ${row[0].guild_id}`
      : await sql<{ character_id: string }>`select character_id from guild_members where guild_id = ${row[0].guild_id} and character_id <> ${characterId} limit 1`;
    if (!next[0]) {
      await sql`delete from guild_members where guild_id = ${row[0].guild_id}`;
      await sql`delete from guilds where id = ${row[0].guild_id}`;
      return { ok: true };
    }
    await sql`update guilds set leader_id = ${next[0].character_id} where id = ${row[0].guild_id}`;
  }
  await sql`delete from guild_members where character_id = ${characterId}`;
  return { ok: true };
}

export async function guildPointFor(userId: string, characterId: string) {
  const sql = await getSql();
  await ensure(sql);
  const owned = await sql`select id from characters where id = ${characterId} and user_id = ${userId}`;
  if (!owned.length) return { error: "No hero." };
  const row = await sql<{ guild_id: string }>`select guild_id from guild_members where character_id = ${characterId}`;
  if (!row[0]) return { ok: true };
  await sql`update guilds set points = points + 1 where id = ${row[0].guild_id}`;
  return { ok: true };
}

export async function guildChannelFor(characterId: string) {
  const sql = await getSql();
  await ensure(sql);
  const row = await sql<{ guild_id: string }>`select guild_id from guild_members where character_id = ${characterId}`;
  return row[0] ? `g:${row[0].guild_id}` : "";
}

export async function grantSkinFor(userId: string, characterId: string, skinId: string) {
  const skins = ["skin-ember", "skin-frost", "skin-royal", "skin-void"];
  if (!skins.includes(skinId)) return { error: "Unknown skin." };
  const sql = await getSql();
  const rows = await sql<{ state: unknown; revision: number }>`
    select state, revision from characters where id = ${characterId} and user_id = ${userId}
  `;
  const row = rows[0];
  if (!row) return { error: "No hero." };
  const state = (typeof row.state === "string" ? JSON.parse(row.state) : row.state) as SaveState;
  if (state.bag.some((it) => it.id === skinId) || state.storage.some((it) => it.id === skinId)) return { error: "You already own that skin." };
  state.bag.push(newItem(skinId));
  const rev = Number(row.revision) + 1;
  const updated = await sql`
    update characters set state = ${JSON.stringify(state)}, revision = ${rev}
    where id = ${characterId} and user_id = ${userId} and revision = ${row.revision}
    returning revision
  `;
  if (!updated.length) return { error: "Save raced. Try again." };
  return { state, revision: rev, preview: !process.env.STRIPE_SECRET_KEY };
}
