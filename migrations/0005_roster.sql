alter table characters add column if not exists id text;
alter table characters add column if not exists delete_at timestamptz;
update characters set id = user_id where id is null;
alter table characters alter column id set not null;
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'characters'::regclass
      and contype = 'p'
      and pg_get_constraintdef(oid) like '%(id)%'
  ) then
    alter table characters drop constraint if exists characters_pkey;
    alter table characters add primary key (id);
  end if;
end $$;
create index if not exists characters_user_idx on characters (user_id);
