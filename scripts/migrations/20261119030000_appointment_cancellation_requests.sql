alter table public.appointments
  add column if not exists cancellation_request_status text,
  add column if not exists cancellation_request_reason text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.appointments'::regclass
      and conname = 'appointments_cancellation_request_check'
  ) then
    alter table public.appointments
      add constraint appointments_cancellation_request_check check (
        (cancellation_request_status is null and cancellation_request_reason is null)
        or (
          cancellation_request_status is not null
          and cancellation_request_status in ('pending', 'approved', 'declined')
          and cancellation_request_reason is not null
          and char_length(btrim(cancellation_request_reason)) between 1 and 1000
        )
      );
  end if;
end $$;

create or replace function public.protect_cancellation_request_fields()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if auth.role() in ('anon', 'authenticated') then
    if tg_op = 'INSERT' then
      if new.cancellation_request_status is not null or new.cancellation_request_reason is not null then
        raise exception 'Cancellation requests must be updated through the application.';
      end if;
    elsif new.cancellation_request_status is distinct from old.cancellation_request_status
       or new.cancellation_request_reason is distinct from old.cancellation_request_reason
       or (old.cancellation_request_status = 'pending' and new.status is distinct from old.status) then
      raise exception 'Cancellation requests must be updated through the application.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_cancellation_request_fields on public.appointments;
create trigger protect_cancellation_request_fields
  before insert or update on public.appointments
  for each row execute function public.protect_cancellation_request_fields();
