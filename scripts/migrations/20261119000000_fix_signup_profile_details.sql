-- Run in the Supabase SQL Editor. Existing nonempty profile values are preserved.
begin;

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'address'
  ) then
    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'profiles' and column_name = 'location'
    ) then
      alter table public.profiles rename column location to address;
    else
      alter table public.profiles add column address text;
    end if;
  elsif exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'location'
  ) then
    update public.profiles set address = location where address is null and location is not null;
  end if;
end $$;

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
  selected_role := case
    when new.raw_user_meta_data->>'role' = 'clinic' then 'clinic'::public.user_role
    else 'patient'::public.user_role
  end;

  insert into public.profiles (id, role, email, full_name, address, phone)
  values (
    new.id, selected_role, new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    coalesce(new.raw_user_meta_data->>'address', new.raw_user_meta_data->>'location'),
    new.raw_user_meta_data->>'phone'
  )
  on conflict (id) do nothing;

  if selected_role = 'clinic' then
    insert into public.clinics (user_id, name, address, phone, email)
    values (
      new.id,
      coalesce(new.raw_user_meta_data->>'clinic_name', new.raw_user_meta_data->>'full_name', 'New clinic'),
      coalesce(new.raw_user_meta_data->>'address', new.raw_user_meta_data->>'location', 'Address pending'),
      new.raw_user_meta_data->>'phone',
      new.email
    )
    on conflict (user_id) do nothing;

    if to_regclass('public.clinic_accounts') is not null then
      select id into registered_clinic_id from public.clinics where user_id = new.id;
      insert into public.clinic_accounts (user_id, clinic_id)
      values (new.id, registered_clinic_id)
      on conflict (user_id) do nothing;
    end if;
  elsif to_regclass('public.patient_accounts') is not null then
    insert into public.patient_accounts (user_id)
    values (new.id)
    on conflict (user_id) do nothing;
  end if;

  return new;
end;
$$;

update public.profiles as profile
set
  full_name = coalesce(profile.full_name, nullif(users.raw_user_meta_data->>'full_name', '')),
  address = coalesce(profile.address, nullif(users.raw_user_meta_data->>'address', ''), nullif(users.raw_user_meta_data->>'location', '')),
  phone = coalesce(profile.phone, nullif(users.raw_user_meta_data->>'phone', ''))
from auth.users as users
where profile.id = users.id
  and (profile.full_name is null or profile.address is null or profile.phone is null);

update public.clinics as clinic
set
  address = case when clinic.address = 'Address pending'
    then coalesce(nullif(users.raw_user_meta_data->>'address', ''), nullif(users.raw_user_meta_data->>'location', ''), clinic.address)
    else clinic.address end,
  phone = coalesce(clinic.phone, nullif(users.raw_user_meta_data->>'phone', '')),
  email = coalesce(clinic.email, users.email)
from auth.users as users
where clinic.user_id = users.id
  and (clinic.address = 'Address pending' or clinic.phone is null or clinic.email is null);

commit;
