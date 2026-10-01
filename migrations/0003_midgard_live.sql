alter table hits add column if not exists attacker_id text not null default '';

create table if not exists payouts (
  id bigserial primary key,
  user_id text not null,
  gold integer not null
);

create index if not exists payouts_user_idx on payouts (user_id);
