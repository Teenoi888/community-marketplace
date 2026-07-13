-- Add Google and Facebook UID columns to users table (idempotent)
DO $$ BEGIN
  BEGIN
    ALTER TABLE "users" ADD COLUMN "google_uid" text;
  EXCEPTION WHEN duplicate_column THEN NULL;
  END;
  BEGIN
    ALTER TABLE "users" ADD COLUMN "facebook_uid" text;
  EXCEPTION WHEN duplicate_column THEN NULL;
  END;
END $$;

-- Unique indexes (partial — allow multiple NULLs)
CREATE UNIQUE INDEX IF NOT EXISTS "users_google_uid_unique"   ON "users"("google_uid")   WHERE "google_uid"   IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "users_facebook_uid_unique" ON "users"("facebook_uid") WHERE "facebook_uid" IS NOT NULL;
