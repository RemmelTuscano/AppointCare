-- Run once in the Supabase SQL Editor.
-- Restores the missing RLS policy that lets a user mark their own notifications as read.
-- Without this, UPDATE requests silently match 0 rows (no error), so "read" state never persists.

drop policy if exists "Users can mark own notifications as read" on public.notifications;

create policy "Users can mark own notifications as read"
  on public.notifications for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
