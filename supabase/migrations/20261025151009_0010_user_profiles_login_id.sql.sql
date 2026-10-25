alter table user_profiles
  add column if not exists login_id text;

DO $$
BEGIN
  UPDATE user_profiles p
    SET login_id = split_part(u.email, '@', 1)
    FROM auth.users u
    WHERE p.id = u.id
      AND (p.login_id IS NULL OR p.login_id = '');
END $$;
