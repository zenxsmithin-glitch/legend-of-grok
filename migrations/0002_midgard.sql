create table if not exists characters (
  user_id text primary key,
  name text not null,
  hero text not null,
  revision integer not null default 1,
  state text not null,
  map_id text not null,
  px double precision not null,
  py double precision not null,
  pose text not null default 'idle',
  facing integer not null default 1,
  criminal boolean not null default false,
  seen_at timestamptz not null default now()
);

create unique index if not exists characters_name_lower_idx on characters (lower(name));

create table if not exists market (
  id text primary key,
  seller_id text not null,
  seller_name text not null,
  item text not null,
  price integer not null,
  created_at timestamptz not null default now()
);

create table if not exists drops (
  id text primary key,
  map_id text not null,
  x double precision not null,
  y double precision not null,
  gold integer not null default 0,
  items text not null,
  owner_id text,
  claim_id text,
  public_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  kind text
);

create index if not exists drops_map_idx on drops (map_id);

create table if not exists bosses (
  id text primary key,
  respawn_at timestamptz
);

create table if not exists hits (
  id bigserial primary key,
  victim_id text not null,
  amount integer not null,
  attacker_name text not null,
  killed boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists hits_victim_idx on hits (victim_id);

create table if not exists trades (
  id text primary key,
  a_id text not null,
  b_id text not null,
  a_offer text not null default '[]',
  b_offer text not null default '[]',
  a_ok integer not null default 0,
  b_ok integer not null default 0,
  status text not null default 'open',
  updated_at timestamptz not null default now()
);
