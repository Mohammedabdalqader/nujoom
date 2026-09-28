-- D1b part 2b: pitch photos with usage rights (D-049).
begin;
select plan(16);

create function pg_temp.city(p_slug text) returns bigint language sql as $$
  select id from public.cities where slug = p_slug $$;
create function pg_temp.consents() returns jsonb language sql as $$
  select value from public.config where key = 'consent_versions' $$;
create function pg_temp.years_ago(p_years integer) returns date language sql as $$
  select (private.amman_today() - make_interval(years => p_years))::date $$;
create function pg_temp.photo() returns jsonb language sql as $$
  select x -> 'photo' from jsonb_array_elements(public.search_pitches() -> 'items') x
  where x ->> 'pitch_id' = '00000000-0000-4000-8000-00000000001a' $$;
grant execute on all functions in schema pg_temp to anon, authenticated, service_role;

select tests.remember('admin', tests.create_user('admin@nujoom.test'));
select tests.make_admin(tests.id('admin'));
select tests.remember('owner', tests.create_user('owner@nujoom.test'));
select tests.remember('player', tests.create_user('player@nujoom.test'));
select tests.act_as(tests.id('owner'));
select public.complete_onboarding('Owner', pg_temp.years_ago(40), pg_temp.city('zarqa'), null, 'DEF', pg_temp.consents());
select tests.act_as(tests.id('player'));
select public.complete_onboarding('Player', pg_temp.years_ago(20), pg_temp.city('zarqa'), null, 'MID', pg_temp.consents());

select tests.act_as_postgres();
insert into public.facilities (id, name_ar, city_id, access, listing_state, operator_state)
values ('00000000-0000-4000-8000-0000000000f1', 'ملاعب الشمس', pg_temp.city('zarqa'), 'public_rental', 'published', 'claimed'),
       ('00000000-0000-4000-8000-0000000000f2', 'ملاعب القمر', pg_temp.city('zarqa'), 'public_rental', 'published', 'none');
insert into public.pitches (id, facility_id, listing_state)
values ('00000000-0000-4000-8000-00000000001a', '00000000-0000-4000-8000-0000000000f1', 'published');
insert into public.pitch_staff (facility_id, user_id) values ('00000000-0000-4000-8000-0000000000f1', tests.id('owner'));

-- Access ---------------------------------------------------------------------------------------
select ok(not has_table_privilege('authenticated', 'public.pitch_media', 'select'),
  'clients never read the media table directly');

-- Staff add their own photos ------------------------------------------------------------------------
select tests.act_as(tests.id('owner'));
select tests.remember('m1', public.add_pitch_media('00000000-0000-4000-8000-0000000000f1',
  '00000000-0000-4000-8000-00000000001a', '00000000-0000-4000-8000-0000000000f1/front.jpg', 'owner_granted'));
select throws_ok(
  $$ select public.add_pitch_media('00000000-0000-4000-8000-0000000000f1', null,
       '00000000-0000-4000-8000-0000000000f1/net.jpg', 'cc_by', 'Someone', 'https://example.org/p') $$,
  'forbidden', 'staff only add photos they own the rights to');
select throws_ok(
  $$ select public.add_pitch_media('00000000-0000-4000-8000-0000000000f2', null,
       '00000000-0000-4000-8000-0000000000f2/x.jpg', 'owner_granted') $$,
  'forbidden', 'and only for their own venue');
select throws_ok(
  $$ select public.add_pitch_media('00000000-0000-4000-8000-0000000000f1', null,
       '00000000-0000-4000-8000-0000000000f2/x.jpg', 'owner_granted') $$,
  'invalid_media_path', 'into their venue''s folder');

select tests.act_as(tests.id('admin'));
select throws_ok(
  $$ select public.add_pitch_media('00000000-0000-4000-8000-0000000000f2', null,
       '00000000-0000-4000-8000-0000000000f2/cc.jpg', 'cc_by') $$,
  'rights_evidence_required', 'a Creative Commons photo needs its credit and source');
select tests.remember('m2', public.add_pitch_media('00000000-0000-4000-8000-0000000000f1', null,
  '00000000-0000-4000-8000-0000000000f1/cc.jpg', 'cc_by', 'Photo: A. Photographer, CC BY 4.0',
  'https://commons.example.org/file/1'));

-- Nothing shows before approval ---------------------------------------------------------------------
select tests.act_as(tests.id('player'));
select is(pg_temp.photo(), 'null'::jsonb, 'a pending photo is not shown');
select is(private.can_view_pitch_media('00000000-0000-4000-8000-0000000000f1/front.jpg'), false,
  'nor readable from storage');
select throws_ok(format($$ select public.admin_review_media(%L, 'approved') $$, tests.id('m1')),
  'forbidden', 'players cannot approve photos');

-- Approval ----------------------------------------------------------------------------------------------
select tests.act_as(tests.id('admin'));
select public.admin_review_media(tests.id('m2'), 'approved', 'licence_checked');
select tests.act_as(tests.id('player'));
select is(pg_temp.photo(),
  '{"path": "00000000-0000-4000-8000-0000000000f1/cc.jpg", "attribution": "Photo: A. Photographer, CC BY 4.0"}'::jsonb,
  'an approved venue photo shows, with its required credit');
select is(private.can_view_pitch_media('00000000-0000-4000-8000-0000000000f1/cc.jpg'), true,
  'and signed-in players may read it');
select tests.act_as(tests.id('admin'));
select public.admin_review_media(tests.id('m1'), 'approved');
select tests.act_as(tests.id('player'));
select is(pg_temp.photo() ->> 'path', '00000000-0000-4000-8000-0000000000f1/front.jpg',
  'the field''s own photo comes before the venue''s');

select tests.act_as(tests.id('admin'));
select public.admin_review_media(tests.id('m1'), 'rejected', 'wrong_venue');
select tests.act_as(tests.id('player'));
select is(pg_temp.photo() ->> 'path', '00000000-0000-4000-8000-0000000000f1/cc.jpg',
  'a rejected photo disappears again');
select is(private.can_view_pitch_media('00000000-0000-4000-8000-0000000000f1/front.jpg'), false,
  'and is no longer readable');

-- Unpublished venues keep their photos private -----------------------------------------------------------
select tests.act_as_postgres();
update public.facilities set listing_state = 'hidden' where id = '00000000-0000-4000-8000-0000000000f1';
select tests.act_as(tests.id('player'));
select is(private.can_view_pitch_media('00000000-0000-4000-8000-0000000000f1/cc.jpg'), false,
  'a hidden venue''s approved photos are not readable');

-- Upload rights --------------------------------------------------------------------------------------------
select is(
  array[private.can_upload_pitch_media('00000000-0000-4000-8000-0000000000f1/a.jpg'),
        private.can_upload_pitch_media('00000000-0000-4000-8000-0000000000f2/a.jpg')],
  array[false, false], 'players cannot upload into any venue folder');
select tests.act_as(tests.id('owner'));
select is(
  array[private.can_upload_pitch_media('00000000-0000-4000-8000-0000000000f1/a.jpg'),
        private.can_upload_pitch_media('00000000-0000-4000-8000-0000000000f2/a.jpg')],
  array[true, false], 'staff upload only into their own venue''s folder');

select * from finish();
rollback;
