DO $$ BEGIN
 CREATE TYPE "public"."user_role" AS ENUM('user', 'admin');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"emoji" text DEFAULT '📦' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "users" ADD COLUMN "role" "user_role" DEFAULT 'user' NOT NULL;
EXCEPTION
 WHEN duplicate_column THEN null;
END $$;
--> statement-breakpoint
INSERT INTO "categories" ("slug", "name", "emoji", "sort_order") VALUES
  ('agriculture',    'เกษตร',        '🌾', 1),
  ('processed_food', 'อาหารแปรรูป', '🥫', 2),
  ('fresh_produce',  'ผักผลไม้สด',  '🥬', 3),
  ('handicraft',     'งานฝีมือ',     '🧶', 4),
  ('herb',           'สมุนไพร',      '🌿', 5),
  ('seafood',        'ประมง',         '🐟', 6),
  ('beverage',       'เครื่องดื่ม',  '🍵', 7),
  ('otop',           'OTOP',          '🏆', 8)
ON CONFLICT (slug) DO NOTHING;