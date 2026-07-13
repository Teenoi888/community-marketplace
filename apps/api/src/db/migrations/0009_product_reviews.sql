DO $$ BEGIN
  CREATE TABLE IF NOT EXISTS "reviews" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "product_id" uuid NOT NULL REFERENCES "products"("id") ON DELETE CASCADE,
    "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "order_id" uuid NOT NULL REFERENCES "orders"("id") ON DELETE CASCADE,
    "rating" integer NOT NULL,
    "comment" text,
    "created_at" timestamp DEFAULT now() NOT NULL
  );
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

DO $$ BEGIN
  CREATE UNIQUE INDEX IF NOT EXISTS "reviews_user_product_idx" ON "reviews"("user_id", "product_id");
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;
