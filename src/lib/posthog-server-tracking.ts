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

function sessionProps(request?: Request): { $session_id?: string } {
  const id = request?.headers.get("X-PostHog-Session-Id");
  return id ? { $session_id: id } : {};
}

/**
 * Structured branch / funnel step for dashboards (filter by `route` + `outcome`).
 * Prefer this for expected paths (validation failures, empty token, etc.).
 */
export async function captureServerOutcome(input: {
  route: string;
  outcome: string;
  request?: Request;
  distinctId?: string;
  properties?: Record<string, unknown>;
}): Promise<void> {
  if (!isPostHogServerEnabled()) return;
  try {
    await getPostHogServer().captureImmediate({
      distinctId: input.distinctId ?? POSTHOG_SERVER_DISTINCT_ID,
      event: "server_api_outcome",
      properties: {
        ...input.properties,
        route: input.route,
        outcome: input.outcome,
        ...sessionProps(input.request),
      },
    });
  } catch (err) {
    console.warn("[posthog] server_api_outcome failed", err);
  }
}

/**
 * Sends an error to PostHog Error tracking (`$exception`). Use in `catch` blocks.
 */
export async function captureServerException(input: {
  error: unknown;
  route: string;
  branch: string;
  request?: Request;
  distinctId?: string;
  extra?: Record<string, unknown>;
}): Promise<void> {
  if (!isPostHogServerEnabled()) return;
  try {
    await getPostHogServer().captureExceptionImmediate(
      input.error,
      input.distinctId ?? POSTHOG_SERVER_DISTINCT_ID,
      {
        ...input.extra,
        route: input.route,
        branch: input.branch,
        ...sessionProps(input.request),
      },
    );
  } catch (err) {
    console.warn("[posthog] captureServerException failed", err);
  }
}
