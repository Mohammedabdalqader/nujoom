-- Favourite pitches (D-086; spec §5: favourites for verified participating fields).
-- A player keeps a short list of fields they book. Adding needs a published, verified field;
-- removing always works. The list shows the same catalog listing as search, with each field's
-- current badge (a field that loses its badge stays in the list, shown as not verified). No one
-- else ever sees someone's favourites.

create table public.pitch_favorites (
  user_id uuid not null references public.profiles (id) on delete cascade,
  pitch_id uuid not null references public.pitches (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, pitch_id)
);
create index pitch_favorites_pitch_idx on public.pitch_favorites (pitch_id);

alter table public.pitch_favorites enable row level security;
revoke all on table public.pitch_favorites from anon, authenticated;
grant all on table public.pitch_favorites to service_role;

-- Sets (not toggles) a favourite, so a double tap or a retry can't flip it back. Returns the new
-- state.
create function public.set_pitch_favorite(p_pitch uuid, p_favorite boolean)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = 'insufficient_privilege';
  end if;
  if not exists (select 1 from public.profiles where id = v_uid and onboarded_at is not null) then
    raise exception 'not_onboarded' using errcode = 'insufficient_privilege';
  end if;
  if not private.hit_rate_limit('favorite:' || v_uid, interval '1 hour', 60) then
    raise exception 'rate_limited' using errcode = 'program_limit_exceeded';
  end if;
  if coalesce(p_favorite, false) then
    if not exists (select 1 from public.pitches p join public.facilities f on f.id = p.facility_id
                   where p.id = p_pitch and p.participation = 'verified'
                     and p.listing_state = 'published' and f.listing_state = 'published') then
      raise exception 'pitch_unavailable' using errcode = 'check_violation';
    end if;
    insert into public.pitch_favorites (user_id, pitch_id) values (v_uid, p_pitch)
    on conflict do nothing;
    return true;
  end if;
  delete from public.pitch_favorites where user_id = v_uid and pitch_id = p_pitch;
  return false;
end;
$$;

-- The player's favourites that are still in the catalog, newest first, as search listings.
create function public.my_favorite_pitches()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = 'insufficient_privilege';
  end if;
  return (select coalesce(jsonb_agg(private.catalog_listing(p, f, null, null) order by fav.created_at desc),
                          '[]'::jsonb)
          from public.pitch_favorites fav
          join public.pitches p on p.id = fav.pitch_id
          join public.facilities f on f.id = p.facility_id
          where fav.user_id = v_uid and p.listing_state = 'published' and f.listing_state = 'published');
end;
$$;

-- The data export includes favourites (spec §7 data rights; coverage guard in pgTAP 050).
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
    'bookings', private.export_bookings(p_user),
    'favorite_pitches', (select coalesce(jsonb_agg(jsonb_build_object(
                           'venue', coalesce(f.name_ar, f.name_en), 'field', coalesce(p.label_ar, p.label_en),
                           'created_at', fav.created_at) order by fav.created_at), '[]'::jsonb)
                         from public.pitch_favorites fav
                         join public.pitches p on p.id = fav.pitch_id
                         join public.facilities f on f.id = p.facility_id
                         where fav.user_id = p_user),
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

revoke execute on function public.set_pitch_favorite(uuid, boolean), public.my_favorite_pitches()
  from public, anon;
grant execute on function public.set_pitch_favorite(uuid, boolean), public.my_favorite_pitches()
  to authenticated, service_role;

revoke execute on all functions in schema private from public;
