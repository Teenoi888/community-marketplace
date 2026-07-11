-- Migration 0001 used CREATE TABLE IF NOT EXISTS "users" which silently
-- skipped adding google_id/facebook_id on databases where users already
-- existed (e.g. any DB created before this schema change). This migration
-- adds them idempotently so those databases catch up.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "google_id" text;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "facebook_id" text;
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_google_id_unique') THEN
  ALTER TABLE "users" ADD CONSTRAINT "users_google_id_unique" UNIQUE("google_id");
 END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_facebook_id_unique') THEN
  ALTER TABLE "users" ADD CONSTRAINT "users_facebook_id_unique" UNIQUE("facebook_id");
 END IF;
END $$;
