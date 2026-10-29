-- Refund requests (audit P1-06). Idempotent: safe to re-run.
-- Lifecycle: requested → approved → refunded   (or requested/approved → rejected)
-- "refunded" means an admin has actually returned the money (outside this system, via the gateway
-- dashboard or bank) and recorded the reference.
CREATE TABLE IF NOT EXISTS refunds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  payment_id uuid NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'requested' CHECK (status IN ('requested','approved','rejected','refunded')),
  requested_by uuid REFERENCES users(id) ON DELETE SET NULL,
  approved_by uuid REFERENCES users(id) ON DELETE SET NULL,
  admin_note text,
  provider_refund_ref text,
  created_at timestamp NOT NULL DEFAULT now(),
  decided_at timestamp,
  refunded_at timestamp
);

-- At most one open (requested/approved) refund per order, so a double-click or a race can't queue two.
CREATE UNIQUE INDEX IF NOT EXISTS refunds_one_open_per_order ON refunds (order_id) WHERE status IN ('requested','approved');
CREATE INDEX IF NOT EXISTS refunds_status_idx ON refunds (status, created_at);
