-- Add user_addresses table for saved shipping addresses
CREATE TABLE IF NOT EXISTS "user_addresses" (
  "id"         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id"    uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "label"      text NOT NULL DEFAULT 'บ้าน',
  "name"       text NOT NULL,
  "phone"      text NOT NULL,
  "address"    text NOT NULL,
  "province"   text NOT NULL,
  "district"   text NOT NULL,
  "zip_code"   text NOT NULL,
  "is_default" boolean NOT NULL DEFAULT false,
  "created_at" timestamp DEFAULT now() NOT NULL
);
