-- Existing appointments have no recorded service because booking did not save it.
alter table public.appointments add column if not exists service text;
