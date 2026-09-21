-- Run once in the Supabase SQL Editor.
-- This adds the number of patient appointments each clinic accepts per day and
-- reserves capacity atomically to prevent simultaneous bookings from exceeding it.

alter table public.clinics add column if not exists daily_capacity integer not null default 10;
alter table public.clinics drop constraint if exists clinics_daily_capacity_check;
alter table public.clinics add constraint clinics_daily_capacity_check check (daily_capacity > 0);

create or replace function public.book_clinic_appointment(
  p_clinic_id uuid,
  p_doctor_id uuid,
  p_scheduled_at timestamp with time zone,
  p_notes text default null
)
returns public.appointments
language plpgsql
security definer
set search_path = public
as $$
declare
  clinic_capacity integer;
  active_bookings integer;
  booked_appointment public.appointments;
begin
  if auth.uid() is null then raise exception 'You must be signed in to book an appointment'; end if;

  perform pg_advisory_xact_lock(hashtext(p_clinic_id::text || (p_scheduled_at at time zone 'UTC')::date::text));
  select daily_capacity into clinic_capacity from public.clinics where id = p_clinic_id for update;
  if clinic_capacity is null then raise exception 'Clinic not found'; end if;

  if not exists (select 1 from public.doctors where id = p_doctor_id and clinic_id = p_clinic_id and is_available) then
    raise exception 'This doctor is no longer available';
  end if;

  select count(*) into active_bookings from public.appointments
  where clinic_id = p_clinic_id
    and (scheduled_at at time zone 'UTC')::date = (p_scheduled_at at time zone 'UTC')::date
    and status in ('pending', 'confirmed');

  if active_bookings >= clinic_capacity then raise exception 'This clinic is fully booked for the selected date'; end if;

  insert into public.appointments (patient_id, clinic_id, doctor_id, scheduled_at, notes, status)
  values (auth.uid(), p_clinic_id, p_doctor_id, p_scheduled_at, p_notes, 'pending')
  returning * into booked_appointment;

  return booked_appointment;
end;
$$;

grant execute on function public.book_clinic_appointment(uuid, uuid, timestamp with time zone, text) to authenticated;