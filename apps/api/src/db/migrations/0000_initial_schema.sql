-- Community Marketplace: Initial Schema Migration
-- Generated manually from schema.ts

-- Enums
DO $$ BEGIN
  CREATE TYPE "community_plan" AS ENUM ('free', 'community', 'pro');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "member_role" AS ENUM ('admin', 'seller', 'member');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "product_status" AS ENUM ('active', 'inactive', 'out_of_stock');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "order_status" AS ENUM ('pending_payment', 'paid', 'preparing', 'shipped', 'delivered', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "payment_method" AS ENUM ('promptpay', 'qr_code', 'bank_transfer', 'credit_card');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "payment_status" AS ENUM ('pending', 'verifying', 'verified', 'failed', 'refunded');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "message_type" AS ENUM ('text', 'image', 'order_ref');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Tables
CREATE TABLE IF NOT EXISTS "users" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" text NOT NULL,
  "phone" text UNIQUE,
  "email" text UNIQUE,
  "password_hash" text,
  "line_uid" text UNIQUE,
  "avatar_url" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "communities" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" text NOT NULL,
  "province" text NOT NULL,
  "district" text NOT NULL,
  "subdistrict" text NOT NULL,
  "slug" text UNIQUE NOT NULL,
  "description" text,
  "logo_url" text,
  "banner_url" text,
  "plan" "community_plan" DEFAULT 'free' NOT NULL,
  "member_count" integer DEFAULT 0 NOT NULL,
  "is_verified" boolean DEFAULT false NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "community_members" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "community_id" uuid NOT NULL REFERENCES "communities"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "role" "member_role" DEFAULT 'member' NOT NULL,
  "joined_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "shops" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "community_id" uuid NOT NULL REFERENCES "communities"("id") ON DELETE CASCADE,
  "owner_id" uuid NOT NULL REFERENCES "users"("id"),
  "name" text NOT NULL,
  "description" text,
  "banner_url" text,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "products" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "shop_id" uuid NOT NULL REFERENCES "shops"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "description" text,
  "price" numeric(12,2) NOT NULL,
  "stock" integer DEFAULT 0 NOT NULL,
  "images" jsonb DEFAULT '[]' NOT NULL,
  "category" text NOT NULL,
  "status" "product_status" DEFAULT 'active' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "orders" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "buyer_id" uuid NOT NULL REFERENCES "users"("id"),
  "shop_id" uuid NOT NULL REFERENCES "shops"("id"),
  "status" "order_status" DEFAULT 'pending_payment' NOT NULL,
  "total" numeric(12,2) NOT NULL,
  "delivery_address" jsonb NOT NULL,
  "tracking_number" text,
  "logistics_provider" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "order_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "order_id" uuid NOT NULL REFERENCES "orders"("id") ON DELETE CASCADE,
  "product_id" uuid NOT NULL REFERENCES "products"("id"),
  "product_name" text NOT NULL,
  "qty" integer NOT NULL,
  "price_snapshot" numeric(12,2) NOT NULL
);

CREATE TABLE IF NOT EXISTS "payments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "order_id" uuid NOT NULL REFERENCES "orders"("id") ON DELETE CASCADE,
  "method" "payment_method" NOT NULL,
  "amount" numeric(12,2) NOT NULL,
  "status" "payment_status" DEFAULT 'pending' NOT NULL,
  "reference" text,
  "slip_url" text,
  "verified_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "conversations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "buyer_id" uuid NOT NULL REFERENCES "users"("id"),
  "seller_id" uuid NOT NULL REFERENCES "users"("id"),
  "order_id" uuid REFERENCES "orders"("id"),
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "messages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "conversation_id" uuid NOT NULL REFERENCES "conversations"("id") ON DELETE CASCADE,
  "sender_id" uuid NOT NULL REFERENCES "users"("id"),
  "content" text NOT NULL,
  "type" "message_type" DEFAULT 'text' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
