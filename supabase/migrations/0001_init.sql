-- СКВОЗНИКИ: schema, Row Level Security, RPCs and storage.
-- Apply once in Supabase: SQL Editor -> paste -> Run (or `supabase db push`).
--
-- Access model
--   anon (the public site):  INSERT into the three submission tables (only safe columns),
--                            SELECT approved + published rows (only public columns).
--   admins (team, by email): everything, checked by public.is_admin().
--   service_role (server):   rate limits and votes via SECURITY DEFINER functions.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- types
do $$ begin
  create type submission_status as enum ('new', 'in_progress', 'approved', 'rejected');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------- admins
create table if not exists public.admins (
  email text primary key check (email = lower(email)),
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admins
    where email = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

-- ---------------------------------------------------------------- submissions
create table if not exists public.submissions_participate (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null check (char_length(name) between 2 and 40),
  grade text not null check (grade ~ '^(7|8|9|10|11|12)[A-ZА-ЯӘҒҚҢӨҰҮҺІЁ]{0,2}$'),
  role text not null check (role in ('guest', 'rubric', 'team_shoot', 'team_edit', 'team_script')),
  pitch text not null check (char_length(pitch) between 20 and 600),
  contact_type text not null check (contact_type in ('telegram', 'instagram')),
  contact text not null check (contact ~ '^[A-Za-z0-9._]{3,32}$'),
  consent boolean not null check (consent),
  status submission_status not null default 'new',
  admin_note text
);

create table if not exists public.submissions_ideas (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  idea text not null check (char_length(idea) between 10 and 500),
  category text not null check (category in ('topic', 'rubric', 'question')),
  name text check (name is null or char_length(name) <= 40),
  status submission_status not null default 'new',
  published boolean not null default false,
  public_text text check (public_text is null or char_length(public_text) <= 500),
  votes_count integer not null default 0,
  admin_note text,
  -- Nothing reaches the site unless a person approved it.
  constraint ideas_publish_requires_approval check (not published or status = 'approved')
);

create table if not exists public.submissions_news (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  what text not null check (char_length(what) between 15 and 1000),
  happened_on date,
  when_preset text not null default 'date' check (when_preset in ('today', 'yesterday', 'week', 'date')),
  source text check (source is null or char_length(source) <= 300),
  photo_path text,
  is_anonymous boolean not null default true,
  name text check (name is null or char_length(name) <= 40),
  status submission_status not null default 'new',
  published boolean not null default false,
  headline text check (headline is null or char_length(headline) <= 140),
  admin_note text,
  constraint news_publish_requires_approval check (not published or (status = 'approved' and headline is not null)),
  constraint news_anonymous_has_no_name check (not is_anonymous or name is null)
);

create table if not exists public.episodes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  number integer not null,
  title text not null,
  guest text,
  description text,
  video_url text check (video_url is null or video_url ~ '^https://'),
  published_on date,
  is_published boolean not null default true
);

create table if not exists public.idea_votes (
  idea_id uuid not null references public.submissions_ideas (id) on delete cascade,
  voter_hash text not null,
  created_at timestamptz not null default now(),
  primary key (idea_id, voter_hash)
);

create table if not exists public.rate_limit_hits (
  key_hash text not null,
  created_at timestamptz not null default now()
);

create index if not exists participate_created_idx on public.submissions_participate (created_at desc);
create index if not exists ideas_public_idx on public.submissions_ideas (published, votes_count desc);
create index if not exists news_public_idx on public.submissions_news (published, created_at desc);
create index if not exists rate_limit_idx on public.rate_limit_hits (key_hash, created_at desc);

-- ---------------------------------------------------------------- RLS
alter table public.admins enable row level security;
alter table public.submissions_participate enable row level security;
alter table public.submissions_ideas enable row level security;
alter table public.submissions_news enable row level security;
alter table public.episodes enable row level security;
alter table public.idea_votes enable row level security;
alter table public.rate_limit_hits enable row level security;

-- Start from nothing, then grant exactly what each role needs.
revoke all on public.admins, public.submissions_participate, public.submissions_ideas,
  public.submissions_news, public.episodes, public.idea_votes, public.rate_limit_hits
  from anon, authenticated;

-- anon: insert only the columns a student fills in. status / published / votes keep their defaults.
grant insert (name, grade, role, pitch, contact_type, contact, consent)
  on public.submissions_participate to anon, authenticated;
grant insert (idea, category, name) on public.submissions_ideas to anon, authenticated;
grant insert (what, happened_on, when_preset, source, photo_path, is_anonymous, name)
  on public.submissions_news to anon, authenticated;

-- anon: read only public columns of approved rows.
grant select (id, created_at, category, votes_count, public_text, published, status)
  on public.submissions_ideas to anon;
grant select (id, created_at, headline, happened_on, published, status)
  on public.submissions_news to anon;
grant select on public.episodes to anon;

-- authenticated team members: full access, RLS narrows it to admins.
grant select, insert, update, delete on public.submissions_participate, public.submissions_ideas,
  public.submissions_news, public.episodes to authenticated;
grant select on public.admins to authenticated;

drop policy if exists "anon insert participate" on public.submissions_participate;
create policy "anon insert participate" on public.submissions_participate
  for insert to anon, authenticated with check (status = 'new' and admin_note is null);

drop policy if exists "anon insert ideas" on public.submissions_ideas;
create policy "anon insert ideas" on public.submissions_ideas
  for insert to anon, authenticated
  with check (status = 'new' and not published and votes_count = 0 and public_text is null and admin_note is null);

drop policy if exists "anon insert news" on public.submissions_news;
create policy "anon insert news" on public.submissions_news
  for insert to anon, authenticated
  with check (status = 'new' and not published and headline is null and admin_note is null);

drop policy if exists "public read ideas" on public.submissions_ideas;
create policy "public read ideas" on public.submissions_ideas
  for select to anon using (published and status = 'approved');

drop policy if exists "public read news" on public.submissions_news;
create policy "public read news" on public.submissions_news
  for select to anon using (published and status = 'approved');

drop policy if exists "public read episodes" on public.episodes;
create policy "public read episodes" on public.episodes
  for select to anon using (is_published);

-- Admin policies (one per table, every command).
drop policy if exists "admins all participate" on public.submissions_participate;
create policy "admins all participate" on public.submissions_participate
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admins all ideas" on public.submissions_ideas;
create policy "admins all ideas" on public.submissions_ideas
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admins all news" on public.submissions_news;
create policy "admins all news" on public.submissions_news
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admins all episodes" on public.episodes;
create policy "admins all episodes" on public.episodes
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admins read admins" on public.admins;
create policy "admins read admins" on public.admins
  for select to authenticated using (public.is_admin());

-- idea_votes and rate_limit_hits: no policies, so only SECURITY DEFINER functions touch them.

-- ---------------------------------------------------------------- RPCs
-- Counters for the home page. Exposes totals only, never rows.
create or replace function public.public_stats()
returns json
language sql
stable
security definer
set search_path = public
as $$
  select json_build_object(
    'participate', (select count(*) from public.submissions_participate),
    'ideas', (select count(*) from public.submissions_ideas),
    'news', (select count(*) from public.submissions_news)
  );
$$;
grant execute on function public.public_stats() to anon, authenticated;

-- One vote per idea per device hash. Called by the server with the service key.
create or replace function public.cast_vote(p_idea uuid, p_voter text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
  v_inserted integer;
begin
  if not exists (select 1 from public.submissions_ideas where id = p_idea and published and status = 'approved') then
    return null;
  end if;
  insert into public.idea_votes (idea_id, voter_hash) values (p_idea, p_voter) on conflict do nothing;
  get diagnostics v_inserted = row_count;
  if v_inserted > 0 then
    update public.submissions_ideas set votes_count = votes_count + 1 where id = p_idea returning votes_count into v_count;
  else
    select votes_count into v_count from public.submissions_ideas where id = p_idea;
  end if;
  return json_build_object('count', v_count, 'accepted', v_inserted > 0);
end;
$$;
revoke execute on function public.cast_vote(uuid, text) from public, anon, authenticated;
grant execute on function public.cast_vote(uuid, text) to service_role;

-- Sliding-window rate limit on a hashed key (never a raw IP).
create or replace function public.hit_rate_limit(p_key text, p_max integer, p_window_seconds integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_recent integer;
begin
  delete from public.rate_limit_hits where created_at < now() - interval '1 day';
  select count(*) into v_recent from public.rate_limit_hits
    where key_hash = p_key and created_at > now() - make_interval(secs => p_window_seconds);
  if v_recent >= p_max then
    return false;
  end if;
  insert into public.rate_limit_hits (key_hash) values (p_key);
  return true;
end;
$$;
revoke execute on function public.hit_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.hit_rate_limit(text, integer, integer) to service_role;

-- ---------------------------------------------------------------- storage
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('news-photos', 'news-photos', false, 8388608, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

drop policy if exists "anon upload news photos" on storage.objects;
create policy "anon upload news photos" on storage.objects
  for insert to anon, authenticated with check (bucket_id = 'news-photos');

drop policy if exists "admins read news photos" on storage.objects;
create policy "admins read news photos" on storage.objects
  for select to authenticated using (bucket_id = 'news-photos' and public.is_admin());

drop policy if exists "admins delete news photos" on storage.objects;
create policy "admins delete news photos" on storage.objects
  for delete to authenticated using (bucket_id = 'news-photos' and public.is_admin());
