alter table user_profiles
  add column if not exists disabled boolean not null default false;
