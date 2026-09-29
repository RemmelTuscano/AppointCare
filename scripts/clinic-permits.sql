-- Clinic permit uploads for verification workflow.
-- Run this migration in Supabase SQL Editor.

-- 1. Add a column to store the uploaded permit file path.
alter table clinics
  add column if not exists permit_url text;

-- 2. Create a storage bucket (run this in SQL Editor or via the Supabase dashboard).
insert into storage.buckets (id, name, public) values ('clinic_permits', 'Clinic permits', true)
on conflict (id) do nothing;

-- 3. Enable RLS on storage.objects (if not already enabled) and set policies for the clinic_permits bucket.
alter table storage.objects enable row level security;

drop policy if exists "Authenticated users can read permit files" on storage.objects;
create policy "Authenticated users can read permit files"
  on storage.objects for select using (
    bucket_id = 'clinic_permits' and auth.uid() is not null
  );

drop policy if exists "Clinic users can upload permits" on storage.objects;
create policy "Clinic users can upload permits"
  on storage.objects for insert with check (
    bucket_id = 'clinic_permits' and auth.uid() is not null
  );

drop policy if exists "Clinic users can update their permits" on storage.objects;
create policy "Clinic users can update their permits"
  on storage.objects for update using (
    bucket_id = 'clinic_permits' and auth.uid() is not null
  );

drop policy if exists "Clinic users can delete their own permits" on storage.objects;
create policy "Clinic users can delete their own permits"
  on storage.objects for delete using (
    bucket_id = 'clinic_permits' and auth.uid() is not null
  );

-- 4. Add an index for faster lookups by bucket.
create index if not exists storage_objects_bucket_idx on storage.objects(bucket_id);
