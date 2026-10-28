create extension if not exists pgcrypto;

create table if not exists public.memories (
  id uuid primary key default gen_random_uuid(),
  title text not null default 'A little memory' check (char_length(title) <= 180),
  caption text not null default '' check (char_length(caption) <= 4000),
  memory_date date,
  category text not null default 'Little moments' check (char_length(category) <= 80),
  media_type text not null default 'image' check (media_type in ('image', 'video', 'audio')),
  media_path text,
  sort_order bigint not null default (extract(epoch from now()) * 1000)::bigint,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  constraint media_path_required_for_media check (media_path is not null or media_type in ('image','video','audio'))
);

create index if not exists memories_published_sort_idx
  on public.memories (is_published, sort_order, memory_date);

alter table public.memories enable row level security;

-- Re-runnable policies: remove old versions first.
drop policy if exists "Anyone can read published memories" on public.memories;
drop policy if exists "Admins can add memories" on public.memories;
drop policy if exists "Admins can update memories" on public.memories;
drop policy if exists "Admins can delete memories" on public.memories;

create policy "Anyone can read published memories"
  on public.memories for select
  to anon, authenticated
  using (is_published = true or (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create policy "Admins can add memories"
  on public.memories for insert
  to authenticated
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create policy "Admins can update memories"
  on public.memories for update
  to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create policy "Admins can delete memories"
  on public.memories for delete
  to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

grant select on public.memories to anon, authenticated;
grant insert, update, delete on public.memories to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'memories',
  'memories',
  true,
  52428800,
  array['image/jpeg','image/png','image/webp','image/gif','image/avif','video/mp4','video/webm','video/quicktime','audio/mpeg','audio/mp4','audio/wav','audio/ogg','audio/webm']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Anyone can view memory media" on storage.objects;
drop policy if exists "Admins can upload memory media" on storage.objects;
drop policy if exists "Admins can update memory media" on storage.objects;
drop policy if exists "Admins can delete memory media" on storage.objects;

create policy "Anyone can view memory media"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'memories');

create policy "Admins can upload memory media"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'memories'
    and (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

create policy "Admins can update memory media"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'memories'
    and (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  )
  with check (
    bucket_id = 'memories'
    and (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

create policy "Admins can delete memory media"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'memories'
    and (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );