create extension if not exists "pgcrypto";

create table if not exists sheets (
  id              uuid primary key default gen_random_uuid(),
  sheet_number    text not null unique,
  date            date not null default current_date,
  customer_name   text not null,
  phone           text,
  material_type   text not null check (material_type in ('Granite','Marble','Block')),
  unit            text not null default 'feet',
  project_name    text,
  notes           text,
  status          text not null default 'draft' check (status in ('draft','saved')),
  total_quantity  numeric(14,3) not null default 0,
  total_area_sqft numeric(14,3) not null default 0,
  area_display_unit text not null default 'sqft',
  created_by      uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table sheets enable row level security;

drop policy if exists "sheets_select_authenticated" on sheets;
create policy "sheets_select_authenticated" on sheets for select
  to authenticated using (true);

drop policy if exists "sheets_insert_authenticated" on sheets;
create policy "sheets_insert_authenticated" on sheets for insert
  to authenticated with check (true);

drop policy if exists "sheets_update_authenticated" on sheets;
create policy "sheets_update_authenticated" on sheets for update
  to authenticated using (true) with check (true);

drop policy if exists "sheets_delete_authenticated" on sheets;
create policy "sheets_delete_authenticated" on sheets for delete
  to authenticated using (true);

create table if not exists sheet_rows (
  id          uuid primary key default gen_random_uuid(),
  sheet_id    uuid not null references sheets(id) on delete cascade,
  serial      int not null default 1,
  piece_no    text,
  length      numeric(12,3) not null default 0,
  width       numeric(12,3) not null default 0,
  height      numeric(12,3) not null default 0,
  quantity    int not null default 1 check (quantity > 0),
  unit        text not null default 'feet',
  area_sqft   numeric(14,3) not null default 0,
  remarks     text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists sheet_rows_sheet_id_idx on sheet_rows(sheet_id);

alter table sheet_rows enable row level security;

drop policy if exists "rows_select_authenticated" on sheet_rows;
create policy "rows_select_authenticated" on sheet_rows for select
  to authenticated using (true);

drop policy if exists "rows_insert_authenticated" on sheet_rows;
create policy "rows_insert_authenticated" on sheet_rows for insert
  to authenticated with check (true);

drop policy if exists "rows_update_authenticated" on sheet_rows;
create policy "rows_update_authenticated" on sheet_rows for update
  to authenticated using (true) with check (true);

drop policy if exists "rows_delete_authenticated" on sheet_rows;
create policy "rows_delete_authenticated" on sheet_rows for delete
  to authenticated using (true);

create table if not exists settings (
  id                 int primary key default 1 check (id = 1),
  business_name      text not null default 'My Business',
  business_address   text default '',
  phone              text default '',
  logo_url           text default '',
  default_unit       text not null default 'feet',
  decimal_precision  int not null default 2 check (decimal_precision between 0 and 4),
  sheet_number_prefix text not null default 'SHEET-',
  updated_at         timestamptz not null default now()
);

alter table settings enable row level security;

drop policy if exists "settings_select_authenticated" on settings;
create policy "settings_select_authenticated" on settings for select
  to authenticated using (true);

drop policy if exists "settings_insert_authenticated" on settings;
create policy "settings_insert_authenticated" on settings for insert
  to authenticated with check (true);

drop policy if exists "settings_update_authenticated" on settings;
create policy "settings_update_authenticated" on settings for update
  to authenticated using (true) with check (true);

insert into settings (id) values (1) on conflict (id) do nothing;

create or replace function touch_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists sheets_touch on sheets;
create trigger sheets_touch before update on sheets
  for each row execute function touch_updated_at();

drop trigger if exists sheet_rows_touch on sheet_rows;
create trigger sheet_rows_touch before update on sheet_rows
  for each row execute function touch_updated_at();

drop trigger if exists settings_touch on settings;
create trigger settings_touch before update on settings
  for each row execute function touch_updated_at();

create index if not exists sheets_created_at_idx on sheets(created_at desc);
create index if not exists sheets_customer_name_idx on sheets(customer_name);
create index if not exists sheets_status_idx on sheets(status);
