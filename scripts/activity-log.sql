-- AppointCare activity history. Run this migration in Supabase SQL Editor.
create table if not exists activity_logs (
  id uuid default gen_random_uuid() primary key,
  actor_id uuid references profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  summary text not null,
  metadata jsonb not null default '{}',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists activity_logs_created_at_idx on activity_logs(created_at desc);
create index if not exists activity_logs_entity_idx on activity_logs(entity_type, entity_id);

alter table activity_logs enable row level security;

drop policy if exists "Admins can view activity logs" on activity_logs;
create policy "Admins can view activity logs" on activity_logs for select using (
  exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin')
);

drop policy if exists "Authenticated users can record activity" on activity_logs;
create policy "Authenticated users can record activity" on activity_logs for insert with check (auth.uid() = actor_id);

create or replace function log_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  changed_id uuid;
  subject text;
begin
  changed_id := coalesce(new.id, old.id);
  if tg_table_name = 'profiles' then
    subject := coalesce(new.full_name, new.email, old.full_name, old.email, 'User');
  elsif tg_table_name = 'clinics' then
    subject := coalesce(new.name, old.name, 'Clinic');
  else
    subject := 'Appointment';
  end if;

  insert into activity_logs (actor_id, action, entity_type, entity_id, summary, metadata)
  values (
    auth.uid(),
    lower(tg_op) || '_' || tg_table_name,
    case when tg_table_name = 'profiles' then 'profile' when tg_table_name = 'clinics' then 'clinic' else 'appointment' end,
    changed_id,
    subject || ' was ' || lower(tg_op),
    jsonb_build_object('table', tg_table_name)
  );
  return coalesce(new, old);
end;
$$;

drop trigger if exists profiles_activity_trigger on profiles;
create trigger profiles_activity_trigger after insert or update or delete on profiles for each row execute function log_activity();
drop trigger if exists clinics_activity_trigger on clinics;
create trigger clinics_activity_trigger after insert or update or delete on clinics for each row execute function log_activity();
drop trigger if exists appointments_activity_trigger on appointments;
create trigger appointments_activity_trigger after insert or update or delete on appointments for each row execute function log_activity();