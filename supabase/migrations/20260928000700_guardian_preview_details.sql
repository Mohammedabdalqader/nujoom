-- S1-11: the approval screen asks a guardian for their name and date of birth only when they
-- have no account profile yet (accept_guardian_invite then creates a guardian-only profile).
-- guardian_invite_preview gains `needs_details`; still null unless the caller is the invited
-- address, and still never more than the youth's name.

create or replace function public.guardian_invite_preview(p_token text)
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
                              'expires_at', v_link.invite_expires_at,
                              'needs_details', not exists (
                                select 1 from public.profiles me where me.id = (select auth.uid())))
    from public.profiles p where p.id = v_link.youth_user_id
  );
end;
$$;

revoke execute on function public.guardian_invite_preview(text) from public, anon;
grant execute on function public.guardian_invite_preview(text) to authenticated, service_role;

revoke execute on all functions in schema private from public;
