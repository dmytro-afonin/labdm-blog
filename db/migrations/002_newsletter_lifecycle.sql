-- Extend subscribers beyond insert-only capture so Astro pages, manual syncs,
-- and Resend webhooks can reconcile against the same source of truth.
ALTER TABLE subscribers
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'subscribed',
  ADD COLUMN IF NOT EXISTS subscribed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS unsubscribed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS resend_contact_id TEXT,
  ADD COLUMN IF NOT EXISTS sync_status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS sync_requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_sync_error TEXT,
  ADD COLUMN IF NOT EXISTS sync_attempt_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_webhook_at TIMESTAMPTZ;

UPDATE subscribers
SET
  status = CASE WHEN consent THEN 'subscribed' ELSE 'unsubscribed' END,
  subscribed_at = COALESCE(subscribed_at, created_at),
  updated_at = COALESCE(updated_at, created_at),
  sync_requested_at = COALESCE(sync_requested_at, created_at)
WHERE TRUE;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'subscribers_status_check'
      AND conrelid = 'subscribers'::regclass
  ) THEN
    ALTER TABLE subscribers
      ADD CONSTRAINT subscribers_status_check
      CHECK (status IN ('subscribed', 'unsubscribed'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'subscribers_sync_status_check'
      AND conrelid = 'subscribers'::regclass
  ) THEN
    ALTER TABLE subscribers
      ADD CONSTRAINT subscribers_sync_status_check
      CHECK (sync_status IN ('pending', 'synced', 'failed'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS subscribers_sync_status_idx
  ON subscribers (sync_status, sync_requested_at ASC);

CREATE TABLE IF NOT EXISTS subscriber_sync_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_id UUID REFERENCES subscribers(id) ON DELETE SET NULL,
  provider TEXT NOT NULL DEFAULT 'resend',
  direction TEXT NOT NULL,
  event_type TEXT NOT NULL,
  status TEXT NOT NULL,
  provider_event_id TEXT,
  error_message TEXT,
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS subscriber_sync_events_provider_event_id_idx
  ON subscriber_sync_events (provider_event_id)
  WHERE provider_event_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS subscriber_sync_events_status_idx
  ON subscriber_sync_events (status, created_at DESC);
