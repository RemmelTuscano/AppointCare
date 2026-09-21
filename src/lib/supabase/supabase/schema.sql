-- Roles enum
create type user_role as enum ('admin', 'clinic', 'patient');

-- Profiles table (extends auth.users)
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  role user_role not null default 'patient',
  full_name text,
  email text unique not null,
  location text,
  phone text,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Clinics
create table clinics (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null unique,
  name text not null,
  address text not null,
  phone text,
  email text,
  description text,
  is_verified boolean default false,
  daily_capacity integer not null default 10 check (daily_capacity > 0),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Doctors
create table doctors (
  id uuid default gen_random_uuid() primary key,
  clinic_id uuid references clinics(id) on delete cascade not null,
  name text not null,
  specialization text,
  is_available boolean default true,
  schedule jsonb default '[]',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Appointments
create table appointments (
  id uuid default gen_random_uuid() primary key,
  patient_id uuid references profiles(id) on delete cascade not null,
  clinic_id uuid references clinics(id) on delete cascade not null,
  doctor_id uuid references doctors(id) on delete set null,
  scheduled_at timestamp with time zone not null,
  status text check (status in ('pending', 'confirmed', 'cancelled', 'completed')) default 'pending',
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Notifications
create table notifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  type text check (type in ('email', 'in_app')) default 'in_app',
  title text not null,
  message text not null,
  is_read boolean default false,
  metadata jsonb default '{}',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS Policies
alter table profiles enable row level security;
alter table clinics enable row level security;
alter table doctors enable row level security;
alter table appointments enable row level security;
alter table notifications enable row level security;

-- Profiles: users can read/update own profile
create policy "Users can view own profile"
  on profiles for select using (auth.uid() = id);

create policy "Users can update own profile"
  on profiles for update using (auth.uid() = id) with check (auth.uid() = id);

create policy "Users can insert own profile"
  on profiles for insert with check (auth.uid() = id or auth.uid() is null);

-- Clinics: public read, owner manage
create policy "Clinics are viewable by everyone"
  on clinics for select using (true);

create policy "Clinic owners can manage own clinic"
  on clinics for all using (user_id = auth.uid());

create policy "Clinic owners can insert clinics"
  on clinics for insert with check (user_id = auth.uid());

-- Doctors: public read availability, clinic owner manage
create policy "Doctors are viewable by everyone"
  on doctors for select using (true);

create policy "Clinic owners can manage doctors"
  on doctors for all using (
    (select user_id from clinics where id = clinic_id) = auth.uid()
  );

create policy "Clinic owners can insert doctors"
  on doctors for insert with check (
    (select user_id from clinics where id = clinic_id) = auth.uid()
  );

-- Appointments: patients see own, clinics see own clinic's
create policy "Patients can view own appointments"
  on appointments for select using (patient_id = auth.uid());

create policy "Clinics can view own appointments"
  on appointments for select using (
    (select user_id from clinics where id = clinic_id) = auth.uid()
  );

create policy "Patients can create appointments"
  on appointments for insert with check (patient_id = auth.uid());

create or replace function book_clinic_appointment(
  p_clinic_id uuid,
  p_doctor_id uuid,
  p_scheduled_at timestamp with time zone,
  p_notes text default null
)
returns appointments
language plpgsql
security definer
set search_path = public
as $$
declare
  clinic_capacity integer;
  active_bookings integer;
  booked_appointment appointments;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to book an appointment';
  end if;

  perform pg_advisory_xact_lock(hashtext(p_clinic_id::text || (p_scheduled_at at time zone 'UTC')::date::text));

  select daily_capacity into clinic_capacity from clinics where id = p_clinic_id for update;
  if clinic_capacity is null then raise exception 'Clinic not found'; end if;

  if not exists (select 1 from doctors where id = p_doctor_id and clinic_id = p_clinic_id and is_available) then
    raise exception 'This doctor is no longer available';
  end if;

  select count(*) into active_bookings from appointments
  where clinic_id = p_clinic_id
    and (scheduled_at at time zone 'UTC')::date = (p_scheduled_at at time zone 'UTC')::date
    and status in ('pending', 'confirmed');

  if active_bookings >= clinic_capacity then raise exception 'This clinic is fully booked for the selected date'; end if;

  insert into appointments (patient_id, clinic_id, doctor_id, scheduled_at, notes, status)
  values (auth.uid(), p_clinic_id, p_doctor_id, p_scheduled_at, p_notes, 'pending')
  returning * into booked_appointment;

  return booked_appointment;
end;
$$;

grant execute on function book_clinic_appointment(uuid, uuid, timestamp with time zone, text) to authenticated;

create policy "Patients can update own appointments"
  on appointments for update using (patient_id = auth.uid());

create policy "Clinics can update appointment status"
  on appointments for update using (
    (select user_id from clinics where id = clinic_id) = auth.uid()
  );

-- Notifications: users see own
create policy "Users can view own notifications"
  on notifications for select using (user_id = auth.uid());

create policy "Users can mark own notifications as read"
  on notifications for update using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "System can create notifications"
  on notifications for insert with check (true);

-- Functions
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_role user_role;
begin
  selected_role := coalesce((new.raw_user_meta_data->>'role')::user_role, 'patient');

  insert into profiles (id, role, email, full_name, location, phone)
  values (
    new.id,
    selected_role,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    new.raw_user_meta_data->>'location',
    new.raw_user_meta_data->>'phone'
  )
  on conflict (id) do nothing;

  if selected_role = 'clinic' then
    insert into clinics (user_id, name, address, phone, email)
    values (
      new.id,
      coalesce(new.raw_user_meta_data->>'clinic_name', new.raw_user_meta_data->>'full_name', 'New clinic'),
      coalesce(new.raw_user_meta_data->>'location', 'Address pending'),
      new.raw_user_meta_data->>'phone',
      new.email
    )
    on conflict (user_id) do nothing;
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- Realtime
alter publication supabase_realtime add table appointments;
alter publication supabase_realtime add table notifications;