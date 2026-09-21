-- Run once in the Supabase SQL Editor.
-- Passwords stay in auth.users. These tables separate patient and clinic account data
-- without duplicating credentials or secrets in the public schema.

-- Remove legacy recursive policies that cause PostgREST to return a 500 when the app
-- reads the authenticated user's role from profiles.
alter table public.profiles enable row level security;

do $$
declare
  profile_policy record;
begin
  for profile_policy in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
  loop
    execute format('drop policy if exists %I on public.profiles', profile_policy.policyname);
  end loop;
end $$;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create table if not exists public.patient_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamp with time zone not null default timezone('utc'::text, now())
);

create table if not exists public.clinic_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  clinic_id uuid unique references public.clinics(id) on delete cascade,
  created_at timestamp with time zone not null default timezone('utc'::text, now())
);

alter table public.patient_accounts enable row level security;
alter table public.clinic_accounts enable row level security;

drop policy if exists "Patients can view own account" on public.patient_accounts;
create policy "Patients can view own account"
  on public.patient_accounts for select
  using (auth.uid() = user_id);

drop policy if exists "Clinic users can view own account" on public.clinic_accounts;
create policy "Clinic users can view own account"
  on public.clinic_accounts for select
  using (auth.uid() = user_id);

-- Backfill the role-specific account records for users that registered before this migration.
insert into public.patient_accounts (user_id)
select id
from public.profiles
where role = 'patient'
on conflict (user_id) do nothing;

insert into public.clinic_accounts (user_id, clinic_id)
select profiles.id, clinics.id
from public.profiles
join public.clinics on clinics.user_id = profiles.id
where profiles.role = 'clinic'
on conflict (user_id) do update
set clinic_id = excluded.clinic_id;

-- Replace the auth trigger so clinic registration is atomic. It creates the role-specific
-- account record and registered clinic using the metadata supplied by the signup form.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_role public.user_role;
  registered_clinic_id uuid;
begin
  selected_role := coalesce((new.raw_user_meta_data->>'role')::public.user_role, 'patient');

  insert into public.profiles (id, role, email, full_name, location)
  values (
    new.id,
    selected_role,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    new.raw_user_meta_data->>'location'
  )
  on conflict (id) do nothing;

  if selected_role = 'clinic' then
    insert into public.clinics (user_id, name, address, email)
    values (
      new.id,
      coalesce(new.raw_user_meta_data->>'clinic_name', new.raw_user_meta_data->>'full_name', 'New clinic'),
      coalesce(new.raw_user_meta_data->>'location', 'Address pending'),
      new.email
    )
    on conflict (user_id) do update
    set
      name = excluded.name,
      address = excluded.address,
      email = excluded.email
    returning id into registered_clinic_id;

    insert into public.clinic_accounts (user_id, clinic_id)
    values (new.id, registered_clinic_id)
    on conflict (user_id) do update
    set clinic_id = excluded.clinic_id;
  else
    insert into public.patient_accounts (user_id)
    values (new.id)
    on conflict (user_id) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Confirm every account has exactly one role-specific account record.
select
  profiles.email,
  profiles.role,
  patient_accounts.user_id is not null as has_patient_account,
  clinic_accounts.clinic_id as registered_clinic_id
from public.profiles
left join public.patient_accounts on patient_accounts.user_id = profiles.id
left join public.clinic_accounts on clinic_accounts.user_id = profiles.id
order by profiles.created_at desc;
