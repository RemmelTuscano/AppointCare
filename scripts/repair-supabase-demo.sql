-- Run this once in the Supabase SQL Editor for the configured project.
-- It repairs the existing demo accounts without recreating auth.users records.

-- Remove the broken recursive profiles policies currently blocking public clinic reads.
-- The application only needs users to read, update, and insert their own profile.
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

-- Keep the oldest clinic for each owner before enforcing one clinic per account.
-- Existing appointments and doctors are preserved by moving them to that clinic.
with ranked_clinics as (
  select
    id,
    first_value(id) over (partition by user_id order by created_at, id) as keeper_id
  from public.clinics
)
update public.appointments appointments
set clinic_id = ranked_clinics.keeper_id
from ranked_clinics
where appointments.clinic_id = ranked_clinics.id
  and ranked_clinics.id <> ranked_clinics.keeper_id;

with ranked_clinics as (
  select
    id,
    first_value(id) over (partition by user_id order by created_at, id) as keeper_id
  from public.clinics
)
update public.doctors doctors
set clinic_id = ranked_clinics.keeper_id
from ranked_clinics
where doctors.clinic_id = ranked_clinics.id
  and ranked_clinics.id <> ranked_clinics.keeper_id;

delete from public.clinics clinics
using (
  select
    id,
    row_number() over (partition by user_id order by created_at, id) as clinic_number
  from public.clinics
) duplicates
where clinics.id = duplicates.id
  and duplicates.clinic_number > 1;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'clinics_user_id_key'
      and conrelid = 'public.clinics'::regclass
  ) then
    alter table public.clinics
      add constraint clinics_user_id_key unique (user_id);
  end if;
end $$;

-- Repair profiles created before the clinic role was written correctly.
insert into public.profiles (id, role, full_name, email, updated_at)
select id, 'patient'::public.user_role, 'Test Patient', email, now()
from auth.users
where email = 'patient@appointcare.test'
on conflict (id) do update
set
  role = excluded.role,
  full_name = excluded.full_name,
  email = excluded.email,
  updated_at = excluded.updated_at;

insert into public.profiles (id, role, full_name, email, updated_at)
select id, 'clinic'::public.user_role, 'Test Clinic', email, now()
from auth.users
where email = 'clinic@appointcare.test'
on conflict (id) do update
set
  role = excluded.role,
  full_name = excluded.full_name,
  email = excluded.email,
  updated_at = excluded.updated_at;

-- Create or repair the demo clinic.
insert into public.clinics (
  user_id, name, address, phone, email, description, is_verified
)
select
  id,
  'Test Clinic',
  '123 Test Street',
  '+1-555-0100',
  'clinic@appointcare.test',
  'Test clinic for AppointCare demo',
  true
from auth.users
where email = 'clinic@appointcare.test'
on conflict (user_id) do update
set
  name = excluded.name,
  address = excluded.address,
  phone = excluded.phone,
  email = excluded.email,
  description = excluded.description,
  is_verified = excluded.is_verified;

-- Add a visible doctor if the demo clinic has no doctor records yet.
insert into public.doctors (clinic_id, name, specialization, is_available)
select c.id, 'Dr. Alex Morgan', 'General Practice', true
from public.clinics c
where c.email = 'clinic@appointcare.test'
  and not exists (
    select 1 from public.doctors d where d.clinic_id = c.id
  );

-- Confirm the accounts and directory entry are ready for the app.
select
  u.email,
  p.role,
  c.name as clinic_name,
  c.is_verified,
  count(d.id) as doctor_count
from auth.users u
left join public.profiles p on p.id = u.id
left join public.clinics c on c.user_id = u.id
left join public.doctors d on d.clinic_id = c.id
where u.email in ('patient@appointcare.test', 'clinic@appointcare.test')
group by u.email, p.role, c.name, c.is_verified
order by u.email;
