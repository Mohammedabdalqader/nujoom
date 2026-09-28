-- A venue's staff preview their own venue's photos at any review status (D-061).
begin;
select plan(6);

create function pg_temp.city(p_slug text) returns bigint language sql as $$
  select id from public.cities where slug = p_slug $$;
grant execute on all functions in schema pg_temp to anon, authenticated, service_role;

select tests.remember('owner', tests.create_user('owner@nujoom.test'));
select tests.remember('player', tests.create_user('player@nujoom.test'));
-- A website-only owner (D-059).
select tests.act_as(tests.id('owner'));
select public.create_owner_profile('Abu Sami', '1980-05-05', true);

select tests.act_as_postgres();
insert into public.facilities (id, name_ar, city_id, access, listing_state, operator_state)
values ('00000000-0000-4000-8000-0000000000f1', 'ملاعب الشمس', pg_temp.city('zarqa'), 'public_rental', 'hidden', 'claimed'),
       ('00000000-0000-4000-8000-0000000000f2', 'ملاعب القمر', pg_temp.city('zarqa'), 'public_rental', 'published', 'claimed');
insert into public.pitch_staff (facility_id, user_id) values ('00000000-0000-4000-8000-0000000000f1', tests.id('owner'));
insert into public.pitch_media (facility_id, storage_path, rights, status, reason)
values ('00000000-0000-4000-8000-0000000000f1', '00000000-0000-4000-8000-0000000000f1/pending.jpg', 'owner_granted', 'pending', null),
       ('00000000-0000-4000-8000-0000000000f1', '00000000-0000-4000-8000-0000000000f1/rejected.jpg', 'owner_granted', 'rejected', 'wrong_venue'),
       ('00000000-0000-4000-8000-0000000000f2', '00000000-0000-4000-8000-0000000000f2/pending.jpg', 'owner_granted', 'pending', null);

select tests.act_as(tests.id('owner'));
select is(
  array[private.can_view_pitch_media('00000000-0000-4000-8000-0000000000f1/pending.jpg'),
        private.can_view_pitch_media('00000000-0000-4000-8000-0000000000f1/rejected.jpg')],
  array[true, true], 'staff see their own venue''s pending and rejected photos, even while it is hidden');
select is(private.can_view_pitch_media('00000000-0000-4000-8000-0000000000f2/pending.jpg'), false,
  'but not another venue''s pending photo');
select is(
  array[private.can_view_pitch_media('not-a-uuid/x.jpg'), private.can_view_pitch_media('')],
  array[false, false], 'malformed names are simply refused');

select tests.act_as(tests.id('player'));
select is(private.can_view_pitch_media('00000000-0000-4000-8000-0000000000f1/pending.jpg'), false,
  'players still cannot see a pending photo');

select tests.act_as_postgres();
delete from public.pitch_staff where user_id = tests.id('owner');
select tests.act_as(tests.id('owner'));
select is(private.can_view_pitch_media('00000000-0000-4000-8000-0000000000f1/pending.jpg'), false,
  'someone no longer on the venue''s staff loses access');

select tests.act_as_anon();
select throws_ok($$ select private.can_view_pitch_media('00000000-0000-4000-8000-0000000000f1/pending.jpg') $$,
  '42501', null, 'signed-out visitors cannot call the check at all');

select * from finish();
rollback;
