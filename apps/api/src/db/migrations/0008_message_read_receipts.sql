DO $$ BEGIN
 ALTER TABLE "messages" ADD COLUMN "read_at" timestamp;
EXCEPTION
 WHEN duplicate_column THEN null;
END $$;