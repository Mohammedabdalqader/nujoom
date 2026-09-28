-- D1b part 2b: pitch photos with usage rights (D-049; contract §2.4 pitch_media, D-032).
-- Only photos with a recorded right to use them, approved by an admin, for a published venue are
-- ever shown. They live in a private bucket; signed-in players can read exactly the approved
-- ones (storage policy below), and the app shows them through short-lived signed links, with
-- the attribution a licence requires. No generated or borrowed images, ever.

create type public.media_rights as enum ('owner_granted', 'staff_photo', 'cc_by', 'cc_by_sa');
create type public.media_status as enum ('pending', 'approved', 'rejected');

create table public.pitch_media (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null references public.facilities (id) on delete cascade,
  pitch_id uuid references public.pitches (id) on delete cascade,
  -- Object name inside the `pitch-media` bucket: <facility id>/<file>.
  storage_path text not null unique check (storage_path ~ '^[0-9a-f-]{36}/[A-Za-z0-9_.-]{1,80}$'
                                           and storage_path !~ '\.\.'),
  rights public.media_rights not null,
  attribution text check (char_length(attribution) between 2 and 200),
  -- (Postgres regex repetition counts stop at 255, so the length is a separate check.)
  source_url text check (source_url ~ '^https://\S+$' and char_length(source_url) <= 500),
  uploaded_by uuid, -- audit reference, no foreign key
  status public.media_status not null default 'pending',
  reviewed_by uuid,
  reviewed_at timestamptz,
  reason text check (reason ~ '^[a-z][a-z0-9_]{1,40}$'),
  sort_order smallint not null default 0,
  created_at timestamptz not null default now(),
  check (split_part(storage_path, '/', 1) = facility_id::text),
  -- A Creative Commons photo needs its credit and where it came from.
  check (rights not in ('cc_by', 'cc_by_sa') or (attribution is not null and source_url is not null))
);
create index pitch_media_facility_idx on public.pitch_media (facility_id, status, sort_order);

alter table public.pitch_media enable row level security;
revoke all on table public.pitch_media from anon, authenticated;
grant all on table public.pitch_media to service_role;

-- ---------------------------------------------------------------------------
-- Storage helpers (executable by signed-in users: the storage policies call them)
-- ---------------------------------------------------------------------------
create function private.can_view_pitch_media(p_object_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.pitch_media m
    join public.facilities f on f.id = m.facility_id
    left join public.pitches p on p.id = m.pitch_id
    where m.storage_path = p_object_name and m.status = 'approved'
      and f.listing_state = 'published'
      and (m.pitch_id is null or p.listing_state = 'published'));
$$;

-- Admins upload anywhere; a venue's staff only into that venue's folder.
create function private.can_upload_pitch_media(p_object_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_admin()
    or (split_part(p_object_name, '/', 1) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        and exists (select 1 from public.pitch_staff s
                    where s.facility_id = split_part(p_object_name, '/', 1)::uuid
                      and s.user_id = (select auth.uid())));
$$;

do $$
begin
  if to_regclass('storage.objects') is null then
    raise notice 'storage schema not present; skipping pitch-media bucket';
    return;
  end if;
  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('pitch-media', 'pitch-media', false, 2097152, array['image/jpeg', 'image/webp'])
  on conflict (id) do nothing;
  execute $p$
    create policy "approved pitch photos are visible to signed-in players" on storage.objects
      for select to authenticated
      using (bucket_id = 'pitch-media' and (select private.can_view_pitch_media(name)))
  $p$;
  execute $p$
    create policy "admins and venue staff upload pitch photos" on storage.objects
      for insert to authenticated
      with check (bucket_id = 'pitch-media' and (select private.can_upload_pitch_media(name)))
  $p$;
end;
$$;

-- ---------------------------------------------------------------------------
-- RPCs
-- ---------------------------------------------------------------------------

-- Registers an uploaded photo for review. Staff may only add photos they own the rights to
-- (`owner_granted`) for their own venue; admins record any right with its evidence.
create function public.add_pitch_media(p_facility uuid, p_pitch uuid, p_path text,
                                       p_rights public.media_rights,
                                       p_attribution text default null,
                                       p_source_url text default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_id uuid;
begin
  if not private.is_admin() then
    if not private.is_facility_staff(p_facility) or p_rights <> 'owner_granted' then
      raise exception 'forbidden' using errcode = 'insufficient_privilege';
    end if;
  end if;
  if p_pitch is not null and not exists (select 1 from public.pitches
                                         where id = p_pitch and facility_id = p_facility) then
    raise exception 'not_found' using errcode = 'no_data_found';
  end if;
  if split_part(coalesce(p_path, ''), '/', 1) <> p_facility::text then
    raise exception 'invalid_media_path' using errcode = 'check_violation';
  end if;
  if p_rights in ('cc_by', 'cc_by_sa') and (p_attribution is null or p_source_url is null) then
    raise exception 'rights_evidence_required' using errcode = 'check_violation';
  end if;
  insert into public.pitch_media (facility_id, pitch_id, storage_path, rights, attribution,
                                  source_url, uploaded_by)
  values (p_facility, p_pitch, p_path, p_rights, nullif(btrim(p_attribution), ''),
          nullif(btrim(p_source_url), ''), v_uid)
  returning id into v_id;
  perform private.write_audit('catalog.media_added', 'facility', p_facility::text,
                              jsonb_build_object('media', v_id, 'rights', p_rights));
  return v_id;
end;
$$;

create function public.admin_review_media(p_media uuid, p_decision public.media_status,
                                          p_reason text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := private.require_admin();
  v_facility uuid;
begin
  if p_decision = 'pending' then
    raise exception 'invalid_action' using errcode = 'invalid_parameter_value';
  end if;
  update public.pitch_media
  set status = p_decision, reviewed_by = v_admin, reviewed_at = now(), reason = p_reason
  where id = p_media
  returning facility_id into v_facility;
  if v_facility is null then
    raise exception 'not_found' using errcode = 'no_data_found';
  end if;
  perform private.write_audit('catalog.media_' || p_decision::text, 'facility', v_facility::text,
                              jsonb_build_object('media', p_media, 'reason', p_reason));
end;
$$;

-- The listing now carries its first approved photo (the field's own, else the venue's), as a
-- storage path the app signs, with the credit a licence requires.
create or replace function private.catalog_listing(p public.pitches, f public.facilities,
                                                   p_lat double precision, p_lng double precision)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'pitch_id', p.id,
    'facility_id', f.id,
    'facility_name', jsonb_build_object('ar', f.name_ar, 'en', f.name_en),
    'label', case when p.label_ar is null and p.label_en is null then null
                  else jsonb_build_object('ar', p.label_ar, 'en', p.label_en) end,
    'city', (select jsonb_build_object('ar', c.name_ar, 'en', c.name_en)
             from public.cities c where c.id = f.city_id),
    'neighborhood', (select jsonb_build_object('ar', n.name_ar, 'en', n.name_en)
                     from public.neighborhoods n where n.id = f.neighborhood_id),
    'badge', p.participation,
    'players_per_side', p.players_per_side,
    'futsal', p.futsal,
    'surface', p.surface,
    'indoor', p.indoor,
    'lights', p.lights,
    'amenities', to_jsonb(p.amenities),
    'location', case when f.location_confidence = 'unchecked' or f.lat is null then null
                     else jsonb_build_object('lat', f.lat, 'lng', f.lng,
                                             'confidence', f.location_confidence) end,
    'distance_km', case when p_lat is null or f.location_confidence = 'unchecked' or f.lat is null
                        then null
                        else round(private.distance_km(p_lat, p_lng, f.lat, f.lng)::numeric, 1) end,
    'access', f.access,
    'sources', (select coalesce(jsonb_agg(distinct e.source_kind), '[]'::jsonb)
                from public.pitch_evidence e where e.pitch_id = p.id or e.facility_id = f.id),
    'last_reviewed_at', f.last_reviewed_at,
    'photo', (select jsonb_build_object('path', m.storage_path, 'attribution', m.attribution)
              from public.pitch_media m
              where m.facility_id = f.id and m.status = 'approved'
                and (m.pitch_id = p.id or m.pitch_id is null)
              order by (m.pitch_id is not null) desc, m.sort_order, m.created_at
              limit 1),
    'operations', case when p.participation <> 'verified' then null
                       else (select jsonb_build_object(
                               'price_per_hour', o.price_per_hour,
                               'price_note', case when o.price_note_ar is null and o.price_note_en is null
                                                  then null
                                                  else jsonb_build_object('ar', o.price_note_ar,
                                                                          'en', o.price_note_en) end,
                               'slot_minutes', o.slot_minutes,
                               'bookable', private.pitch_is_bookable(p.id))
                             from public.pitch_operations o where o.pitch_id = p.id) end);
$$;

-- ---------------------------------------------------------------------------
-- Privileges
-- ---------------------------------------------------------------------------
revoke execute on function public.add_pitch_media(uuid, uuid, text, public.media_rights, text, text),
  public.admin_review_media(uuid, public.media_status, text) from public, anon;
grant execute on function public.add_pitch_media(uuid, uuid, text, public.media_rights, text, text),
  public.admin_review_media(uuid, public.media_status, text) to authenticated, service_role;

revoke execute on all functions in schema private from public;
-- The storage policies run as the signed-in user.
grant execute on function private.can_view_pitch_media(text), private.can_upload_pitch_media(text)
  to authenticated, service_role;
