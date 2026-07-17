-- Add variants JSONB column to products for SKU support
ALTER TABLE products ADD COLUMN IF NOT EXISTS variants jsonb NOT NULL DEFAULT '[]';
