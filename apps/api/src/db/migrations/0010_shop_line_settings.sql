DO $$ BEGIN
  ALTER TABLE shops
    ADD COLUMN IF NOT EXISTS line_notify_token text,
    ADD COLUMN IF NOT EXISTS line_group_url text;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
