import { createHash } from "node:crypto";

import { getPostHogServer } from "./posthog-server";

/** Used when no user email / token is available for identification. */
export const POSTHOG_SERVER_DISTINCT_ID = "$server";

/**
 * Stable non-raw-email distinct id for PostHog (SHA-256 prefix of normalized address).
 */
export function posthogDistinctIdFromEmail(email: string): string {
  const normalized = email.trim().toLowerCase();
  const hash = createHash("sha256")
    .update(normalized, "utf8")
    .digest("hex")
    .slice(0, 32);
  return `email_${hash}`;
}

export function isPostHogServerEnabled(): boolean {
  return Boolean(import.meta.env.PUBLIC_POSTHOG_PROJECT_TOKEN?.trim());
}

/**
 * Structured branch / funnel step for dashboards (filter by `route` + `outcome`).
 * Prefer this for expected paths (validation failures, empty token, etc.).
 *
 * Synchronous: queues the event in the in-memory PostHog client. Pair with
 * `flushPostHogServer()` (via `waitUntil`) at the end of the request handler
 * so the queued events ship without blocking the user-facing response.
 */
export function captureServerOutcome(input: {
  route: string;
  outcome: string;
  request?: Request;
  requestId?: string;
  distinctId?: string;
  properties?: Record<string, unknown>;
}): void {
  if (!isPostHogServerEnabled()) return;
  try {
    getPostHogServer().capture({
      distinctId: input.distinctId ?? POSTHOG_SERVER_DISTINCT_ID,
      event: "server_api_outcome",
      properties: {
        ...input.properties,
        route: input.route,
        outcome: input.outcome,
        ...(input.requestId ? { request_id: input.requestId } : {}),
      },
    });
  } catch (err) {
    console.warn("[posthog] server_api_outcome failed", err);
  }
}

/**
 * Sends an error to PostHog Error tracking (`$exception`). Use in `catch` blocks.
 *
 * Synchronous: queues the event in the in-memory PostHog client. Pair with
 * `flushPostHogServer()` (via `waitUntil`) at the end of the request handler.
 */
export function captureServerException(input: {
  error: unknown;
  route: string;
  branch: string;
  request?: Request;
  requestId?: string;
  distinctId?: string;
  extra?: Record<string, unknown>;
}): void {
  if (!isPostHogServerEnabled()) return;
  try {
    getPostHogServer().captureException(
      input.error,
      input.distinctId ?? POSTHOG_SERVER_DISTINCT_ID,
      {
        ...input.extra,
        route: input.route,
        branch: input.branch,
        ...(input.requestId ? { request_id: input.requestId } : {}),
      },
    );
  } catch (err) {
    console.warn("[posthog] captureServerException failed", err);
  }
}

/**
 * Flush queued PostHog events. Returns a promise that resolves once the
 * background HTTP request finishes; intended to be passed to Vercel's
 * `waitUntil` so the response is not blocked while events are shipped.
 *
 * Errors are swallowed (logged) — telemetry must never fail a request.
 */
export function flushPostHogServer(): Promise<void> {
  if (!isPostHogServerEnabled()) return Promise.resolve();
  return getPostHogServer()
    .flush()
    .catch((err) => {
      console.warn("[posthog] flush failed", err);
    });
}
