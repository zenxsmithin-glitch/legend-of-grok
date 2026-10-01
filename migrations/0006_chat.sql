create table if not exists chat_messages (
  id text primary key,
  channel text not null,
  from_id text not null,
  from_name text not null,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists chat_messages_channel_idx on chat_messages (channel, created_at);
