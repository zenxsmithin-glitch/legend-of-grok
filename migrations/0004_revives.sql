create table if not exists revives (
  id bigserial primary key,
  victim_id text not null,
  healer_name text not null,
  created_at timestamptz not null default now()
);

create index if not exists revives_victim_idx on revives (victim_id);
