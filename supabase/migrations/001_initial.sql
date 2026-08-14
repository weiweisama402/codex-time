create extension if not exists pgcrypto;

create table if not exists public.entities (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  entity_type text not null check (
    entity_type in ('project', 'task', 'tag', 'entry', 'timer', 'preset', 'plan', 'review', 'settings')
  ),
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  version integer not null default 1 check (version > 0),
  deleted_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists entities_user_updated_idx on public.entities (user_id, updated_at, id);
create index if not exists entities_user_type_idx on public.entities (user_id, entity_type) where deleted_at is null;

create or replace function public.set_entity_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = timezone('utc', now());
  new.user_id = old.user_id;
  new.entity_type = old.entity_type;
  new.created_at = old.created_at;
  return new;
end;
$$;

drop trigger if exists entities_set_updated_at on public.entities;
create trigger entities_set_updated_at
before update on public.entities
for each row execute function public.set_entity_updated_at();

alter table public.entities enable row level security;
alter table public.entities force row level security;

drop policy if exists "read own entities" on public.entities;
create policy "read own entities" on public.entities
for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "insert own entities" on public.entities;
create policy "insert own entities" on public.entities
for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "update own entities" on public.entities;
create policy "update own entities" on public.entities
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

revoke all on table public.entities from anon;
grant select, insert, update on table public.entities to authenticated;

do $$
begin
  alter publication supabase_realtime add table public.entities;
exception
  when duplicate_object then null;
end;
$$;
