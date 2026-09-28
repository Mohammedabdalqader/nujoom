-- S1-11 minimal guardian activation (C-011; contract §6; spec §7).
--   youth names a guardian email → the guardian-invite Edge Function issues a one-time token and
--   emails the link → the guardian (signed in with that email) approves or declines.
-- Tokens leave the database once, inside the email; only their SHA-256 hash is stored, with an
-- expiry. Nothing here claims an email was sent: `invite_sent_at` is set only after the sender
-- acknowledged it (mark_guardian_invite_sent).

alter table public.guardians add column invite_sent_at timestamptz;
grant select (invite_sent_at) on table public.guardians to authenticated;

insert into public.config (key, value, description) values
  ('guardian_invites', '{"expires_days":7,"resend_seconds":60,"max_sends":5,"names_per_hour":10}',
   'Guardian invite limits (S1-11).');

create function private.token_hash(p_token text)
returns text
language sql
immutable
set search_path = ''
as $$
  select encode(sha256(convert_to(p_token, 'UTF8')), 'hex');
$$;

create function private.guardian_setting(p_key text)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select (value ->> p_key)::integer from public.config where key = 'guardian_invites';
$$;

-- The youth's guardian links as the app shows them (no token data).
create function private.guardian_links_json(p_youth uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', g.id,
    'contact_email', g.contact_email,
    'status', g.status,
    'invite_sent_at', g.invite_sent_at,
    'invite_expires_at', g.invite_expires_at,
    'confirmed_at', g.confirmed_at
  ) order by g.created_at), '[]'::jsonb)
  from public.guardians g
  where g.youth_user_id = p_youth and g.status <> 'revoked';
$$;

-- ---------------------------------------------------------------------------
-- Youth: name (or correct) the guardian's email. Replaces any link still pending, so a typo is
-- fixed by entering the right address. A confirmed guardian stays.
-- ---------------------------------------------------------------------------
create function public.name_guardian(p_email text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = 'insufficient_privilege';
  end if;
  if not exists (select 1 from public.profiles where id = v_uid and onboarded_at is not null and is_youth) then
    raise exception 'not_youth' using errcode = 'insufficient_privilege';
  end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or char_length(v_email) > 254 then
    raise exception 'invalid_email' using errcode = 'check_violation';
  end if;
  if v_email = private.my_email() then
    raise exception 'same_email' using errcode = 'check_violation';
  end if;
  if not private.hit_rate_limit('name_guardian:' || v_uid, interval '1 hour',
                                private.guardian_setting('names_per_hour')) then
    raise exception 'rate_limited' using errcode = 'check_violation';
  end if;
  if exists (select 1 from public.guardians
             where youth_user_id = v_uid and contact_email = v_email and status = 'confirmed') then
    raise exception 'duplicate_guardian' using errcode = 'unique_violation';
  end if;

  delete from public.guardians where youth_user_id = v_uid and status = 'pending';
  delete from public.guardians where youth_user_id = v_uid and status = 'revoked' and contact_email = v_email;
  insert into public.guardians (youth_user_id, contact_email)
  values (v_uid, v_email)
  returning id into v_id;

  return jsonb_build_object('link_id', v_id, 'guardians', private.guardian_links_json(v_uid));
end;
$$;

create function public.my_guardians()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select private.guardian_links_json((select auth.uid()));
$$;

-- ---------------------------------------------------------------------------
-- Edge Function (service role): issue a fresh token for a pending link, then confirm delivery.
-- ---------------------------------------------------------------------------
create function public.issue_guardian_invite(p_link_id uuid, p_youth uuid)
returns table (token text, contact_email text, expires_at timestamptz, youth_name text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_link public.guardians;
  v_token text := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
begin
  select * into v_link from public.guardians
  where id = p_link_id and youth_user_id = p_youth
  for update;
  if v_link.id is null or v_link.status <> 'pending' then
    raise exception 'invite_not_pending' using errcode = 'no_data_found';
  end if;
  if v_link.invite_last_sent_at > now() - make_interval(secs => private.guardian_setting('resend_seconds')) then
    raise exception 'invite_rate_limited' using errcode = 'check_violation';
  end if;
  if v_link.invite_send_count >= private.guardian_setting('max_sends') then
    raise exception 'invite_limit_reached' using errcode = 'check_violation';
  end if;

  update public.guardians g
  set invite_token_hash = private.token_hash(v_token),
      invite_expires_at = now() + make_interval(days => private.guardian_setting('expires_days')),
      invite_send_count = g.invite_send_count + 1,
      invite_last_sent_at = now()
  where g.id = v_link.id;

  return query
    select v_token, v_link.contact_email,
           (select g.invite_expires_at from public.guardians g where g.id = v_link.id),
           (select p.display_name from public.profiles p where p.id = v_link.youth_user_id);
end;
$$;

create function public.mark_guardian_invite_sent(p_link_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.guardians set invite_sent_at = now() where id = p_link_id and status = 'pending';
$$;

-- ---------------------------------------------------------------------------
-- Guardian: preview, approve, decline. Only the account signed in with the invited email can act,
-- and a wrong, used or expired token looks the same as no token (nothing leaks).
-- ---------------------------------------------------------------------------
create function private.pending_link_for(p_token text)
returns public.guardians
language sql
stable
security definer
set search_path = ''
as $$
  select g.* from public.guardians g
  where g.invite_token_hash = private.token_hash(coalesce(p_token, ''))
    and g.status = 'pending'
    and g.invite_expires_at > now();
$$;

create function public.guardian_invite_preview(p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_link public.guardians := private.pending_link_for(p_token);
begin
  if (select auth.uid()) is null or v_link.id is null or v_link.contact_email is distinct from private.my_email() then
    return null;
  end if;
  return (
    select jsonb_build_object('youth_name', p.display_name, 'age_group', p.age_group,
                              'expires_at', v_link.invite_expires_at)
    from public.profiles p where p.id = v_link.youth_user_id
  );
end;
$$;

-- p_guardian_name / p_guardian_dob create a guardian-only account when the parent isn't a player
-- (no city, position or card presence; the player app would still ask them to onboard).
create function public.accept_guardian_invite(
  p_token text,
  p_visibility public.profile_visibility default 'private',
  p_recording boolean default null,
  p_guardian_name text default null,
  p_guardian_dob date default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_link public.guardians;
  v_dob date;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = 'insufficient_privilege';
  end if;
  select * into v_link from public.guardians
  where id = (private.pending_link_for(p_token)).id
  for update;
  if v_link.id is null then
    raise exception 'invalid_invite' using errcode = 'no_data_found';
  end if;
  if v_link.contact_email is distinct from private.my_email() then
    raise exception 'contact_mismatch' using errcode = 'insufficient_privilege';
  end if;
  if v_link.youth_user_id = v_uid then
    raise exception 'cannot_guard_self' using errcode = 'insufficient_privilege';
  end if;

  if not exists (select 1 from public.profiles where id = v_uid) then
    if p_guardian_name is null or char_length(btrim(p_guardian_name)) not between 2 and 40 then
      raise exception 'invalid_name' using errcode = 'check_violation';
    end if;
    insert into public.profiles (id, display_name) values (v_uid, btrim(p_guardian_name));
    insert into public.profile_private (user_id, dob) values (v_uid, p_guardian_dob);
  end if;
  select dob into v_dob from public.profile_private where user_id = v_uid;
  if v_dob is null or private.age_on(v_dob, private.amman_today()) < 18 then
    raise exception 'guardian_must_be_adult' using errcode = 'insufficient_privilege';
  end if;

  update public.guardians
  set guardian_user_id = v_uid, status = 'confirmed', confirmed_at = now(),
      invite_token_hash = null, visibility_choice = coalesce(p_visibility, 'private')
  where id = v_link.id;

  -- The guardian's own recording decision for this youth (C-010); unanswered stores nothing.
  if p_recording is not null then
    insert into public.consents (user_id, type, version, granted, given_by)
    values (v_link.youth_user_id, 'recording',
            (select value ->> 'recording' from public.config where key = 'consent_versions'),
            p_recording, v_uid);
  end if;

  return jsonb_build_object('youth_name', (select display_name from public.profiles where id = v_link.youth_user_id),
                            'status', 'confirmed');
end;
$$;

create function public.decline_guardian_invite(p_token text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_link public.guardians := private.pending_link_for(p_token);
begin
  if (select auth.uid()) is null then
    raise exception 'not_authenticated' using errcode = 'insufficient_privilege';
  end if;
  if v_link.id is null or v_link.contact_email is distinct from private.my_email() then
    raise exception 'invalid_invite' using errcode = 'no_data_found';
  end if;
  update public.guardians
  set status = 'revoked', revoked_at = now(), invite_token_hash = null
  where id = v_link.id;
end;
$$;

-- ---------------------------------------------------------------------------
-- me() gains the guardian links so the youth's screen can show pending/sent/expired states.
-- ---------------------------------------------------------------------------
create or replace function public.me()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_p public.profiles;
  v_s public.user_settings;
  v_guardian text;
  v_consents boolean;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = 'insufficient_privilege';
  end if;
  select * into v_p from public.profiles where id = v_uid;
  if v_p.id is null or v_p.onboarded_at is null then
    return jsonb_build_object('id', v_uid, 'email', private.my_email(), 'stage', 'onboarding');
  end if;
  select * into v_s from public.user_settings where user_id = v_uid;
  select case
           when bool_or(status = 'confirmed') then 'confirmed'
           when bool_or(status = 'pending') then 'pending'
           else 'none'
         end
    into v_guardian
    from public.guardians where youth_user_id = v_uid;
  v_consents := private.has_current_consents(v_uid);

  return jsonb_build_object(
    'id', v_p.id,
    'email', private.my_email(),
    'display_name', v_p.display_name,
    'handle', v_p.handle,
    'card_code', v_p.card_code,
    'city_id', v_p.city_id,
    'neighborhood_id', v_p.neighborhood_id,
    'position', v_p.position,
    'dominant_foot', v_p.dominant_foot,
    'shirt_number', v_p.shirt_number,
    'avatar_path', v_p.avatar_path,
    'visibility', v_p.visibility,
    'is_youth', v_p.is_youth,
    'age_group', v_p.age_group,
    'onboarded_at', v_p.onboarded_at,
    'guardian', coalesce(v_guardian, 'none'),
    'guardians', case when v_p.is_youth then private.guardian_links_json(v_uid) else '[]'::jsonb end,
    'recording_consent', private.recording_consent_by(v_uid, null),
    'can_join_recorded', private.can_join_recorded_matches(v_uid),
    'consents_current', v_consents,
    'settings', jsonb_build_object(
      'locale', coalesce(v_s.locale, 'ar'),
      'share_presence', coalesce(v_s.share_presence, false),
      'share_in_match', coalesce(v_s.share_in_match, false)),
    'stage', case
               when not v_consents then 'consent'
               when v_p.is_youth and coalesce(v_guardian, 'none') = 'none' then 'guardian'
               else 'app'
             end
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Privileges
-- ---------------------------------------------------------------------------
revoke execute on function public.name_guardian(text), public.my_guardians(),
  public.guardian_invite_preview(text),
  public.accept_guardian_invite(text, public.profile_visibility, boolean, text, date),
  public.decline_guardian_invite(text), public.issue_guardian_invite(uuid, uuid),
  public.mark_guardian_invite_sent(uuid)
  from public, anon;
grant execute on function public.name_guardian(text), public.my_guardians(),
  public.guardian_invite_preview(text),
  public.accept_guardian_invite(text, public.profile_visibility, boolean, text, date),
  public.decline_guardian_invite(text)
  to authenticated, service_role;
revoke execute on function public.issue_guardian_invite(uuid, uuid), public.mark_guardian_invite_sent(uuid)
  from authenticated;
grant execute on function public.issue_guardian_invite(uuid, uuid), public.mark_guardian_invite_sent(uuid)
  to service_role;
revoke execute on function public.me() from public, anon;
grant execute on function public.me() to authenticated, service_role;

revoke execute on all functions in schema private from public;
grant execute on function private.token_hash(text), private.guardian_setting(text),
  private.guardian_links_json(uuid), private.pending_link_for(text)
  to service_role;
