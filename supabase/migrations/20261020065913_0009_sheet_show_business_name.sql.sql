ALTER TABLE sheets
  ADD COLUMN IF NOT EXISTS show_business_name boolean NOT NULL DEFAULT true;
