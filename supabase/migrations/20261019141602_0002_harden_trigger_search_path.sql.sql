drop function if exists touch_updated_at() cascade;

create or replace function touch_updated_at() returns trigger
  language plpgsql
  set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists sheets_touch on sheets;
create trigger sheets_touch before update on sheets
  for each row execute function touch_updated_at();

drop trigger if exists sheet_rows_touch on sheet_rows;
create trigger sheet_rows_touch before update on sheet_rows
  for each row execute function touch_updated_at();

drop trigger if exists settings_touch on settings;
create trigger settings_touch before update on settings
  for each row execute function touch_updated_at();
