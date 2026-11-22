-- СКВОЗНЯКИ: team accounts, admin RPCs, browser voting and spam brakes.
-- Apply after 0001 (SQL Editor -> paste -> Run).
--
-- Why: the site can run as a static page (GitHub Pages) with no server of its own.
-- The browser then talks to Supabase directly with the public anon key, so every
-- privileged action goes through a SECURITY DEFINER function that checks a session token.
--
-- Team model
--   public.admins       one row per team member. is_owner = can invite and remove people.
--   invite              the owner adds an email and gets a one-time code (valid 7 days).
--                       The new member opens /admin, enters email + code, picks a password.
--   admin_sessions      30-day sessions; only a SHA-256 of the token is stored.
--   No email is ever sent, so no SMTP setup is needed.

-- ---------------------------------------------------------------- team tables
alter table public.admins
  add column if not exists password_hash text,
  add column if not exists is_owner boolean not null default false,
  add column if not exists invite_hash text,
  add column if not exists invite_expires_at timestamptz,
  add column if not exists added_by text;

create table if not exists public.admin_sessions (
  token_hash text primary key,
  email text not null references public.admins (email) on delete cascade on update cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create table if not exists public.admin_login_fails (
  key text not null,
  created_at timestamptz not null default now()
);
create index if not exists admin_login_fails_idx on public.admin_login_fails (key, created_at desc);

alter table public.admin_sessions enable row level security;
alter table public.admin_login_fails enable row level security;
revoke all on public.admin_sessions, public.admin_login_fails from anon, authenticated;

-- The old Supabase-Auth admin path is retired: nobody gets table access through a JWT email any more.
-- (Supabase Auth allows sign-ups by default, so trusting a JWT email was the weakest link.)
create or replace function public.is_admin()
returns boolean language sql stable set search_path = public as $$ select false $$;

drop policy if exists "admins all participate" on public.submissions_participate;
drop policy if exists "admins all ideas" on public.submissions_ideas;
drop policy if exists "admins all news" on public.submissions_news;
drop policy if exists "admins all episodes" on public.episodes;
drop policy if exists "admins read admins" on public.admins;
drop policy if exists "admins read news photos" on storage.objects;
drop policy if exists "admins delete news photos" on storage.objects;
revoke select, update, delete on public.submissions_participate, public.submissions_ideas,
  public.submissions_news, public.episodes, public.admins from authenticated;
grant select on public.episodes to authenticated;
grant select (id, created_at, category, votes_count, public_text, published, status)
  on public.submissions_ideas to authenticated;
grant select (id, created_at, headline, happened_on, published, status)
  on public.submissions_news to authenticated;

-- ---------------------------------------------------------------- helpers (not callable by clients)
create or replace function public._sha(p text)
returns text language sql immutable set search_path = public, extensions as $$
  select encode(extensions.digest(coalesce(p, ''), 'sha256'), 'hex');
$$;

create or replace function public._invite_code()
returns text language plpgsql volatile set search_path = public, extensions as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- no 0/O, 1/I
  b bytea := extensions.gen_random_bytes(8);
  out text := '';
begin
  for i in 0..7 loop
    out := out || substr(alphabet, (get_byte(b, i) % 32) + 1, 1);
  end loop;
  return out;
end $$;

create or replace function public._new_session(p_email text)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare
  v_token text := encode(extensions.gen_random_bytes(32), 'hex');
  v_owner boolean;
begin
  delete from admin_sessions where expires_at < now();
  insert into admin_sessions (token_hash, email, expires_at) values (_sha(v_token), p_email, now() + interval '30 days');
  select is_owner into v_owner from admins where email = p_email;
  return json_build_object('token', v_token, 'email', p_email, 'is_owner', v_owner);
end $$;

/** Who owns this token. Raises 'unauthorized' otherwise. */
create or replace function public._admin(p_token text)
returns public.admins language plpgsql security definer set search_path = public, extensions as $$
declare
  v public.admins;
begin
  select a.* into v from admin_sessions s join admins a on a.email = s.email
    where s.token_hash = _sha(p_token) and s.expires_at > now();
  if v.email is null then
    raise exception 'unauthorized' using errcode = '28000';
  end if;
  return v;
end $$;

create or replace function public._owner(p_token text)
returns public.admins language plpgsql security definer set search_path = public, extensions as $$
declare
  v public.admins := _admin(p_token);
begin
  if not v.is_owner then
    raise exception 'owner_only' using errcode = '42501';
  end if;
  return v;
end $$;

/** Too many wrong passwords/codes for this key in 15 minutes. */
create or replace function public._locked(p_key text)
returns boolean language sql stable security definer set search_path = public as $$
  select count(*) >= 8 from admin_login_fails where key = p_key and created_at > now() - interval '15 minutes';
$$;

create or replace function public._fail(p_key text)
returns void language sql security definer set search_path = public as $$
  delete from admin_login_fails where created_at < now() - interval '1 day';
  insert into admin_login_fails (key) values (p_key);
$$;

-- ---------------------------------------------------------------- sign in
-- Errors come back as {"error": "..."} instead of exceptions, so the failed-attempt row is kept.

create or replace function public.admin_login(p_email text, p_password text)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v public.admins;
begin
  if _locked(v_email) then return json_build_object('error', 'locked'); end if;
  select * into v from admins where email = v_email;
  if v.email is null or v.password_hash is null
     or v.password_hash <> extensions.crypt(coalesce(p_password, ''), v.password_hash) then
    perform _fail(v_email);
    return json_build_object('error', case when v.email is not null and v.password_hash is null then 'needs_invite' else 'invalid' end);
  end if;
  delete from admin_login_fails where key = v_email;
  return _new_session(v_email);
end $$;

create or replace function public.admin_claim(p_email text, p_code text, p_password text)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_key text := 'invite:' || v_email;
  v public.admins;
begin
  if _locked(v_key) then return json_build_object('error', 'locked'); end if;
  if char_length(coalesce(p_password, '')) < 8 then return json_build_object('error', 'weak'); end if;
  select * into v from admins where email = v_email;
  if v.email is null or v.invite_hash is null
     or v.invite_hash <> _sha(upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'))) then
    perform _fail(v_key);
    return json_build_object('error', 'invalid');
  end if;
  if v.invite_expires_at < now() then return json_build_object('error', 'expired'); end if;
  update admins
    set password_hash = extensions.crypt(p_password, extensions.gen_salt('bf', 10)),
        invite_hash = null, invite_expires_at = null
    where email = v_email;
  delete from admin_login_fails where key = v_key;
  return _new_session(v_email);
end $$;

create or replace function public.admin_logout(p_token text)
returns void language sql security definer set search_path = public, extensions as $$
  delete from admin_sessions where token_hash = _sha(p_token);
$$;

create or replace function public.admin_me(p_token text)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare
  v public.admins := _admin(p_token);
begin
  return json_build_object('email', v.email, 'is_owner', v.is_owner);
end $$;

create or replace function public.admin_change_password(p_token text, p_old text, p_new text)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare
  v public.admins := _admin(p_token);
begin
  if v.password_hash <> extensions.crypt(coalesce(p_old, ''), v.password_hash) then
    return json_build_object('error', 'invalid');
  end if;
  if char_length(coalesce(p_new, '')) < 8 then return json_build_object('error', 'weak'); end if;
  update admins set password_hash = extensions.crypt(p_new, extensions.gen_salt('bf', 10)) where email = v.email;
  -- Sign out every other device.
  delete from admin_sessions where email = v.email and token_hash <> _sha(p_token);
  return json_build_object('ok', true);
end $$;

-- ---------------------------------------------------------------- team (owner manages, everyone sees)
create or replace function public.admin_team(p_token text)
returns json language plpgsql security definer set search_path = public, extensions as $$
begin
  perform _admin(p_token);
  return coalesce((
    select json_agg(json_build_object(
      'email', email,
      'is_owner', is_owner,
      'active', password_hash is not null,
      'invite_pending', invite_hash is not null and invite_expires_at > now(),
      'invite_expires_at', invite_expires_at,
      'added_by', added_by,
      'created_at', created_at
    ) order by is_owner desc, created_at)
    from admins
  ), '[]'::json);
end $$;

/** Add a person, or give an existing one a fresh code (forgotten password). Returns the code once. */
create or replace function public.admin_invite(p_token text, p_email text)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare
  me public.admins := _owner(p_token);
  v_email text := lower(trim(coalesce(p_email, '')));
  v_code text := _invite_code();
begin
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or char_length(v_email) > 120 then
    return json_build_object('error', 'email');
  end if;
  if v_email = me.email then return json_build_object('error', 'self'); end if;
  insert into admins (email, added_by, invite_hash, invite_expires_at)
    values (v_email, me.email, _sha(v_code), now() + interval '7 days')
    on conflict (email) do update
      set invite_hash = excluded.invite_hash,
          invite_expires_at = excluded.invite_expires_at,
          password_hash = null;
  delete from admin_sessions where email = v_email;
  return json_build_object('email', v_email, 'code', v_code, 'expires_at', now() + interval '7 days');
end $$;

create or replace function public.admin_remove(p_token text, p_email text)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare
  me public.admins := _owner(p_token);
  v_email text := lower(trim(coalesce(p_email, '')));
begin
  if v_email = me.email then return json_build_object('error', 'self'); end if;
  if exists (select 1 from admins where email = v_email and is_owner) then
    return json_build_object('error', 'owner');
  end if;
  delete from admins where email = v_email;
  return json_build_object('ok', true);
end $$;

-- ---------------------------------------------------------------- submissions
create or replace function public.admin_rows(p_token text, p_kind text)
returns json language plpgsql security definer set search_path = public, extensions as $$
begin
  perform _admin(p_token);
  if p_kind = 'participate' then
    return coalesce((select json_agg(t) from (select * from submissions_participate order by created_at desc limit 1000) t), '[]'::json);
  elsif p_kind = 'ideas' then
    return coalesce((select json_agg(t) from (select * from submissions_ideas order by created_at desc limit 1000) t), '[]'::json);
  elsif p_kind = 'news' then
    return coalesce((select json_agg(t) from (select * from submissions_news order by created_at desc limit 1000) t), '[]'::json);
  end if;
  raise exception 'unknown kind %', p_kind;
end $$;

/**
 * Same rules as the server route: publishing implies approval, and any status other
 * than "approved" takes the item off the site.
 */
create or replace function public.admin_patch(p_token text, p_kind text, p_id uuid, p_changes jsonb)
returns void language plpgsql security definer set search_path = public, extensions as $$
declare
  v_status submission_status;
  v_pub boolean;
  c jsonb := coalesce(p_changes, '{}'::jsonb);
begin
  perform _admin(p_token);
  if c ? 'status' then v_status := (c ->> 'status')::submission_status; end if;
  if c ? 'published' then v_pub := (c ->> 'published')::boolean; end if;
  if v_pub is true then v_status := 'approved'; end if;
  if v_status is not null and v_status <> 'approved' then v_pub := false; end if;

  if p_kind = 'participate' then
    update submissions_participate set
      status = coalesce(v_status, status),
      admin_note = case when c ? 'admin_note' then left(nullif(trim(c ->> 'admin_note'), ''), 1000) else admin_note end
    where id = p_id;
  elsif p_kind = 'ideas' then
    update submissions_ideas set
      status = coalesce(v_status, status),
      published = coalesce(v_pub, published),
      public_text = case when c ? 'public_text' then nullif(trim(c ->> 'public_text'), '') else public_text end,
      admin_note = case when c ? 'admin_note' then left(nullif(trim(c ->> 'admin_note'), ''), 1000) else admin_note end
    where id = p_id;
  elsif p_kind = 'news' then
    update submissions_news set
      status = coalesce(v_status, status),
      published = coalesce(v_pub, published),
      headline = case when c ? 'headline' then nullif(trim(c ->> 'headline'), '') else headline end,
      admin_note = case when c ? 'admin_note' then left(nullif(trim(c ->> 'admin_note'), ''), 1000) else admin_note end
    where id = p_id;
  else
    raise exception 'unknown kind %', p_kind;
  end if;
end $$;

create or replace function public.admin_delete_row(p_token text, p_kind text, p_id uuid)
returns void language plpgsql security definer set search_path = public, extensions as $$
begin
  perform _admin(p_token);
  if p_kind = 'participate' then delete from submissions_participate where id = p_id;
  elsif p_kind = 'ideas' then delete from submissions_ideas where id = p_id;
  elsif p_kind = 'news' then delete from submissions_news where id = p_id;
  else raise exception 'unknown kind %', p_kind;
  end if;
end $$;

-- ---------------------------------------------------------------- episodes
create or replace function public.admin_episodes(p_token text)
returns json language plpgsql security definer set search_path = public, extensions as $$
begin
  perform _admin(p_token);
  return coalesce((select json_agg(e order by e.number desc, e.created_at desc) from episodes e), '[]'::json);
end $$;

create or replace function public.admin_save_episode(p_token text, p_id uuid, p_data jsonb)
returns uuid language plpgsql security definer set search_path = public, extensions as $$
declare
  v_id uuid := p_id;
  v_title text := trim(coalesce(p_data ->> 'title', ''));
  v_url text := nullif(trim(coalesce(p_data ->> 'video_url', '')), '');
begin
  perform _admin(p_token);
  if char_length(v_title) not between 2 and 140 then raise exception 'title'; end if;
  if v_url is not null and (v_url !~ '^https://' or char_length(v_url) > 300) then raise exception 'video_url'; end if;
  if v_id is null then
    insert into episodes (number, title, guest, description, video_url, published_on, is_published)
    values (
      (p_data ->> 'number')::int, v_title,
      nullif(trim(coalesce(p_data ->> 'guest', '')), ''),
      nullif(trim(coalesce(p_data ->> 'description', '')), ''),
      v_url,
      nullif(p_data ->> 'published_on', '')::date,
      coalesce((p_data ->> 'is_published')::boolean, true)
    ) returning id into v_id;
  else
    update episodes set
      number = (p_data ->> 'number')::int,
      title = v_title,
      guest = nullif(trim(coalesce(p_data ->> 'guest', '')), ''),
      description = nullif(trim(coalesce(p_data ->> 'description', '')), ''),
      video_url = v_url,
      published_on = nullif(p_data ->> 'published_on', '')::date,
      is_published = coalesce((p_data ->> 'is_published')::boolean, true)
    where id = v_id;
  end if;
  return v_id;
end $$;

create or replace function public.admin_delete_episode(p_token text, p_id uuid)
returns void language plpgsql security definer set search_path = public, extensions as $$
begin
  perform _admin(p_token);
  delete from episodes where id = p_id;
end $$;

-- ---------------------------------------------------------------- voting from the browser
-- The device id is a random UUID kept in the browser; only its hash is stored.
create or replace function public.vote_idea(p_idea uuid, p_device text)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare
  v_hash text;
begin
  if coalesce(p_device, '') !~ '^[0-9a-f-]{36}$' then return null; end if;
  v_hash := _sha('device:' || p_device);
  if (select count(*) from idea_votes where voter_hash = v_hash and created_at > now() - interval '1 hour') >= 60 then
    return json_build_object('error', 'rate_limited');
  end if;
  return cast_vote(p_idea, v_hash);
end $$;

-- ---------------------------------------------------------------- spam brake on direct inserts
-- Students insert straight from the browser. Limit per client IP (as seen by Supabase),
-- with a generous shared fallback when the IP is unknown. The server (service key) is exempt.
create or replace function public._throttle_submission()
returns trigger language plpgsql security definer set search_path = public, extensions as $$
declare
  v_headers json := nullif(current_setting('request.headers', true), '')::json;
  v_ip text := trim(split_part(coalesce(v_headers ->> 'cf-connecting-ip', v_headers ->> 'x-forwarded-for', ''), ',', 1));
  v_claims json := nullif(current_setting('request.jwt.claims', true), '')::json;
begin
  if coalesce(v_claims ->> 'role', '') = 'service_role' then return new; end if;
  if v_ip <> '' then
    if not hit_rate_limit(_sha('submit-ip:' || v_ip), 20, 3600) then
      raise exception 'rate_limited' using errcode = 'P0429';
    end if;
  elsif not hit_rate_limit('submit-global', 300, 3600) then
    raise exception 'rate_limited' using errcode = 'P0429';
  end if;
  return new;
end $$;

drop trigger if exists throttle on public.submissions_participate;
create trigger throttle before insert on public.submissions_participate for each row execute function public._throttle_submission();
drop trigger if exists throttle on public.submissions_ideas;
create trigger throttle before insert on public.submissions_ideas for each row execute function public._throttle_submission();
drop trigger if exists throttle on public.submissions_news;
create trigger throttle before insert on public.submissions_news for each row execute function public._throttle_submission();

-- ---------------------------------------------------------------- news photos
-- Public bucket: the team views photos by URL without a session. File names are random UUIDs
-- and nobody can list the bucket, so a photo is only reachable from the admin panel.
update storage.buckets set public = true where id = 'news-photos';

drop policy if exists "anon upload news photos" on storage.objects;
create policy "anon upload news photos" on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'news-photos' and name ~ '^\d{4}-\d{2}/[0-9a-f-]{36}\.(jpg|png|webp)$');

-- ---------------------------------------------------------------- permissions
-- Functions are executable by PUBLIC by default; lock everything, then open the API.
revoke execute on function
  public._sha(text), public._invite_code(), public._new_session(text), public._admin(text),
  public._owner(text), public._locked(text), public._fail(text), public._throttle_submission()
  from public, anon, authenticated;

revoke execute on function
  public.admin_login(text, text), public.admin_claim(text, text, text), public.admin_logout(text),
  public.admin_me(text), public.admin_change_password(text, text, text), public.admin_team(text),
  public.admin_invite(text, text), public.admin_remove(text, text), public.admin_rows(text, text),
  public.admin_patch(text, text, uuid, jsonb), public.admin_delete_row(text, text, uuid),
  public.admin_episodes(text), public.admin_save_episode(text, uuid, jsonb),
  public.admin_delete_episode(text, uuid), public.vote_idea(uuid, text)
  from public;

grant execute on function
  public.admin_login(text, text), public.admin_claim(text, text, text), public.admin_logout(text),
  public.admin_me(text), public.admin_change_password(text, text, text), public.admin_team(text),
  public.admin_invite(text, text), public.admin_remove(text, text), public.admin_rows(text, text),
  public.admin_patch(text, text, uuid, jsonb), public.admin_delete_row(text, text, uuid),
  public.admin_episodes(text), public.admin_save_episode(text, uuid, jsonb),
  public.admin_delete_episode(text, uuid), public.vote_idea(uuid, text)
  to anon, authenticated;
