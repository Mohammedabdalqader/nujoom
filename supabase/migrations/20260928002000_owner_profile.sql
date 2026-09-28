-- A basic adult profile for venue owners who use only the website (D-059). Claiming a venue needs
-- an adult profile; players get one from app onboarding and parents a guardian-only one. An owner
-- gives a name and an adult date of birth and accepts the current terms and privacy policy; they
-- do not become a player (no city, position or card presence). The profile_private trigger
-- derives adulthood from the date of birth, as everywhere else.

create function public.create_owner_profile(p_name text, p_dob date, p_accept_terms boolean)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_versions jsonb := (select value from public.config where key = 'consent_versions');
  -- Trimmed, spaces collapsed (as normalizeDisplayName in @nujoom/shared).
  v_name text := nullif(regexp_replace(btrim(coalesce(p_name, '')), '\s+', ' ', 'g'), '');
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = 'insufficient_privilege';
  end if;
  if exists (select 1 from public.profiles where id = v_uid) then
    return jsonb_build_object('created', false);
  end if;
  if p_accept_terms is not true then
    raise exception 'consent_required' using errcode = 'check_violation';
  end if;
  if v_name is null or char_length(v_name) not between 2 and 40 then
    raise exception 'invalid_name' using errcode = 'check_violation';
  end if;
  if p_dob is null or private.age_on(p_dob, private.amman_today()) < 18 then
    raise exception 'not_adult' using errcode = 'check_violation';
  end if;
  insert into public.profiles (id, display_name) values (v_uid, v_name);
  insert into public.profile_private (user_id, dob) values (v_uid, p_dob);
  insert into public.user_settings (user_id) values (v_uid) on conflict (user_id) do nothing;
  insert into public.consents (user_id, type, version, granted, given_by)
  select v_uid, t::public.consent_type, v_versions ->> t, true, v_uid
  from unnest(array['terms', 'privacy']) t;
  perform private.write_audit('account.owner_profile_created', 'user', v_uid::text);
  return jsonb_build_object('created', true);
end;
$$;

revoke execute on function public.create_owner_profile(text, date, boolean) from public, anon;
grant execute on function public.create_owner_profile(text, date, boolean) to authenticated, service_role;

revoke execute on all functions in schema private from public;
