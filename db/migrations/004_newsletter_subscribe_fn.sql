-- Single-call subscribe: one client round-trip; email + Resend sync run in waitUntil from the app.
CREATE OR REPLACE FUNCTION newsletter_subscribe(p_email citext)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  r subscribers%ROWTYPE;
  inserted subscribers%ROWTYPE;
  updated_count int;
BEGIN
  INSERT INTO subscribers (
    email,
    consent,
    status,
    subscribed_at,
    updated_at,
    sync_status,
    sync_requested_at
  )
  VALUES (
    p_email,
    true,
    'subscribed',
    now(),
    now(),
    'pending',
    now()
  )
  ON CONFLICT (email) DO NOTHING
  RETURNING * INTO inserted;

  IF inserted.id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'result',
      'check-inbox',
      'subscriber',
      to_jsonb(inserted)
    );
  END IF;

  SELECT * INTO STRICT r FROM subscribers WHERE email = p_email FOR UPDATE;

  IF r.verified_at IS NULL THEN
    UPDATE subscribers
    SET
      consent = true,
      status = 'subscribed',
      subscribed_at = now(),
      unsubscribed_at = NULL,
      updated_at = now(),
      sync_status = 'pending',
      sync_requested_at = now(),
      last_sync_error = NULL
    WHERE id = r.id
      AND verified_at IS NULL
    RETURNING * INTO r;

    GET DIAGNOSTICS updated_count = ROW_COUNT;
    IF updated_count > 0 THEN
      RETURN jsonb_build_object(
        'result',
        'check-inbox',
        'subscriber',
        to_jsonb(r)
      );
    END IF;

    SELECT * INTO STRICT r FROM subscribers WHERE email = p_email;
  END IF;

  IF r.status = 'unsubscribed' THEN
    UPDATE subscribers
    SET
      status = 'subscribed',
      consent = true,
      subscribed_at = now(),
      unsubscribed_at = NULL,
      updated_at = now(),
      sync_status = 'pending',
      sync_requested_at = now(),
      last_sync_error = NULL
    WHERE id = r.id
    RETURNING * INTO STRICT r;

    RETURN jsonb_build_object(
      'result',
      'resubscribed',
      'subscriber',
      to_jsonb(r)
    );
  END IF;

  UPDATE subscribers AS s
  SET
    updated_at = now(),
    sync_status = CASE
      WHEN s.sync_status = 'synced'
        AND s.resend_contact_id IS NOT NULL
        THEN s.sync_status
      ELSE 'pending'
    END,
    sync_requested_at = CASE
      WHEN s.sync_status = 'synced'
        AND s.resend_contact_id IS NOT NULL
        THEN s.sync_requested_at
      ELSE now()
    END,
    last_sync_error = CASE
      WHEN s.sync_status = 'synced'
        AND s.resend_contact_id IS NOT NULL
        THEN s.last_sync_error
      ELSE NULL
    END
  WHERE s.id = r.id
  RETURNING * INTO STRICT r;

  RETURN jsonb_build_object(
    'result',
    'already-subscribed',
    'subscriber',
    to_jsonb(r)
  );
END;
$$;
