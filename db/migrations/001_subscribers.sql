-- Run against your Neon database (e.g. `neon sql < db/migrations/001_subscribers.sql` or Neon SQL Editor).
CREATE EXTENSION IF NOT EXISTS citext;

CREATE TABLE IF NOT EXISTS subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email CITEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  consent BOOLEAN NOT NULL DEFAULT true
);

CREATE INDEX IF NOT EXISTS subscribers_created_at_idx ON subscribers (created_at DESC);
