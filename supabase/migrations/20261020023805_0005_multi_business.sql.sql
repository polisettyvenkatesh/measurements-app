create extension if not exists "pgcrypto";

create table if not exists businesses (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  address     text default '',
  phone       text default '',
  logo_url    text default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table businesses enable row level security;

create table if not exists user_profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  business_id  uuid references businesses(id) on delete set null,
  role         text not null default 'member' check (role in ('admin','member')),
  full_name    text default '',
  created_at   timestamptz not null default now()
);

alter table user_profiles enable row level security;

create or replace function current_user_business_id() returns uuid as $$
  select business_id from user_profiles where id = auth.uid();
$$ language sql stable security definer set search_path = public;

create or replace function is_admin() returns boolean as $$
  select exists (select 1 from user_profiles where id = auth.uid() and role = 'admin');
$$ language sql stable security definer set search_path = public;

drop policy if exists "biz_select" on businesses;
create policy "biz_select" on businesses for select
  to authenticated using (is_admin() or id = current_user_business_id());

drop policy if exists "biz_insert" on businesses;
create policy "biz_insert" on businesses for insert
  to authenticated with check (is_admin());

drop policy if exists "biz_update" on businesses;
create policy "biz_update" on businesses for update
  to authenticated using (is_admin()) with check (is_admin());

drop policy if exists "biz_delete" on businesses;
create policy "biz_delete" on businesses for delete
  to authenticated using (is_admin());

drop policy if exists "profiles_select" on user_profiles;
create policy "profiles_select" on user_profiles for select
  to authenticated using (is_admin() or id = auth.uid());

drop policy if exists "profiles_insert_bootstrap" on user_profiles;
create policy "profiles_insert_bootstrap" on user_profiles for insert
  to authenticated with check (not exists (select 1 from user_profiles));

drop policy if exists "profiles_insert_admin" on user_profiles;
create policy "profiles_insert_admin" on user_profiles for insert
  to authenticated with check (is_admin());

drop policy if exists "profiles_update_own" on user_profiles;
create policy "profiles_update_own" on user_profiles for update
  to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "profiles_update_admin" on user_profiles;
create policy "profiles_update_admin" on user_profiles for update
  to authenticated using (is_admin()) with check (is_admin());

drop policy if exists "profiles_delete_admin" on user_profiles;
create policy "profiles_delete_admin" on user_profiles for delete
  to authenticated using (is_admin());

alter table sheets add column if not exists business_id uuid references businesses(id) on delete cascade;
alter table settings add column if not exists business_id uuid references businesses(id) on delete cascade;

do $$
declare
  default_biz uuid;
begin
  insert into businesses (id, name) values ('00000000-0000-0000-0000-000000000001', 'Default Business')
  on conflict (id) do nothing;
  select id into default_biz from businesses where id = '00000000-0000-0000-0000-000000000001';
  update sheets set business_id = default_biz where business_id is null;
  update settings set business_id = default_biz where business_id is null;
end $$;

alter table sheets alter column business_id set not null;
alter table settings alter column business_id set not null;

alter table sheets drop constraint if exists sheets_sheet_number_key;
alter table sheets add constraint sheets_sheet_number_biz_key unique (business_id, sheet_number);

alter table settings drop constraint if exists settings_pkey;
alter table settings drop constraint if exists settings_id_check;
alter table settings add primary key (business_id);

drop policy if exists "sheets_select_authenticated" on sheets;
create policy "sheets_select" on sheets for select
  to authenticated using (business_id = current_user_business_id() or is_admin());

drop policy if exists "sheets_insert_authenticated" on sheets;
create policy "sheets_insert" on sheets for insert
  to authenticated with check (business_id = current_user_business_id() or is_admin());

drop policy if exists "sheets_update_authenticated" on sheets;
create policy "sheets_update" on sheets for update
  to authenticated using (business_id = current_user_business_id() or is_admin())
  with check (business_id = current_user_business_id() or is_admin());

drop policy if exists "sheets_delete_authenticated" on sheets;
create policy "sheets_delete" on sheets for delete
  to authenticated using (business_id = current_user_business_id() or is_admin());

drop policy if exists "rows_select_authenticated" on sheet_rows;
create policy "rows_select" on sheet_rows for select
  to authenticated using (
    exists (select 1 from sheets s where s.id = sheet_rows.sheet_id
      and (s.business_id = current_user_business_id() or is_admin()))
  );

drop policy if exists "rows_insert_authenticated" on sheet_rows;
create policy "rows_insert" on sheet_rows for insert
  to authenticated with check (
    exists (select 1 from sheets s where s.id = sheet_rows.sheet_id
      and (s.business_id = current_user_business_id() or is_admin()))
  );

drop policy if exists "rows_update_authenticated" on sheet_rows;
create policy "rows_update" on sheet_rows for update
  to authenticated using (
    exists (select 1 from sheets s where s.id = sheet_rows.sheet_id
      and (s.business_id = current_user_business_id() or is_admin()))
  )
  with check (
    exists (select 1 from sheets s where s.id = sheet_rows.sheet_id
      and (s.business_id = current_user_business_id() or is_admin()))
  );

drop policy if exists "rows_delete_authenticated" on sheet_rows;
create policy "rows_delete" on sheet_rows for delete
  to authenticated using (
    exists (select 1 from sheets s where s.id = sheet_rows.sheet_id
      and (s.business_id = current_user_business_id() or is_admin()))
  );

drop policy if exists "settings_select_authenticated" on settings;
create policy "settings_select" on settings for select
  to authenticated using (business_id = current_user_business_id() or is_admin());

drop policy if exists "settings_insert_authenticated" on settings;
create policy "settings_insert" on settings for insert
  to authenticated with check (business_id = current_user_business_id() or is_admin());

drop policy if exists "settings_update_authenticated" on settings;
create policy "settings_update" on settings for update
  to authenticated using (business_id = current_user_business_id() or is_admin())
  with check (business_id = current_user_business_id() or is_admin());

drop trigger if exists businesses_touch on businesses;
create trigger businesses_touch before update on businesses
  for each row execute function touch_updated_at();

create index if not exists user_profiles_business_id_idx on user_profiles(business_id);
create index if not exists sheets_business_id_idx on sheets(business_id);
