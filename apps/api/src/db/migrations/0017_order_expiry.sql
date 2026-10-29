-- Order expiry + reservation bookkeeping (audit P1-04). Idempotent: safe to re-run.

-- When an unpaid order stops being payable. NULL = no deadline (every order that existed before this
-- migration): the expiry sweep never touches those.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_expires_at timestamp;

-- Set only when the order really reserved stock (decremented products.stock) and cleared once that stock
-- has been given back. Without it we can't tell a legacy order (created before stock was reserved) from a
-- new one, and giving stock back for an order that never took any would invent stock.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS stock_reserved_at timestamp;

-- cancel_reason already exists in production (0005_order_cancel_reason.sql) but is not used anywhere yet;
-- repeated here so a fresh database gets it even if 0005 was skipped.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancel_reason text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancelled_at timestamp;

-- The expiry sweep looks only at unpaid orders that have a deadline.
CREATE INDEX IF NOT EXISTS orders_pending_expiry_idx ON orders (payment_expires_at) WHERE status = 'pending_payment';
