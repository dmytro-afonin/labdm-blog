import {
  buildNewsletterManageUrl,
  verifyNewsletterManageToken,
} from "./newsletter-manage-token";
import { getNeonSql, isDatabaseConfigured } from "./neon";
import {
  createResendContact,
  getResendContact,
  updateResendContact,
  type ResendContactWebhookEvent,
} from "./resend";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const defaultSyncLimit = 25;
const maxSyncErrorLength = 1000;
const SUBSCRIBER_COLUMNS = `
  id,
  email,
  consent,
  status,
  sync_status,
  resend_contact_id,
  created_at,
  subscribed_at,
  updated_at,
  unsubscribed_at,
  sync_requested_at,
  last_synced_at,
  last_sync_error,
  sync_attempt_count,
  last_webhook_at
`;

export type NewsletterSubscriberStatus = "subscribed" | "unsubscribed";
export type NewsletterSyncStatus = "pending" | "synced" | "failed";
export type NewsletterManageAction = "unsubscribe" | "resubscribe";
export type NewsletterSubscriptionResult =
  | "subscribed"
  | "already-subscribed"
  | "resubscribed";
export type NewsletterManageResult =
  | "invalid"
  | "unsubscribed"
  | "resubscribed";

interface SubscriberRow {
  id: string;
  email: string;
  consent: boolean;
  status: NewsletterSubscriberStatus;
  sync_status: NewsletterSyncStatus;
  resend_contact_id: string | null;
  created_at: string;
  subscribed_at: string;
  updated_at: string;
  unsubscribed_at: string | null;
  sync_requested_at: string;
  last_synced_at: string | null;
  last_sync_error: string | null;
  sync_attempt_count: number;
  last_webhook_at: string | null;
}

interface SyncCountsRow {
  total_count: number;
  pending_count: number;
  synced_count: number;
  failed_count: number;
}

interface FailedSyncRow {
  email: string;
  sync_status: NewsletterSyncStatus;
  sync_attempt_count: number;
  last_sync_error: string | null;
  sync_requested_at: string;
  last_synced_at: string | null;
}

type SyncEventStatus = "received" | "success" | "failed" | "ignored";

interface SyncEventInsertRow {
  id: string;
}

interface SyncEventStatusRow {
  id: string;
  status: SyncEventStatus;
}

export interface NewsletterSubscriber {
  id: string;
  email: string;
  consent: boolean;
  status: NewsletterSubscriberStatus;
  syncStatus: NewsletterSyncStatus;
  resendContactId: string | null;
  createdAt: string;
  subscribedAt: string;
  updatedAt: string;
  unsubscribedAt: string | null;
  syncRequestedAt: string;
  lastSyncedAt: string | null;
  lastSyncError: string | null;
  syncAttemptCount: number;
  lastWebhookAt: string | null;
}

export interface NewsletterManageView {
  subscriber: NewsletterSubscriber;
  action: NewsletterManageAction;
  title: string;
  message: string;
  submitLabel: string;
}

export interface NewsletterSyncSummary {
  attempted: number;
  succeeded: number;
  failed: number;
  failures: Array<{
    email: string;
    message: string;
  }>;
}

export interface NewsletterSyncReport {
  counts: {
    total: number;
    pending: number;
    synced: number;
    failed: number;
  };
  failedSubscribers: Array<{
    email: string;
    syncStatus: NewsletterSyncStatus;
    syncAttemptCount: number;
    lastSyncError: string | null;
    syncRequestedAt: string;
    lastSyncedAt: string | null;
  }>;
}

function requireDatabaseConfigured(): void {
  if (!isDatabaseConfigured()) {
    throw new Error("POSTGRES_URL is not configured.");
  }
}

function mapSubscriber(row: SubscriberRow): NewsletterSubscriber {
  return {
    id: row.id,
    email: row.email.toLowerCase(),
    consent: row.consent,
    status: row.status,
    syncStatus: row.sync_status,
    resendContactId: row.resend_contact_id,
    createdAt: row.created_at,
    subscribedAt: row.subscribed_at,
    updatedAt: row.updated_at,
    unsubscribedAt: row.unsubscribed_at,
    syncRequestedAt: row.sync_requested_at,
    lastSyncedAt: row.last_synced_at,
    lastSyncError: row.last_sync_error,
    syncAttemptCount: row.sync_attempt_count,
    lastWebhookAt: row.last_webhook_at,
  };
}

function truncateErrorMessage(message: string): string {
  return message.slice(0, maxSyncErrorLength);
}

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return truncateErrorMessage(error.message.trim());
  }
  return "Unknown error";
}

export function normalizeNewsletterEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidNewsletterEmail(email: string): boolean {
  return emailPattern.test(email);
}

async function querySingleSubscriber(
  query: Promise<unknown>,
): Promise<NewsletterSubscriber | null> {
  const rows = (await query) as SubscriberRow[];
  const row = rows[0];
  return row ? mapSubscriber(row) : null;
}

async function getSubscriberById(
  id: string,
): Promise<NewsletterSubscriber | null> {
  const sql = getNeonSql();
  return querySingleSubscriber(sql`
    SELECT
      ${sql.unsafe(SUBSCRIBER_COLUMNS)}
    FROM subscribers
    WHERE id = ${id}
    LIMIT 1
  `);
}

async function getSubscriberByEmail(
  email: string,
): Promise<NewsletterSubscriber | null> {
  const sql = getNeonSql();
  return querySingleSubscriber(sql`
    SELECT
      ${sql.unsafe(SUBSCRIBER_COLUMNS)}
    FROM subscribers
    WHERE email = ${email}
    LIMIT 1
  `);
}

async function getSubscriberByResendContactId(
  resendContactId: string,
): Promise<NewsletterSubscriber | null> {
  const sql = getNeonSql();
  return querySingleSubscriber(sql`
    SELECT
      ${sql.unsafe(SUBSCRIBER_COLUMNS)}
    FROM subscribers
    WHERE resend_contact_id = ${resendContactId}
    LIMIT 1
  `);
}

async function updateSubscriberStatus(
  subscriberId: string,
  status: NewsletterSubscriberStatus,
): Promise<NewsletterSubscriber> {
  const sql = getNeonSql();
  const rows = (await sql`
    UPDATE subscribers
    SET
      status = ${status},
      consent = ${status === "subscribed"},
      subscribed_at = CASE
        WHEN ${status === "subscribed"} THEN now()
        ELSE subscribed_at
      END,
      unsubscribed_at = CASE
        WHEN ${status === "unsubscribed"} THEN now()
        ELSE NULL
      END,
      updated_at = now(),
      sync_status = 'pending',
      sync_requested_at = now(),
      last_sync_error = NULL
    WHERE id = ${subscriberId}
    RETURNING
      ${sql.unsafe(SUBSCRIBER_COLUMNS)}
  `) as SubscriberRow[];

  const row = rows[0];
  if (!row) {
    throw new Error("Subscriber update failed.");
  }

  return mapSubscriber(row);
}

export async function subscribeNewsletterEmail(
  rawEmail: string,
): Promise<NewsletterSubscriptionResult> {
  requireDatabaseConfigured();

  const email = normalizeNewsletterEmail(rawEmail);
  if (!isValidNewsletterEmail(email)) {
    throw new Error("Invalid newsletter email.");
  }

  const sql = getNeonSql();
  const rows = (await sql`
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
      ${email},
      true,
      'subscribed',
      now(),
      now(),
      'pending',
      now()
    )
    ON CONFLICT (email) DO UPDATE
    SET
      consent = true,
      status = 'subscribed',
      subscribed_at = now(),
      updated_at = now(),
      unsubscribed_at = NULL,
      sync_status = 'pending',
      sync_requested_at = now(),
      last_sync_error = NULL
    WHERE subscribers.status = 'unsubscribed'
    RETURNING
      CASE
        WHEN xmax = 0 THEN 'subscribed'
        ELSE 'resubscribed'
      END AS result
  `) as Array<{ result: NewsletterSubscriptionResult }>;

  const result = rows[0]?.result;
  const subscriber = await getSubscriberByEmail(email);
  if (!subscriber) {
    throw new Error("Subscriber could not be loaded after subscribe.");
  }

  if (!result) {
    if (
      subscriber.syncStatus !== "synced" ||
      subscriber.resendContactId === null
    ) {
      await syncSubscriberNow(subscriber);
    }
    return "already-subscribed";
  }

  await syncSubscriberNow(subscriber);

  return result;
}

async function getSubscriberFromManageToken(
  token: string,
): Promise<NewsletterSubscriber | null> {
  const payload = verifyNewsletterManageToken(token);
  if (!payload) return null;

  const subscriber = await getSubscriberById(payload.subscriberId);
  if (!subscriber) return null;
  if (subscriber.email !== normalizeNewsletterEmail(payload.email)) return null;

  return subscriber;
}

export async function getNewsletterManageView(
  token: string,
): Promise<NewsletterManageView | null> {
  requireDatabaseConfigured();

  const subscriber = await getSubscriberFromManageToken(token);
  if (!subscriber) return null;

  if (subscriber.status === "subscribed") {
    return {
      subscriber,
      action: "unsubscribe",
      title: "Newsletter preferences",
      message: `You are subscribed with ${subscriber.email}. You can unsubscribe here at any time.`,
      submitLabel: "Unsubscribe",
    };
  }

  return {
    subscriber,
    action: "resubscribe",
    title: "Newsletter preferences",
    message: `You are currently unsubscribed with ${subscriber.email}. Use this page to opt back in.`,
    submitLabel: "Resubscribe",
  };
}

export async function performNewsletterManageAction(
  token: string,
  action: NewsletterManageAction,
): Promise<NewsletterManageResult> {
  requireDatabaseConfigured();

  const subscriber = await getSubscriberFromManageToken(token);
  if (!subscriber) {
    return "invalid";
  }

  if (action === "unsubscribe") {
    await updateSubscriberStatus(subscriber.id, "unsubscribed");
    return "unsubscribed";
  }

  await updateSubscriberStatus(subscriber.id, "subscribed");
  return "resubscribed";
}

async function listSubscribersNeedingSync(
  limit: number,
): Promise<NewsletterSubscriber[]> {
  const sql = getNeonSql();
  const rows = (await sql`
    SELECT
      ${sql.unsafe(SUBSCRIBER_COLUMNS)}
    FROM subscribers
    WHERE sync_status IN ('pending', 'failed')
    ORDER BY sync_requested_at ASC, created_at ASC
    LIMIT ${limit}
  `) as SubscriberRow[];

  return rows.map(mapSubscriber);
}

async function markSubscriberSyncSuccess(
  subscriberId: string,
  resendContactId: string,
): Promise<void> {
  const sql = getNeonSql();
  await sql`
    UPDATE subscribers
    SET
      resend_contact_id = ${resendContactId},
      sync_status = 'synced',
      last_synced_at = now(),
      last_sync_error = NULL,
      sync_attempt_count = sync_attempt_count + 1,
      updated_at = now()
    WHERE id = ${subscriberId}
  `;
}

async function markSubscriberSyncFailure(
  subscriberId: string,
  message: string,
): Promise<void> {
  const sql = getNeonSql();
  await sql`
    UPDATE subscribers
    SET
      sync_status = 'failed',
      last_sync_error = ${truncateErrorMessage(message)},
      sync_attempt_count = sync_attempt_count + 1,
      updated_at = now()
    WHERE id = ${subscriberId}
  `;
}

async function insertSyncEvent(input: {
  subscriberId: string | null;
  direction: "outbound" | "webhook";
  eventType: string;
  status: SyncEventStatus;
  providerEventId?: string | null;
  errorMessage?: string | null;
  payload?: Record<string, unknown> | null;
}): Promise<string> {
  const sql = getNeonSql();
  const payloadJson = input.payload ? JSON.stringify(input.payload) : null;
  const rows = (await sql`
    INSERT INTO subscriber_sync_events (
      subscriber_id,
      provider,
      direction,
      event_type,
      status,
      provider_event_id,
      error_message,
      payload
    )
    VALUES (
      ${input.subscriberId},
      'resend',
      ${input.direction},
      ${input.eventType},
      ${input.status},
      ${input.providerEventId ?? null},
      ${input.errorMessage ?? null},
      ${payloadJson}::jsonb
    )
    RETURNING id
  `) as SyncEventInsertRow[];

  const eventId = rows[0]?.id;
  if (!eventId) {
    throw new Error(
      "INSERT RETURNING did not return an id for subscriber_sync_events.",
    );
  }

  return eventId;
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "23505"
  );
}

async function getSyncEventByProviderEventId(
  providerEventId: string,
): Promise<SyncEventStatusRow | null> {
  const sql = getNeonSql();
  const rows = (await sql`
    SELECT
      id,
      status
    FROM subscriber_sync_events
    WHERE provider_event_id = ${providerEventId}
    LIMIT 1
  `) as SyncEventStatusRow[];

  return rows[0] ?? null;
}

export async function beginResendContactWebhookEvent(input: {
  providerEventId: string;
  eventType: string;
  payload: Record<string, unknown>;
}): Promise<{
  duplicate: boolean;
  eventId: string | null;
  existingStatus: SyncEventStatus | null;
}> {
  requireDatabaseConfigured();

  try {
    const eventId = await insertSyncEvent({
      subscriberId: null,
      direction: "webhook",
      eventType: input.eventType,
      status: "received",
      providerEventId: input.providerEventId,
      payload: input.payload,
    });
    return { duplicate: false, eventId, existingStatus: null };
  } catch (error) {
    if (isUniqueViolation(error)) {
      const existingEvent = await getSyncEventByProviderEventId(
        input.providerEventId,
      );
      if (!existingEvent) {
        throw new Error("Existing subscriber sync event could not be loaded.", {
          cause: error,
        });
      }

      return {
        duplicate: true,
        eventId: existingEvent.id,
        existingStatus: existingEvent.status,
      };
    }
    throw error;
  }
}

export async function finishResendContactWebhookEvent(input: {
  eventId: string;
  subscriberId: string | null;
  status: "success" | "failed" | "ignored";
  errorMessage?: string | null;
}): Promise<void> {
  requireDatabaseConfigured();

  const sql = getNeonSql();
  await sql`
    UPDATE subscriber_sync_events
    SET
      subscriber_id = COALESCE(${input.subscriberId}, subscriber_id),
      status = ${input.status},
      error_message = ${input.errorMessage ?? null}
    WHERE id = ${input.eventId}
  `;
}

async function syncSubscriberToResend(
  subscriber: NewsletterSubscriber,
): Promise<string> {
  const contact =
    (subscriber.resendContactId
      ? await getResendContact({ id: subscriber.resendContactId })
      : null) ?? (await getResendContact({ email: subscriber.email }));

  if (!contact) {
    const created = await createResendContact({
      email: subscriber.email,
      unsubscribed: subscriber.status === "unsubscribed",
    });
    return created.id;
  }

  const updated = await updateResendContact({
    id: contact.id,
    unsubscribed: subscriber.status === "unsubscribed",
  });

  return updated.id;
}

async function syncSubscriberNow(
  subscriber: NewsletterSubscriber,
): Promise<string> {
  try {
    const resendContactId = await syncSubscriberToResend(subscriber);
    await markSubscriberSyncSuccess(subscriber.id, resendContactId);

    try {
      await insertSyncEvent({
        subscriberId: subscriber.id,
        direction: "outbound",
        eventType: "contact.sync",
        status: "success",
        payload: {
          resendContactId,
          status: subscriber.status,
        },
      });
    } catch (auditError) {
      console.error("Failed to record newsletter sync success event", {
        subscriberId: subscriber.id,
        error: errorMessage(auditError),
      });
    }

    return resendContactId;
  } catch (error) {
    const message = errorMessage(error);

    try {
      await markSubscriberSyncFailure(subscriber.id, message);
    } catch (markError) {
      console.error("Failed to persist newsletter sync failure", {
        subscriberId: subscriber.id,
        error: errorMessage(markError),
      });
    }

    try {
      await insertSyncEvent({
        subscriberId: subscriber.id,
        direction: "outbound",
        eventType: "contact.sync",
        status: "failed",
        errorMessage: message,
        payload: {
          status: subscriber.status,
        },
      });
    } catch (auditError) {
      console.error("Failed to record newsletter sync failure event", {
        subscriberId: subscriber.id,
        error: errorMessage(auditError),
      });
    }

    throw error;
  }
}

export async function syncPendingSubscribers(
  limit = defaultSyncLimit,
): Promise<NewsletterSyncSummary> {
  requireDatabaseConfigured();

  const subscribers = await listSubscribersNeedingSync(limit);
  const summary: NewsletterSyncSummary = {
    attempted: subscribers.length,
    succeeded: 0,
    failed: 0,
    failures: [],
  };

  for (const subscriber of subscribers) {
    try {
      await syncSubscriberNow(subscriber);
      summary.succeeded += 1;
    } catch (error) {
      const message = errorMessage(error);
      summary.failed += 1;
      summary.failures.push({
        email: subscriber.email,
        message,
      });
    }
  }

  return summary;
}

async function findSubscriberForResendContactWebhook(
  event: ResendContactWebhookEvent,
): Promise<NewsletterSubscriber | null> {
  if (event.data.id) {
    const byProviderId = await getSubscriberByResendContactId(event.data.id);
    if (byProviderId) return byProviderId;
  }

  if (event.data.email) {
    return getSubscriberByEmail(event.data.email);
  }

  return null;
}

export async function applyResendContactWebhookEvent(
  event: ResendContactWebhookEvent,
): Promise<{
  subscriberId: string | null;
  status: "success" | "ignored";
  message?: string;
}> {
  requireDatabaseConfigured();

  const subscriber = await findSubscriberForResendContactWebhook(event);
  if (!subscriber) {
    return {
      subscriberId: null,
      status: "ignored",
      message: "No matching subscriber found for Resend contact webhook event.",
    };
  }

  const sql = getNeonSql();

  if (event.type === "contact.deleted") {
    await sql`
      UPDATE subscribers
      SET
        resend_contact_id = NULL,
        sync_status = 'pending',
        sync_requested_at = now(),
        last_sync_error = 'Resend contact was deleted remotely; run newsletter sync to recreate it.',
        last_webhook_at = now(),
        updated_at = now()
      WHERE id = ${subscriber.id}
    `;

    return {
      subscriberId: subscriber.id,
      status: "success",
    };
  }

  const nextStatus: NewsletterSubscriberStatus =
    event.data.unsubscribed === true ? "unsubscribed" : "subscribed";

  await sql`
    UPDATE subscribers
    SET
      resend_contact_id = COALESCE(${event.data.id ?? null}, resend_contact_id),
      status = ${nextStatus},
      consent = ${nextStatus === "subscribed"},
      subscribed_at = CASE
        WHEN ${nextStatus === "subscribed"} THEN now()
        ELSE subscribed_at
      END,
      unsubscribed_at = CASE
        WHEN ${nextStatus === "unsubscribed"} THEN now()
        ELSE NULL
      END,
      sync_status = 'synced',
      last_synced_at = now(),
      last_sync_error = NULL,
      last_webhook_at = now(),
      updated_at = now()
    WHERE id = ${subscriber.id}
  `;

  return {
    subscriberId: subscriber.id,
    status: "success",
  };
}

export async function getNewsletterSyncReport(
  limit = defaultSyncLimit,
): Promise<NewsletterSyncReport> {
  requireDatabaseConfigured();

  const sql = getNeonSql();
  const countRows = (await sql`
    SELECT
      COUNT(*)::int AS total_count,
      COUNT(*) FILTER (WHERE sync_status = 'pending')::int AS pending_count,
      COUNT(*) FILTER (WHERE sync_status = 'synced')::int AS synced_count,
      COUNT(*) FILTER (WHERE sync_status = 'failed')::int AS failed_count
    FROM subscribers
  `) as SyncCountsRow[];

  const failureRows = (await sql`
    SELECT
      email,
      sync_status,
      sync_attempt_count,
      last_sync_error,
      sync_requested_at,
      last_synced_at
    FROM subscribers
    WHERE sync_status = 'failed'
    ORDER BY sync_requested_at ASC, email ASC
    LIMIT ${limit}
  `) as FailedSyncRow[];

  const counts = countRows[0] ?? {
    total_count: 0,
    pending_count: 0,
    synced_count: 0,
    failed_count: 0,
  };

  return {
    counts: {
      total: counts.total_count,
      pending: counts.pending_count,
      synced: counts.synced_count,
      failed: counts.failed_count,
    },
    failedSubscribers: failureRows.map((row) => ({
      email: row.email.toLowerCase(),
      syncStatus: row.sync_status,
      syncAttemptCount: row.sync_attempt_count,
      lastSyncError: row.last_sync_error,
      syncRequestedAt: row.sync_requested_at,
      lastSyncedAt: row.last_synced_at,
    })),
  };
}

export function buildSubscriberManageUrl(
  subscriber: Pick<NewsletterSubscriber, "id" | "email">,
): string {
  return buildNewsletterManageUrl({
    subscriberId: subscriber.id,
    email: subscriber.email,
  });
}
