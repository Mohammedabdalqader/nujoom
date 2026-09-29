// Real concurrency checks (booking contract §9, D-071): pgTAP runs in one transaction and can't
// show what two sessions do at the same moment, so these open separate connections, start the
// same RPC in each at once, and commit each as soon as it finishes (a blocked one then proceeds).
// Fixtures are committed; the database is throwaway.

const FACILITY = '00000000-0000-4000-8000-00000000fac0';
const PITCH = '00000000-0000-4000-8000-00000000fa01';

/** Runs every race; returns the number of failures. */
export async function runRaces(connect) {
  const setup = await connect();
  const users = {};
  const { rows: base } = await setup.query(`
    select (private.amman_today() - interval '25 years')::date::text as dob,
           (select id from public.cities where slug = 'zarqa') as city,
           (select value from public.config where key = 'consent_versions') as consents,
           ((private.amman_today() + 1)::text) as tomorrow`);
  const { dob, city, consents, tomorrow } = base[0];
  for (const name of ['ana', 'bob', 'cat']) {
    const { rows } = await setup.query('select tests.create_user($1) as id', [
      `race-${name}@nujoom.test`,
    ]);
    users[name] = rows[0].id;
    await setup.query('begin');
    await setup.query('select tests.act_as($1)', [users[name]]);
    await setup.query(
      `select public.complete_onboarding($1, $2::date, $3, null, 'MID', $4::jsonb)`,
      [name, dob, city, JSON.stringify(consents)],
    );
    await setup.query('commit');
  }
  // A verified 5-a-side field open 08:00–24:00 every day, 60-minute slots.
  await setup.query(
    `insert into public.facilities (id, name_ar, city_id, access, listing_state, operator_state)
     values ($1, 'ملعب السباق', $2, 'public_rental', 'published', 'authority_verified')`,
    [FACILITY, city],
  );
  await setup.query(
    `insert into public.pitches (id, facility_id, listing_state, players_per_side)
     values ($1, $2, 'published', 5)`,
    [PITCH, FACILITY],
  );
  await setup.query(
    `insert into public.pitch_operations (pitch_id, price_per_hour, slot_minutes, schedule_active, opening_hours)
     values ($1, 20, 60, true, (select jsonb_object_agg(d, '[["08:00","24:00"]]'::jsonb)
                                from unnest(array['sun','mon','tue','wed','thu','fri','sat']) d))`,
    [PITCH],
  );
  await setup.query(
    `update public.pitches set participation = 'verified', verified_at = now() where id = $1`,
    [PITCH],
  );
  // The venue's owner, for walk-in bookings (D-072).
  const { rows: ownerRow } = await setup.query('select tests.create_user($1) as id', [
    'race-owner@nujoom.test',
  ]);
  users.owner = ownerRow[0].id;
  await setup.query('begin');
  await setup.query('select tests.act_as($1)', [users.owner]);
  await setup.query(`select public.create_owner_profile('Owner', '1980-05-05', true)`);
  await setup.query('commit');
  await setup.query(
    `insert into public.pitch_staff (facility_id, user_id, role) values ($1, $2, 'owner')`,
    [FACILITY, users.owner],
  );
  const at = (hhmm) => `${tomorrow} ${hhmm}:00+03`;
  const book = `select (public.create_booking($1, $2::timestamptz, true, null, null, null, $3) ->> 'id') as id`;

  let failures = 0;
  const check = (label, ok, detail) => {
    if (!ok) failures++;
    console.log(`${ok ? 'pass' : 'FAIL'} race: ${label}${ok ? '' : ` ${detail}`}`);
  };
  const confirmedAt = async (hhmm) =>
    (
      await setup.query(
        `select count(*)::int as n from public.bookings
         where pitch_id = $1 and status = 'confirmed' and lower(during) = $2::timestamptz`,
        [PITCH, at(hhmm)],
      )
    ).rows[0].n;

  // 1. Two players, the same hour, at the same moment.
  const r1 = await race(connect, [
    { user: users.ana, sql: book, params: [PITCH, at('18:00'), null] },
    { user: users.bob, sql: book, params: [PITCH, at('18:00'), null] },
  ]);
  const wins = r1.filter((r) => r.ok).length;
  const taken = r1.filter((r) => !r.ok && r.e.message === 'slot_taken').length;
  check(
    'two players, one hour: exactly one booking, the other told "slot_taken"',
    wins === 1 && taken === 1 && (await confirmedAt('18:00')) === 1,
    JSON.stringify(r1.map((r) => (r.ok ? 'ok' : r.e.message))),
  );

  // 2. A retry racing the original request (same request id, same player).
  const req = '00000000-0000-4000-8000-0000000abcde';
  const r2 = await race(connect, [
    { user: users.cat, sql: book, params: [PITCH, at('19:00'), req] },
    { user: users.cat, sql: book, params: [PITCH, at('19:00'), req] },
  ]);
  check(
    'a retry racing its original returns the same booking, made once',
    r2.every((r) => r.ok) &&
      r2[0].r.rows[0].id === r2[1].r.rows[0].id &&
      (await confirmedAt('19:00')) === 1,
    JSON.stringify(r2.map((r) => (r.ok ? r.r.rows[0].id : r.e.message))),
  );

  // 3. The upcoming-bookings limit (3) holds when the third and fourth arrive together.
  await race(connect, [{ user: users.cat, sql: book, params: [PITCH, at('20:00'), null] }]);
  const r3 = await race(connect, [
    { user: users.cat, sql: book, params: [PITCH, at('21:00'), null] },
    { user: users.cat, sql: book, params: [PITCH, at('22:00'), null] },
  ]);
  const { rows: upcoming } = await setup.query(
    `select count(*)::int as n from public.bookings where organizer_id = $1 and status = 'confirmed'`,
    [users.cat],
  );
  check(
    'the three-booking limit holds under concurrency',
    r3.filter((r) => r.ok).length === 1 &&
      r3.filter((r) => !r.ok && r.e.message === 'too_many_bookings').length === 1 &&
      upcoming[0].n === 3,
    JSON.stringify({ r3: r3.map((r) => (r.ok ? 'ok' : r.e.message)), upcoming: upcoming[0].n }),
  );

  // 4. A walk-in booked by staff and a player's booking for the same hour, at once (D-072).
  const walkIn = `select (public.create_manual_booking($1, $2::timestamptz, 'Abu Ali') ->> 'id') as id`;
  const r4 = await race(connect, [
    { user: users.owner, sql: walkIn, params: [PITCH, at('10:00')] },
    { user: users.bob, sql: book, params: [PITCH, at('10:00'), null] },
  ]);
  check(
    'a walk-in and a player booking for the same hour: exactly one wins',
    r4.filter((r) => r.ok).length === 1 &&
      r4.filter((r) => !r.ok && r.e.message === 'slot_taken').length === 1 &&
      (await confirmedAt('10:00')) === 1,
    JSON.stringify(r4.map((r) => (r.ok ? 'ok' : r.e.message))),
  );

  // 5. Two players join the last spot through the same link at once (invites contract §3, D-083).
  // Ana's 5-a-side booking has room for 12: she and ten others fill 11, then two more race for the
  // last spot.
  const { rows: fillers } = await setup.query(
    `select tests.create_user('race-fill-' || g || '@nujoom.test') as id from generate_series(1, 10) g`,
  );
  for (const [i, f] of fillers.entries()) {
    await setup.query('begin');
    await setup.query('select tests.act_as($1)', [f.id]);
    await setup.query(
      `select public.complete_onboarding($1, $2::date, $3, null, 'MID', $4::jsonb)`,
      [`Filler ${i + 1}`, dob, city, JSON.stringify(consents)],
    );
    await setup.query('commit');
  }
  const { rows: late } = await setup.query(
    `select tests.create_user('race-late-' || g || '@nujoom.test') as id from generate_series(1, 2) g`,
  );
  for (const [i, f] of late.entries()) {
    await setup.query('begin');
    await setup.query('select tests.act_as($1)', [f.id]);
    await setup.query(
      `select public.complete_onboarding($1, $2::date, $3, null, 'MID', $4::jsonb)`,
      [`Late ${i + 1}`, dob, city, JSON.stringify(consents)],
    );
    await setup.query('commit');
  }
  const [open] = await race(connect, [
    { user: users.ana, sql: book, params: [PITCH, at('12:00'), null] },
  ]);
  const match = open.r.rows[0].id;
  const [link] = await race(connect, [
    {
      user: users.ana,
      sql: `select public.booking_invite($1) ->> 'token' as token`,
      params: [match],
    },
  ]);
  const token = link.r.rows[0].token;
  const join = `select (public.join_booking($1) ->> 'id') as id`;
  for (const f of fillers) await race(connect, [{ user: f.id, sql: join, params: [token] }]);
  const r5 = await race(
    connect,
    late.map((f) => ({ user: f.id, sql: join, params: [token] })),
  );
  const { rows: inMatch } = await setup.query(
    `select count(*)::int as n from public.booking_players where booking_id = $1 and removed_at is null`,
    [match],
  );
  check(
    'two players, the last spot: exactly one gets in, the other told "booking_full"',
    r5.filter((r) => r.ok).length === 1 &&
      r5.filter((r) => !r.ok && r.e.message === 'booking_full').length === 1 &&
      inMatch[0].n === 12,
    JSON.stringify({ r5: r5.map((r) => (r.ok ? 'ok' : r.e.message)), inMatch: inMatch[0].n }),
  );

  await setup.end();
  return failures;
}

/**
 * Starts each spec's query at the same time in its own transaction (as its user) and commits or
 * rolls back each one as soon as it finishes, so a query blocked by another can go on.
 */
async function race(connect, specs) {
  const clients = await Promise.all(specs.map(() => connect()));
  for (const [i, s] of specs.entries()) {
    await clients[i].query('begin');
    await clients[i].query('select tests.act_as($1)', [s.user]);
  }
  const pending = specs.map((s, i) =>
    clients[i].query(s.sql, s.params).then(
      (r) => ({ i, ok: true, r }),
      (e) => ({ i, ok: false, e }),
    ),
  );
  const results = [];
  const open = new Set(pending.keys());
  while (open.size) {
    const done = await Promise.race([...open].map((i) => pending[i]));
    open.delete(done.i);
    await clients[done.i].query(done.ok ? 'commit' : 'rollback');
    results[done.i] = done;
  }
  await Promise.all(clients.map((c) => c.end()));
  return results;
}
