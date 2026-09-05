-- ============================================================================
-- mitbach / מטבח — image storage
--
-- Scraped images are copied here rather than hotlinked: Instagram and Facebook
-- CDN URLs carry short-lived signatures and go dead within hours.
--
-- The bucket is public-read. Paths are {user_id}/{uuid}.{ext}, so a URL is not
-- guessable, but anyone holding one can fetch the image without a session.
-- That is the trade for rendering grids without signing every thumbnail; move
-- to a private bucket with signed URLs if recipe photos ever become sensitive.
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'recipe-images',
  'recipe-images',
  true,
  8 * 1024 * 1024,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']
)
on conflict (id) do nothing;

create policy "recipe images are readable by anyone with the url"
  on storage.objects for select
  using (bucket_id = 'recipe-images');

create policy "users upload into their own folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'recipe-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "users replace their own images"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'recipe-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "users delete their own images"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'recipe-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
