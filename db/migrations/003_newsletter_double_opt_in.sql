-- Add double opt-in metadata so newsletter subscribers can be verified locally
-- before they are synced to Resend Contacts.
BEGIN;

CREATE TEMP TABLE newsletter_migration_cutoff ON COMMIT DROP AS
SELECT statement_timestamp() AS cutoff_at;

ALTER TABLE subscribers
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verification_email_sent_at TIMESTAMPTZ;

UPDATE subscribers
SET verified_at = COALESCE(subscribed_at, created_at, now())
FROM newsletter_migration_cutoff
WHERE subscribers.verified_at IS NULL
  AND subscribers.created_at < newsletter_migration_cutoff.cutoff_at;

COMMIT;
