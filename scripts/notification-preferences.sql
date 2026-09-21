-- Persist notification channel choices for each user.
alter table profiles
  add column if not exists notification_preferences jsonb not null default '{"email": true, "sms": true}'::jsonb;

update profiles
set notification_preferences = '{"email": true, "sms": true}'::jsonb
where notification_preferences is null;