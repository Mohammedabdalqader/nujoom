-- Venue staff (D-068; spec §6.4 "staff accounts", roadmap G2a "staff access").
--
-- Roles: an `owner` runs the venue: prices, hours, field details, schedule and the team. `staff`
-- see the venue and may add photos; they will handle the calendar and manual bookings when booking
-- arrives (R2). Accountability for anything players will rely on (price, hours, facts) stays with
-- owners.
--
-- Joining: an owner creates a one-time invite link and shares it however they like (WhatsApp), so
-- no email is needed. The link holds a random token; only its hash is stored. It works once, for 7
-- days, for a signed-in adult. At most 5 open links per venue and 10 new links a day per owner.
-- Owners can revoke a link or remove a staff member; staff can leave. Owners are never removed
-- here (admin matter).

create table public.staff_invites (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null references public.facilities (id) on delete cascade,
  created_by uuid references public.profiles (id) on delete set null,
  token_hash text not null unique,
  expires_at timestamptz not null,
  accepted_by uuid references public.profiles (id) on delete set null,
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  check ((accepted_at is null) or (revoked_at is null))
);
create index staff_invites_facility_idx on public.staff_invites (facility_id, created_at);

alter table public.staff_invites enable row level security;
revoke all on table public.staff_invites from anon, authenticated;
grant all on table public.staff_invites to service_role;

create function private.is_facility_owner(p_facility uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.pitch_staff
                 where facility_id = p_facility and user_id = (select auth.uid()) and role = 'owner');
$$;

-- The open invite a token points at, or null (bad, used, revoked and expired look the same). A link
-- also dies when the person who made it is no longer an owner of the venue (removed, or their
-- account deleted: created_by becomes null).
create function private.open_staff_invite(p_token text)
returns public.staff_invites
language sql
stable
security definer
set search_path = ''
as $$
  select i.* from public.staff_invites i
  where i.token_hash = private.token_hash(coalesce(p_token, ''))
    and i.accepted_at is null and i.revoked_at is null and i.expires_at > now()
    and exists (select 1 from public.pitch_staff s
                where s.facility_id = i.facility_id and s.user_id = i.created_by and s.role = 'owner');
$$;

-- ---------------------------------------------------------------------------
-- Owners manage the team
-- ---------------------------------------------------------------------------
create function public.create_staff_invite(p_facility uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_token text := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  v_invite public.staff_invites;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = 'insufficient_privilege';
  end if;
  if not private.is_facility_owner(p_facility) then
    raise exception 'forbidden' using errcode = 'insufficient_privilege';
  end if;
  if (select count(*) from public.staff_invites
      where facility_id = p_facility and accepted_at is null and revoked_at is null
        and expires_at > now()) >= 5 then
    raise exception 'staff_link_limit' using errcode = 'check_violation';
  end if;
  if not private.hit_rate_limit('staff_invite:' || v_uid, interval '1 day', 10) then
    raise exception 'rate_limited' using errcode = 'program_limit_exceeded';
  end if;
  insert into public.staff_invites (facility_id, created_by, token_hash, expires_at)
  values (p_facility, v_uid, private.token_hash(v_token), now() + interval '7 days')
  returning * into v_invite;
  perform private.write_audit('venue.staff_invite_created', 'facility', p_facility::text,
                              jsonb_build_object('invite', v_invite.id));
  return jsonb_build_object('id', v_invite.id, 'token', v_token, 'expires_at', v_invite.expires_at);
end;
$$;

create function public.revoke_staff_invite(p_invite uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_facility uuid := (select facility_id from public.staff_invites where id = p_invite);
begin
  if v_facility is null or not private.is_facility_owner(v_facility) then
    raise exception 'forbidden' using errcode = 'insufficient_privilege';
  end if;
  update public.staff_invites set revoked_at = now()
  where id = p_invite and accepted_at is null and revoked_at is null;
  perform private.write_audit('venue.staff_invite_revoked', 'facility', v_facility::text,
                              jsonb_build_object('invite', p_invite));
end;
$$;

-- An owner removes a staff member, or a staff member leaves. Owners are not removed here.
create function public.remove_staff(p_facility uuid, p_user uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_role public.staff_role := (select role from public.pitch_staff
                               where facility_id = p_facility and user_id = p_user);
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = 'insufficient_privilege';
  end if;
  if v_role is distinct from 'staff'
     or not (p_user = v_uid or private.is_facility_owner(p_facility)) then
    raise exception 'forbidden' using errcode = 'insufficient_privilege';
  end if;
  delete from public.pitch_staff where facility_id = p_facility and user_id = p_user;
  perform private.write_audit(case when p_user = v_uid then 'venue.staff_left' else 'venue.staff_removed' end,
                              'facility', p_facility::text, jsonb_build_object('user', p_user));
end;
$$;

-- ---------------------------------------------------------------------------
-- The invited person
-- ---------------------------------------------------------------------------
create function public.staff_invite_preview(p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_invite public.staff_invites := private.open_staff_invite(p_token);
begin
  if (select auth.uid()) is null then
    raise exception 'not_authenticated' using errcode = 'insufficient_privilege';
  end if;
  if v_invite.id is null then
    raise exception 'invalid_staff_invite' using errcode = 'no_data_found';
  end if;
  return (select jsonb_build_object(
            'name', jsonb_build_object('ar', f.name_ar, 'en', f.name_en),
            'city', (select jsonb_build_object('ar', c.name_ar, 'en', c.name_en)
                     from public.cities c where c.id = f.city_id),
            'invited_by', (select p.display_name from public.profiles p where p.id = v_invite.created_by),
            'expires_at', v_invite.expires_at,
            'already_staff', exists (select 1 from public.pitch_staff s
                                     where s.facility_id = f.id and s.user_id = (select auth.uid())))
          from public.facilities f where f.id = v_invite.facility_id);
end;
$$;

create function public.accept_staff_invite(p_token text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_invite public.staff_invites;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = 'insufficient_privilege';
  end if;
  select * into v_invite from public.staff_invites
  where id = (private.open_staff_invite(p_token)).id
  for update;
  if v_invite.id is null or v_invite.accepted_at is not null or v_invite.revoked_at is not null then
    raise exception 'invalid_staff_invite' using errcode = 'no_data_found';
  end if;
  if not exists (select 1 from public.profiles where id = v_uid and not is_youth) then
    raise exception 'not_adult' using errcode = 'insufficient_privilege';
  end if;
  if exists (select 1 from public.pitch_staff where facility_id = v_invite.facility_id and user_id = v_uid) then
    raise exception 'already_staff' using errcode = 'unique_violation';
  end if;
  insert into public.pitch_staff (facility_id, user_id, role) values (v_invite.facility_id, v_uid, 'staff');
  update public.staff_invites set accepted_by = v_uid, accepted_at = now() where id = v_invite.id;
  perform private.write_audit('venue.staff_joined', 'facility', v_invite.facility_id::text,
                              jsonb_build_object('invite', v_invite.id));
  return v_invite.facility_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Prices, hours, field details and the schedule are for owners (bodies as in D-063)
-- ---------------------------------------------------------------------------
create or replace function public.owner_confirm_field(p_pitch uuid, p_facts jsonb default '{}'::jsonb,
                                                      p_operations jsonb default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_facility uuid := (select facility_id from public.pitches where id = p_pitch);
begin
  if v_facility is null or not private.is_facility_owner(v_facility) then
    raise exception 'forbidden' using errcode = 'insufficient_privilege';
  end if;
  if p_operations ? 'opening_hours' and not private.valid_opening_hours(p_operations -> 'opening_hours') then
    raise exception 'invalid_opening_hours' using errcode = 'check_violation';
  end if;
  perform private.apply_pitch_facts(p_pitch, p_facts, 'operator');
  if p_operations is not null then
    insert into public.pitch_operations (pitch_id, price_per_hour, price_note_ar, price_note_en,
                                         slot_minutes, opening_hours, confirmed_by, confirmed_at)
    values (p_pitch, (p_operations ->> 'price_per_hour')::numeric, p_operations ->> 'price_note_ar',
            p_operations ->> 'price_note_en', (p_operations ->> 'slot_minutes')::smallint,
            coalesce(p_operations -> 'opening_hours', '{}'::jsonb), (select auth.uid()), now())
    on conflict (pitch_id) do update
    set price_per_hour = excluded.price_per_hour, price_note_ar = excluded.price_note_ar,
        price_note_en = excluded.price_note_en, slot_minutes = excluded.slot_minutes,
        opening_hours = case when p_operations ? 'opening_hours' then excluded.opening_hours
                             else public.pitch_operations.opening_hours end,
        confirmed_by = excluded.confirmed_by, confirmed_at = now();
  end if;
  perform private.review(v_facility, p_pitch, 'operator_confirmed', null,
                         jsonb_build_object('facts', p_facts, 'operations', p_operations), null);
end;
$$;

create or replace function public.owner_set_schedule_active(p_pitch uuid, p_active boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_facility uuid := (select facility_id from public.pitches where id = p_pitch);
  v_hours jsonb;
begin
  if v_facility is null or not private.is_facility_owner(v_facility) then
    raise exception 'forbidden' using errcode = 'insufficient_privilege';
  end if;
  select opening_hours into v_hours from public.pitch_operations where pitch_id = p_pitch;
  if not found then
    raise exception 'no_operations' using errcode = 'no_data_found';
  end if;
  if p_active and not private.has_opening_hours(v_hours) then
    raise exception 'no_opening_hours' using errcode = 'check_violation';
  end if;
  update public.pitch_operations set schedule_active = p_active where pitch_id = p_pitch;
  perform private.review(v_facility, p_pitch, case when p_active then 'schedule_on' else 'schedule_off' end,
                         null, null, null);
end;
$$;

-- The data export also lists the staff links a person created (no token, not who accepted:
-- joining shows up in the other person's own "venues_managed").
create or replace function public.export_user_data(p_user uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'format', 'nujoom-data-export',
    'format_version', 1,
    'generated_at', now(),
    'account', (select jsonb_build_object('id', u.id, 'email', u.email, 'created_at', u.created_at)
                from auth.users u where u.id = p_user),
    'profile', (select to_jsonb(p) - 'id' from public.profiles p where p.id = p_user),
    'date_of_birth', (select pp.dob from public.profile_private pp where pp.user_id = p_user),
    'settings', (select to_jsonb(s) - 'user_id' from public.user_settings s where s.user_id = p_user),
    'consents', (select coalesce(jsonb_agg(jsonb_build_object(
                   'type', c.type, 'version', c.version, 'granted', c.granted,
                   'given_by_guardian', c.given_by is not null and c.given_by <> c.user_id,
                   'created_at', c.created_at) order by c.created_at), '[]'::jsonb)
                 from public.consents c where c.user_id = p_user),
    'guardians_named', (select coalesce(jsonb_agg(jsonb_build_object(
                          'contact_email', g.contact_email, 'status', g.status,
                          'visibility_choice', g.visibility_choice, 'created_at', g.created_at,
                          'confirmed_at', g.confirmed_at) order by g.created_at), '[]'::jsonb)
                        from public.guardians g where g.youth_user_id = p_user),
    'guardian_of', (select coalesce(jsonb_agg(jsonb_build_object(
                      'youth_display_name', y.display_name, 'status', g.status,
                      'confirmed_at', g.confirmed_at) order by g.created_at), '[]'::jsonb)
                    from public.guardians g join public.profiles y on y.id = g.youth_user_id
                    where g.guardian_user_id = p_user),
    'venues_managed', (select coalesce(jsonb_agg(jsonb_build_object(
                         'facility', coalesce(f.name_ar, f.name_en), 'role', s.role,
                         'since', s.created_at) order by s.created_at), '[]'::jsonb)
                       from public.pitch_staff s join public.facilities f on f.id = s.facility_id
                       where s.user_id = p_user),
    'venue_claims', (select coalesce(jsonb_agg(jsonb_build_object(
                       'facility', coalesce(f.name_ar, f.name_en), 'status', c.status,
                       'created_at', c.created_at, 'decided_at', c.decided_at) order by c.created_at),
                       '[]'::jsonb)
                     from public.facility_claims c join public.facilities f on f.id = c.facility_id
                     where c.user_id = p_user),
    'staff_links', (select coalesce(jsonb_agg(jsonb_build_object(
                      'facility', coalesce(f.name_ar, f.name_en), 'created_at', i.created_at,
                      'expires_at', i.expires_at,
                      'status', case when i.accepted_at is not null then 'accepted'
                                     when i.revoked_at is not null then 'revoked'
                                     when i.expires_at <= now() then 'expired' else 'open' end)
                      order by i.created_at), '[]'::jsonb)
                    from public.staff_invites i join public.facilities f on f.id = i.facility_id
                    where i.created_by = p_user),
    'pitch_reports', (select coalesce(jsonb_agg(jsonb_build_object(
                        'kind', r.kind, 'payload', r.payload, 'status', r.status,
                        'created_at', r.created_at) order by r.created_at), '[]'::jsonb)
                      from public.community_submissions r where r.user_id = p_user),
    'events', (select coalesce(jsonb_agg(jsonb_build_object(
                 'name', e.name, 'properties', e.properties, 'created_at', e.created_at)
                 order by e.created_at), '[]'::jsonb)
               from public.events e where e.user_id = p_user),
    'data_requests', (select coalesce(jsonb_agg(private.data_request_json(r) order by r.requested_at),
                                      '[]'::jsonb)
                      from public.data_requests r where r.user_id = p_user)
  );
$$;

revoke execute on function public.create_staff_invite(uuid), public.revoke_staff_invite(uuid),
  public.remove_staff(uuid, uuid), public.staff_invite_preview(text), public.accept_staff_invite(text)
  from public, anon;
grant execute on function public.create_staff_invite(uuid), public.revoke_staff_invite(uuid),
  public.remove_staff(uuid, uuid), public.staff_invite_preview(text), public.accept_staff_invite(text)
  to authenticated, service_role;

revoke execute on all functions in schema private from public;
