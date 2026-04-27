import type { APIRoute } from "astro";
import { waitUntil } from "@vercel/functions";

import {
  confirmNewsletterSubscription,
  runNewsletterConfirmSideEffects,
} from "../../../lib/newsletter";
import { isDatabaseConfigured } from "../../../lib/neon";
import { redirectUncached } from "../../../lib/redirect-uncached";
import {
  captureServerException,
  captureServerOutcome,
  flushPostHogServer,
  isPostHogServerEnabled,
  posthogDistinctIdFromEmail,
  POSTHOG_SERVER_DISTINCT_ID,
} from "../../../lib/posthog-server-tracking";
import { getPostHogServer } from "../../../lib/posthog-server";
import { getRequestId, requestLogPrefix } from "../../../lib/request-id";
import { totalTiming, type Timings } from "../../../lib/timing";

const PH_ROUTE = "GET /api/newsletter/confirm";

export const prerender = false;

function resolveRequestIdForError(request: Request, prior: string): string {
  if (prior !== "") return prior;
  try {
    return getRequestId(request);
  } catch {
    return crypto.randomUUID();
  }
}

export const GET: APIRoute = async ({ request }) => {
  let requestId = "";
  try {
    requestId = getRequestId(request);

    if (!isDatabaseConfigured()) {
      captureServerOutcome({
        route: PH_ROUTE,
        outcome: "database_not_configured",
        request,
        requestId,
      });
      return redirectUncached("/newsletter/error", request, requestId);
    }

    const token = new URL(request.url).searchParams.get("token")?.trim() ?? "";
    if (!token) {
      captureServerOutcome({
        route: PH_ROUTE,
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
          `${requestLogPrefix(requestId)} [timing] GET /api/newsletter/confirm: status=${result.status} total=${handlerMs}ms steps=${dbMs}ms`,
          timings,
        );
      }

      if (result.status === "invalid") {
        captureServerOutcome({
          route: PH_ROUTE,
          outcome: "token_invalid",
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
          "/newsletter/confirm-invalid",
          request,
          requestId,
        );
      }
      if (result.status === "expired") {
        captureServerOutcome({
          route: PH_ROUTE,
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
          runNewsletterConfirmSideEffects(subscriberForBackgroundSync).catch(
            (err) => {
              console.error(
                requestLogPrefix(requestId),
                "[confirm] background Resend sync failed",
                err,
              );
            },
          ),
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
        route: PH_ROUTE,
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
      route: PH_ROUTE,
      outcome: "unhandled_exception",
      request,
      requestId: rid,
      distinctId: POSTHOG_SERVER_DISTINCT_ID,
    });
    captureServerException({
      error,
      route: PH_ROUTE,
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
};
