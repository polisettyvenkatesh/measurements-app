alter table sheets drop constraint if exists sheets_material_type_check;
alter table sheets add constraint sheets_material_type_check
  check (material_type in ('Granite','Block'));

alter table settings
  add column if not exists report_table_text_color text not null default '#1e293b';
