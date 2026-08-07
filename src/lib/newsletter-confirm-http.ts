import { waitUntil } from "@vercel/functions";

import {
  confirmNewsletterSubscription,
  runNewsletterConfirmSideEffects,
} from "./newsletter";
import { isDatabaseConfigured } from "./neon";
import { redirectUncached } from "./redirect-uncached";
import {
  captureServerException,
  captureServerOutcome,
  flushPostHogServer,
  isPostHogServerEnabled,
  posthogDistinctIdFromEmail,
  POSTHOG_SERVER_DISTINCT_ID,
} from "./posthog-server-tracking";
import { getPostHogServer } from "./posthog-server";
import { getRequestId, requestLogPrefix } from "./request-id";
import { totalTiming, type Timings } from "./timing";

/**
 * Pull a confirm token from the request. Handles whitespace (email wrapping)
 * and `/c%3Ftoken=…` path mangling if middleware did not rewrite first.
 */
export function extractNewsletterConfirmToken(request: Request): string {
  const url = new URL(request.url);
  const token = url.searchParams.get("token")?.trim() ?? "";
  if (token) {
    return token.replace(/\s+/g, "");
  }

  const fromPath =
    /^\/c%3Ftoken=(.+)$/i.exec(url.pathname) ??
    /^\/c\?token=(.+)$/i.exec(url.pathname);
  if (!fromPath?.[1]) {
    return "";
  }

  let raw = fromPath[1];
  try {
    raw = decodeURIComponent(raw);
  } catch {
    // keep raw
  }
  return raw.trim().replace(/\s+/g, "");
}

function resolveRequestIdForError(request: Request, prior: string): string {
  if (prior !== "") return prior;
  try {
    return getRequestId(request);
  } catch {
    return crypto.randomUUID();
  }
}

/**
 * Shared GET handler for `/c` and `/api/newsletter/confirm`.
 * `/c` runs this directly (no intermediate redirect) so Vercel SSO / email
 * clients cannot drop the token on a second hop.
 */
export async function handleNewsletterConfirmGet(
  request: Request,
  route: string,
): Promise<Response> {
  let requestId = "";
  try {
    requestId = getRequestId(request);

    if (!isDatabaseConfigured()) {
      captureServerOutcome({
        route,
        outcome: "database_not_configured",
        request,
        requestId,
      });
      return redirectUncached("/newsletter/error", request, requestId);
    }

    const token = extractNewsletterConfirmToken(request);
    if (!token) {
      captureServerOutcome({
        route,
        outcome: "missing_token",
        request,
        requestId,
      });
      return redirectUncached(
        "/newsletter/confirm-invalid",
        request,
        requestId,
      );
    }

    const timings: Timings = {};
    const handlerStart = performance.now();
    try {
      const { result, subscriberForBackgroundSync } =
        await confirmNewsletterSubscription(token, timings);
      const handlerMs = Math.round(performance.now() - handlerStart);
      const dbMs = totalTiming(timings);

      if (import.meta.env.DEV) {
        console.log(
          `${requestLogPrefix(requestId)} [timing] ${route}: status=${result.status} total=${handlerMs}ms steps=${dbMs}ms`,
          timings,
        );
      }

      if (result.status === "invalid") {
        captureServerOutcome({
          route,
          outcome: "token_invalid",
          request,
          requestId,
          distinctId: POSTHOG_SERVER_DISTINCT_ID,
          properties: {
            confirm_total_ms: handlerMs,
            confirm_steps_ms_total: dbMs,
            confirm_timings_ms: timings,
            token_length: token.length,
            token_has_dot: token.includes("."),
          },
        });
        return redirectUncached(
          "/newsletter/confirm-invalid",
          request,
          requestId,
        );
      }
      if (result.status === "expired") {
        captureServerOutcome({
          route,
          outcome: "token_expired",
          request,
          requestId,
          distinctId: POSTHOG_SERVER_DISTINCT_ID,
          properties: {
            confirm_total_ms: handlerMs,
            confirm_steps_ms_total: dbMs,
            confirm_timings_ms: timings,
          },
        });
        return redirectUncached(
          "/newsletter/confirm-expired",
          request,
          requestId,
        );
      }

      if (subscriberForBackgroundSync) {
        waitUntil(
          runNewsletterConfirmSideEffects(subscriberForBackgroundSync)
            .catch((err) => {
              console.error(
                requestLogPrefix(requestId),
                "[confirm] background Resend sync failed",
                err,
              );
              captureServerException({
                error: err,
                route,
                branch: "runNewsletterConfirmSideEffects",
                request,
                requestId,
                distinctId: posthogDistinctIdFromEmail(
                  subscriberForBackgroundSync.email,
                ),
              });
            })
            .then(() => flushPostHogServer()),
        );
      }

      if (isPostHogServerEnabled()) {
        try {
          getPostHogServer().capture({
            distinctId: posthogDistinctIdFromEmail(result.email),
            event: "newsletter_confirmed",
            properties: {
              request_id: requestId,
              confirm_total_ms: handlerMs,
              confirm_steps_ms_total: dbMs,
              confirm_timings_ms: timings,
            },
          });
        } catch (phErr) {
          console.warn("[posthog] newsletter_confirmed capture failed", phErr);
        }
      }
      return redirectUncached("/newsletter/confirmed", request, requestId);
    } catch (error) {
      console.error(requestLogPrefix(requestId), "error", error);
      captureServerException({
        error,
        route,
        branch: "confirmNewsletterSubscription",
        request,
        requestId,
        distinctId: POSTHOG_SERVER_DISTINCT_ID,
      });
      return redirectUncached("/newsletter/error", request, requestId);
    }
  } catch (error) {
    const rid = resolveRequestIdForError(request, requestId);
    console.error(requestLogPrefix(rid), "unhandled error", error);
    captureServerOutcome({
      route,
      outcome: "unhandled_exception",
      request,
      requestId: rid,
      distinctId: POSTHOG_SERVER_DISTINCT_ID,
    });
    captureServerException({
      error,
      route,
      branch: "GET_handler",
      request,
      requestId: rid,
      distinctId: POSTHOG_SERVER_DISTINCT_ID,
    });
    return redirectUncached("/newsletter/error", request, rid);
  } finally {
    waitUntil(
      flushPostHogServer().catch((err) => {
        console.warn("[posthog] flush failed", err);
      }),
    );
  }
}
