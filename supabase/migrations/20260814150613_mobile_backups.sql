create table if not exists public.mobile_backups (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null check (
    jsonb_typeof(payload) = 'object'
    and payload ->> 'schemaVersion' = '2.0'
  ),
  revision bigint not null check (revision > 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check ((payload ->> 'revision')::bigint = revision)
);

create or replace function public.set_mobile_backup_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.user_id = old.user_id;
  new.created_at = old.created_at;
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists mobile_backups_set_updated_at on public.mobile_backups;
create trigger mobile_backups_set_updated_at
before update on public.mobile_backups
for each row execute function public.set_mobile_backup_updated_at();

alter table public.mobile_backups enable row level security;
alter table public.mobile_backups force row level security;

drop policy if exists "read own mobile backup" on public.mobile_backups;
create policy "read own mobile backup" on public.mobile_backups
for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "insert own mobile backup" on public.mobile_backups;
create policy "insert own mobile backup" on public.mobile_backups
for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "update own mobile backup" on public.mobile_backups;
create policy "update own mobile backup" on public.mobile_backups
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

revoke all on table public.mobile_backups from anon;
revoke all on table public.mobile_backups from authenticated;
grant select, insert, update on table public.mobile_backups to authenticated;

revoke all on function public.set_mobile_backup_updated_at() from public, anon, authenticated;
