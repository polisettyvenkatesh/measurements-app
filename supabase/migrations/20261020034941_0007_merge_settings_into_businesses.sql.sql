alter table businesses
  add column if not exists default_unit text not null default 'feet',
  add column if not exists decimal_precision integer not null default 2,
  add column if not exists sheet_number_prefix text not null default 'SHEET-',
  add column if not exists report_accent_color text not null default '#1e293b',
  add column if not exists report_table_text_color text not null default '#1e293b',
  add column if not exists report_font text not null default 'helvetica'
    check (report_font in ('helvetica', 'times', 'courier')),
  add column if not exists report_show_borders boolean not null default true,
  add column if not exists report_title text not null default 'Measurement Sheet';

do $$
begin
  update businesses b
  set
    default_unit           = s.default_unit,
    decimal_precision      = s.decimal_precision,
    sheet_number_prefix    = s.sheet_number_prefix,
    report_accent_color    = s.report_accent_color,
    report_table_text_color = s.report_table_text_color,
    report_font            = s.report_font,
    report_show_borders    = s.report_show_borders,
    report_title           = s.report_title
  from settings s
  where s.business_id = b.id;
end $$;

drop table if exists settings cascade;
