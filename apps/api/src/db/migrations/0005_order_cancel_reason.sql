-- Add cancel_reason column to orders table (idempotent)
DO $$ BEGIN
  BEGIN
    ALTER TABLE "orders" ADD COLUMN "cancel_reason" text;
  EXCEPTION WHEN duplicate_column THEN NULL;
  END;
END $$;
