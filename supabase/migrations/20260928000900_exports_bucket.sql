-- S1-9 data rights, part 2: the private bucket for data exports (D-038, D-039).
-- No storage policies at all: only the service role (the data-export Edge Function) reads or
-- writes it, and users download their bundle through a signed link that expires.
do $$
begin
  if to_regclass('storage.objects') is null then
    raise notice 'storage schema not present; skipping exports bucket';
    return;
  end if;
  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('exports', 'exports', false, 10485760, array['application/json'])
  on conflict (id) do nothing;
end;
$$;
