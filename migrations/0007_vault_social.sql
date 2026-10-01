create table if not exists account_vault (
  user_id text primary key,
  storage text not null default '[]',
  bank_gold integer not null default 0
);

create table if not exists guilds (
  id text primary key,
  name text not null,
  leader_id text not null,
  points integer not null default 0
);

create unique index if not exists guilds_name_idx on guilds (lower(name));

create table if not exists guild_members (
  character_id text primary key,
  guild_id text not null,
  name text not null
);

create table if not exists parties (
  id text primary key,
  leader_id text not null
);

create table if not exists party_members (
  character_id text primary key,
  party_id text not null,
  name text not null
);

create table if not exists party_invites (
  id text primary key,
  party_id text not null,
  from_name text not null,
  to_name text not null,
  created_at timestamptz not null default now()
);

create table if not exists pending_exp (
  character_id text primary key,
  amount integer not null default 0
);
