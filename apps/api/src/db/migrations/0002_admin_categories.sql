-- Add user role enum and column
DO $$ BEGIN
  CREATE TYPE "user_role" AS ENUM ('user', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "users" ADD COLUMN "role" "user_role" NOT NULL DEFAULT 'user';
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- Create categories table
CREATE TABLE IF NOT EXISTS "categories" (
  "id"         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "slug"       text UNIQUE NOT NULL,
  "name"       text NOT NULL,
  "emoji"      text NOT NULL DEFAULT '📦',
  "sort_order" integer NOT NULL DEFAULT 0,
  "is_active"  boolean NOT NULL DEFAULT true,
  "created_at" timestamp DEFAULT now() NOT NULL
);

-- Seed default categories
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
