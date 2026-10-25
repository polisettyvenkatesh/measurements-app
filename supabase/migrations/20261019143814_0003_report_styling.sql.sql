alter table settings
  add column if not exists report_accent_color text not null default '#1e293b',
  add column if not exists report_font text not null default 'helvetica' check (report_font in ('helvetica','times','courier')),
  add column if not exists report_show_borders boolean not null default true,
  add column if not exists report_title text not null default 'Measurement Sheet';
