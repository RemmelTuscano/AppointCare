-- Keep automated application backups private and inaccessible to direct client requests.
insert into storage.buckets (id, name, public)
values ('admin_backups', 'Administrator backups', false)
on conflict (id) do update set public = false;

alter table storage.objects enable row level security;

drop policy if exists "Enforce administrator backup access" on storage.objects;
create policy "Enforce administrator backup access" on storage.objects as restrictive for all
using (
  bucket_id <> 'admin_backups'
  or coalesce(auth.role() = 'service_role', false)
)
with check (
  bucket_id <> 'admin_backups'
  or coalesce(auth.role() = 'service_role', false)
);
