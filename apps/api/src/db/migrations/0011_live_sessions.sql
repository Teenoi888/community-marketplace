DO $$ BEGIN
  CREATE TABLE IF NOT EXISTS "live_sessions" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "shop_id" uuid NOT NULL REFERENCES "shops"("id") ON DELETE CASCADE,
    "seller_id" uuid NOT NULL REFERENCES "users"("id"),
    "title" text NOT NULL,
    "status" text NOT NULL DEFAULT 'live',
    "pinned_products" jsonb DEFAULT '[]',
    "viewer_count" integer DEFAULT 0,
    "started_at" timestamp DEFAULT now() NOT NULL,
    "ended_at" timestamp
  );
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS live_sessions_status_idx ON live_sessions(status);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
