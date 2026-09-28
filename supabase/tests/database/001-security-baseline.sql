-- Structural guards that apply to every table and function (working rule 4, spec §7 security).
begin;
select plan(6);

select is_empty(
  $$ select c.relname::text
     from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind in ('r', 'p') and not c.relrowsecurity $$,
  'every table in public has row level security enabled'
);

select is_empty(
  $$ select p.proname::text
     from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname in ('public', 'private') and p.prosecdef
       and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) cfg where cfg like 'search_path=%') $$,
  'every SECURITY DEFINER function pins its search_path'
);

select is_empty(
  $$ select p.proname::text
     from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and has_function_privilege('anon', p.oid, 'execute')
       and p.prokind = 'f' and p.prosecdef $$,
  'anon can execute no SECURITY DEFINER function in public (none are allow-listed yet)'
);

select ok(
  not has_function_privilege('authenticated', 'private.claim_job(text, text[], interval)', 'execute')
  and not has_function_privilege('authenticated', 'private.write_audit(text, text, text, jsonb)', 'execute'),
  'clients cannot run worker or audit functions'
);

select is(
  array(select p.proname::text
        from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'private' and has_function_privilege('authenticated', p.oid, 'execute')
        order by 1),
  array['age_group_for', 'age_on', 'amman_today', 'is_admin'],
  'signed-in clients can execute only the allow-listed private helpers'
);

select ok(
  not has_table_privilege('authenticated', 'public.jobs', 'select')
  and not has_table_privilege('anon', 'public.jobs', 'select'),
  'clients have no access to the job queue'
);

select * from finish();
rollback;
