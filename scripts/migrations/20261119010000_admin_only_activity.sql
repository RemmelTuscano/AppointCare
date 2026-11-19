-- Keep existing history, but show and record only actions attributable to administrators.
begin;

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'activity_logs' and column_name = 'actor_is_admin'
  ) then
    alter table public.activity_logs add column actor_is_admin boolean not null default false;

    update public.activity_logs as activity
    set actor_is_admin = true
    from auth.users as actor
    where activity.actor_id = actor.id
      and actor.raw_app_meta_data->>'role' = 'admin';
  end if;
end $$;

create or replace function public.restrict_activity_to_admins()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from auth.users
    where id = new.actor_id and raw_app_meta_data->>'role' = 'admin'
  ) then
    return null;
  end if;

  new.actor_is_admin := true;
  return new;
end;
$$;

drop trigger if exists activity_logs_admin_only on public.activity_logs;
create trigger activity_logs_admin_only
  before insert on public.activity_logs
  for each row execute function public.restrict_activity_to_admins();

commit;
