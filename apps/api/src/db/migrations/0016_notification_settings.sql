-- Admin-editable system settings (key/value). First use: notification
-- delivery controls, so UAT/staging can stop real emails and LINE pushes.
CREATE TABLE IF NOT EXISTS system_settings (
  key text PRIMARY KEY NOT NULL,
  value jsonb NOT NULL,
  updated_by uuid REFERENCES users(id) ON DELETE SET NULL,
  updated_at timestamp NOT NULL DEFAULT now()
);

-- Every outgoing email / LINE push, whether it was really sent, redirected
-- to a test inbox, or only captured here. Lets admins read OTP codes and
-- order emails on UAT without anything reaching a real person.
CREATE TABLE IF NOT EXISTS email_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  channel text NOT NULL DEFAULT 'email',
  status text NOT NULL,
  original_to text NOT NULL,
  delivered_to text,
  subject text NOT NULL,
  html text,
  error text,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS email_outbox_created_at_idx ON email_outbox (created_at DESC);
