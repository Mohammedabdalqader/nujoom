-- R0 places: countries, cities and neighborhoods, plus the reference data every environment needs.
-- Neighborhoods are rows (not free text) so neighborhood leaderboards and standings group reliably.

create table public.countries (
  code char(2) primary key check (code ~ '^[A-Z]{2}$'),
  name_ar text not null,
  name_en text not null,
  calling_code text not null check (calling_code ~ '^\+[0-9]{1,4}$'),
  currency char(3) not null,
  timezone text not null,
  is_active boolean not null default true
);

create table public.cities (
  id bigint generated always as identity primary key,
  country_code char(2) not null default 'JO' references public.countries (code),
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,40}$'),
  name_ar text not null,
  name_en text not null,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.neighborhoods (
  id bigint generated always as identity primary key,
  city_id bigint not null references public.cities (id) on delete restrict,
  slug text not null check (slug ~ '^[a-z0-9-]{2,60}$'),
  name_ar text not null,
  name_en text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (city_id, slug),
  unique (id, city_id) -- target of composite FKs that keep a neighborhood inside its city
);

alter table public.countries enable row level security;
alter table public.cities enable row level security;
alter table public.neighborhoods enable row level security;
revoke all on table public.countries, public.cities, public.neighborhoods from anon, authenticated;
grant select on table public.countries, public.cities, public.neighborhoods to anon, authenticated;
grant insert, update, delete on table public.countries, public.cities, public.neighborhoods to authenticated;
grant all on table public.countries, public.cities, public.neighborhoods to service_role;

create policy "anyone can read countries" on public.countries
  for select to anon, authenticated using (true);
create policy "admins manage countries" on public.countries for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "anyone can read cities" on public.cities
  for select to anon, authenticated using (true);
create policy "admins manage cities" on public.cities for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "anyone can read neighborhoods" on public.neighborhoods
  for select to anon, authenticated using (true);
create policy "admins manage neighborhoods" on public.neighborhoods for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

-- ---------------------------------------------------------------------------
-- Reference data (production included). Dev fixtures live in tests, not here.
-- ---------------------------------------------------------------------------
insert into public.countries (code, name_ar, name_en, calling_code, currency, timezone) values
  ('JO', 'الأردن', 'Jordan', '+962', 'JOD', 'Asia/Amman');

insert into public.cities (slug, name_ar, name_en, sort_order) values
  ('amman', 'عمان', 'Amman', 1),
  ('zarqa', 'الزرقاء', 'Zarqa', 2),
  ('irbid', 'إربد', 'Irbid', 3),
  ('aqaba', 'العقبة', 'Aqaba', 4),
  ('salt', 'السلط', 'Salt', 5),
  ('madaba', 'مادبا', 'Madaba', 6),
  ('jerash', 'جرش', 'Jerash', 7),
  ('mafraq', 'المفرق', 'Mafraq', 8),
  ('karak', 'الكرك', 'Karak', 9),
  ('ajloun', 'عجلون', 'Ajloun', 10),
  ('maan', 'معان', 'Ma''an', 11),
  ('tafilah', 'الطفيلة', 'Tafilah', 12);

-- Amman first (spec §1). Other cities get neighborhoods as pitches onboard.
insert into public.neighborhoods (city_id, slug, name_ar, name_en)
select c.id, n.slug, n.name_ar, n.name_en
from public.cities c
cross join (values
  ('jabal-al-hussein', 'جبل الحسين', 'Jabal al-Hussein'),
  ('weibdeh', 'اللويبدة', 'Weibdeh'),
  ('abdali', 'العبدلي', 'Abdali'),
  ('marka', 'ماركا', 'Marka'),
  ('sweileh', 'صويلح', 'Sweileh'),
  ('jubeiha', 'الجبيهة', 'Jubeiha'),
  ('al-kursi', 'الكرسي', 'Al-Kursi'),
  ('dabouq', 'دابوق', 'Dabouq'),
  ('nuzha', 'النزهة', 'Nuzha'),
  ('hashmi-al-shamali', 'الهاشمي الشمالي', 'Hashmi al-Shamali'),
  ('jabal-al-taj', 'جبل التاج', 'Jabal al-Taj'),
  ('jabal-amman', 'جبل عمان', 'Jabal Amman'),
  ('abdoun', 'عبدون', 'Abdoun'),
  ('sweifieh', 'الصويفية', 'Sweifieh'),
  ('khalda', 'خلدا', 'Khalda'),
  ('tla-al-ali', 'تلاع العلي', 'Tla'' al-Ali'),
  ('shmeisani', 'الشميساني', 'Shmeisani'),
  ('abu-nseir', 'أبو نصير', 'Abu Nseir'),
  ('tabarbour', 'طبربور', 'Tabarbour'),
  ('wadi-al-seer', 'وادي السير', 'Wadi al-Seer'),
  ('sahab', 'سحاب', 'Sahab'),
  ('marj-al-hamam', 'مرج الحمام', 'Marj al-Hamam'),
  ('al-bayader', 'البيادر', 'Al-Bayader'),
  ('um-uthaina', 'أم أذينة', 'Um Uthaina'),
  ('rabieh', 'الرابية', 'Rabieh'),
  ('shafa-badran', 'شفا بدران', 'Shafa Badran'),
  ('abu-alanda', 'أبو علندا', 'Abu Alanda'),
  ('al-muqabalain', 'المقابلين', 'Al-Muqabalain'),
  ('dahiyat-al-rasheed', 'ضاحية الرشيد', 'Dahiyat al-Rasheed')
) as n (slug, name_ar, name_en)
where c.slug = 'amman';
