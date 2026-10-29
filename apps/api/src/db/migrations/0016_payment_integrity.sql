-- Payment integrity (audit P1-01): provider reference, amount/currency, raw payload on payments,
-- an append-only payment_events log, and DB-level guards against double settlement.
-- Idempotent: safe to re-run (the API applies every .sql file at boot).

ALTER TABLE payments ADD COLUMN IF NOT EXISTS provider      text;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS provider_ref  text;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS currency      text NOT NULL DEFAULT 'THB';
ALTER TABLE payments ADD COLUMN IF NOT EXISTS paid_amount   numeric(12,2);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS failed_reason text;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS raw_payload   jsonb;

-- One row per (provider, provider reference). Rows without a provider reference (legacy rows,
-- slips) are not affected: NULLs never collide in a unique index.
CREATE UNIQUE INDEX IF NOT EXISTS payments_provider_ref_unique ON payments (provider, provider_ref);

-- An order can be settled at most once. If legacy data already has two verified payments for the
-- same order this index can't be built: skip it with a notice instead of failing the whole file
-- (resolve the duplicates by hand, then re-run).
DO $$ BEGIN
  CREATE UNIQUE INDEX IF NOT EXISTS payments_one_verified_per_order ON payments (order_id) WHERE status = 'verified';
EXCEPTION
  WHEN unique_violation THEN
    RAISE NOTICE 'payments_one_verified_per_order NOT created: some orders already have more than one verified payment';
END $$;

-- Every authenticated gateway callback, whatever its outcome (settled, duplicate, rejected, ...).
CREATE TABLE IF NOT EXISTS payment_events (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  provider     text NOT NULL,
  event_id     text NOT NULL,
  event_type   text NOT NULL,
  order_id     uuid REFERENCES orders(id) ON DELETE SET NULL,
  payment_id   uuid REFERENCES payments(id) ON DELETE SET NULL,
  payload      jsonb NOT NULL,
  outcome      text,
  reason       text,
  received_at  timestamp NOT NULL DEFAULT now(),
  processed_at timestamp
);

-- Replay protection: the same (provider, event id) is only ever processed once.
CREATE UNIQUE INDEX IF NOT EXISTS payment_events_provider_event_unique ON payment_events (provider, event_id);
CREATE INDEX IF NOT EXISTS payment_events_order_idx ON payment_events (order_id);
