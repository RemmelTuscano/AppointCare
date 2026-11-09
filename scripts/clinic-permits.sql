-- Clinic permit uploads for verification workflow.
-- Run this migration in Supabase SQL Editor.

-- 1. Add a column to store the uploaded permit file path.
alter table clinics
  add column if not exists permit_url text;

-- 2. Create a storage bucket (run this in SQL Editor or via the Supabase dashboard).
insert into storage.buckets (id, name, public)
values ('clinic_permits', 'Clinic permits', false)
on conflict (id) do update set public = false;

-- 3. Permit owners and trusted admins to access only clinic-scoped objects.
alter table storage.objects enable row level security;

drop policy if exists "Authenticated users can read permit files" on storage.objects;
drop policy if exists "Clinic users can upload permits" on storage.objects;
drop policy if exists "Clinic users can update their permits" on storage.objects;
drop policy if exists "Clinic users can delete their own permits" on storage.objects;
drop policy if exists "Clinic owners and admins can read permits" on storage.objects;
drop policy if exists "Clinic owners and admins can upload permits" on storage.objects;
drop policy if exists "Clinic owners and admins can update permits" on storage.objects;
drop policy if exists "Clinic owners and admins can delete permits" on storage.objects;
drop policy if exists "Enforce clinic permit access boundaries" on storage.objects;

create policy "Clinic owners and admins can read permits"
  on storage.objects for select using (
    bucket_id = 'clinic_permits'
    and (
      coalesce(auth.jwt()->'app_metadata'->>'role' = 'admin', false)
      or exists (
        select 1
        from public.clinics
        where clinics.user_id = auth.uid()
          and (
            (storage.foldername(storage.objects.name))[1] = clinics.id::text
            or storage.filename(storage.objects.name) like clinics.id::text || '-%'
          )
      )
    )
  );

create policy "Clinic owners and admins can upload permits"
  on storage.objects for insert with check (
    bucket_id = 'clinic_permits'
    and (
      coalesce(auth.jwt()->'app_metadata'->>'role' = 'admin', false)
      or exists (
        select 1
        from public.clinics
        where clinics.user_id = auth.uid()
          and (storage.foldername(storage.objects.name))[1] = clinics.id::text
      )
    )
  );

create policy "Clinic owners and admins can update permits"
  on storage.objects for update
  using (
    bucket_id = 'clinic_permits'
    and (
      coalesce(auth.jwt()->'app_metadata'->>'role' = 'admin', false)
      or exists (
        select 1
        from public.clinics
        where clinics.user_id = auth.uid()
          and (
            (storage.foldername(storage.objects.name))[1] = clinics.id::text
            or storage.filename(storage.objects.name) like clinics.id::text || '-%'
          )
      )
    )
  )
  with check (
    bucket_id = 'clinic_permits'
    and (
      coalesce(auth.jwt()->'app_metadata'->>'role' = 'admin', false)
      or exists (
        select 1
        from public.clinics
        where clinics.user_id = auth.uid()
          and (storage.foldername(storage.objects.name))[1] = clinics.id::text
      )
    )
  );

create policy "Clinic owners and admins can delete permits"
  on storage.objects for delete using (
    bucket_id = 'clinic_permits'
    and (
      coalesce(auth.jwt()->'app_metadata'->>'role' = 'admin', false)
      or exists (
        select 1
        from public.clinics
        where clinics.user_id = auth.uid()
          and (
            (storage.foldername(storage.objects.name))[1] = clinics.id::text
            or storage.filename(storage.objects.name) like clinics.id::text || '-%'
          )
      )
    )
  );

create policy "Enforce clinic permit access boundaries"
  on storage.objects as restrictive for all
  using (
    bucket_id <> 'clinic_permits'
    or coalesce(auth.jwt()->'app_metadata'->>'role' = 'admin', false)
    or exists (
      select 1
      from public.clinics
      where clinics.user_id = auth.uid()
        and (
          (storage.foldername(storage.objects.name))[1] = clinics.id::text
          or storage.filename(storage.objects.name) like clinics.id::text || '-%'
        )
    )
  )
  with check (
    bucket_id <> 'clinic_permits'
    or coalesce(auth.jwt()->'app_metadata'->>'role' = 'admin', false)
    or exists (
      select 1
      from public.clinics
      where clinics.user_id = auth.uid()
        and (storage.foldername(storage.objects.name))[1] = clinics.id::text
    )
  );

-- 4. Add an index for faster lookups by bucket.
create index if not exists storage_objects_bucket_idx on storage.objects(bucket_id);
