import type { APIRoute } from "astro";
import { waitUntil } from "@vercel/functions";

import {
  isValidNewsletterEmail,
  normalizeNewsletterEmail,
  runNewsletterSubscribeSideEffects,
  subscribeNewsletterEmail,
  type NewsletterSubscriptionResult,
} from "../../lib/newsletter";
import { isDatabaseConfigured } from "../../lib/neon";
import {
  captureServerException,
  captureServerOutcome,
  flushPostHogServer,
  isPostHogServerEnabled,
  posthogDistinctIdFromEmail,
} from "../../lib/posthog-server-tracking";
import { getPostHogServer } from "../../lib/posthog-server";
import {
  getRequestId,
  requestLogPrefix,
  withRequestId,
} from "../../lib/request-id";
import { totalTiming, type Timings } from "../../lib/timing";

const PH_ROUTE = "POST /api/subscribe";

const SUBSCRIBE_RESULT_EVENTS = {
  "check-inbox": "newsletter_subscribed",
  "already-subscribed": "newsletter_subscribe_already_subscribed",
  resubscribed: "newsletter_resubscribed",
} as const satisfies Record<NewsletterSubscriptionResult, string>;

export const prerender = false;

export const POST: APIRoute = async ({ request, redirect }) => {
  const requestId = getRequestId(request);
  try {
    if (!isDatabaseConfigured()) {
      captureServerOutcome({
        route: PH_ROUTE,
        outcome: "database_not_configured",
        request,
        requestId,
      });
      return withRequestId(redirect("/newsletter/error"), requestId);
    }

    const contentType = request.headers.get("content-type") ?? "";
    if (
      !contentType.includes("application/x-www-form-urlencoded") &&
      !contentType.includes("multipart/form-data")
    ) {
      captureServerOutcome({
        route: PH_ROUTE,
        outcome: "invalid_content_type",
        request,
        requestId,
      });
      return withRequestId(redirect("/newsletter/invalid"), requestId);
    }

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch (error) {
      captureServerException({
        error,
        route: PH_ROUTE,
        branch: "formdata_parse_failed",
        request,
        requestId,
      });
      return withRequestId(redirect("/newsletter/invalid"), requestId);
    }

    const honeypot = formData.get("company");
    if (typeof honeypot === "string" && honeypot.trim() !== "") {
      captureServerOutcome({
        route: PH_ROUTE,
        outcome: "honeypot_triggered",
        request,
        requestId,
      });
      return withRequestId(redirect("/newsletter/check-inbox"), requestId);
    }
    const raw = formData.get("email");
    const email = typeof raw === "string" ? normalizeNewsletterEmail(raw) : "";
    if (!email || !isValidNewsletterEmail(email)) {
      captureServerOutcome({
        route: PH_ROUTE,
        outcome: "invalid_email",
        request,
        requestId,
      });
      return withRequestId(redirect("/newsletter/invalid"), requestId);
    }

    const timings: Timings = {};
    const handlerStart = performance.now();
    try {
      const { result, subscriber } = await subscribeNewsletterEmail(
        email,
        timings,
      );
      const handlerMs = Math.round(performance.now() - handlerStart);
      const dbMs = totalTiming(timings);

      waitUntil(
        runNewsletterSubscribeSideEffects(result, subscriber).catch((err) => {
          console.error(
            requestLogPrefix(requestId),
            "[subscribe] background side effects failed",
            err,
          );
        }),
      );
      if (import.meta.env.DEV) {
        console.log(
          `${requestLogPrefix(requestId)} [timing] POST /api/subscribe: result=${result} total=${handlerMs}ms steps=${dbMs}ms`,
          timings,
        );
      }

      if (isPostHogServerEnabled()) {
        try {
          getPostHogServer().capture({
            distinctId: posthogDistinctIdFromEmail(email),
            event: SUBSCRIBE_RESULT_EVENTS[result],
            properties: {
              request_id: requestId,
              subscribe_total_ms: handlerMs,
              subscribe_steps_ms_total: dbMs,
              subscribe_timings_ms: timings,
            },
          });
        } catch (phErr) {
          console.warn(
            `${requestLogPrefix(requestId)} [posthog] newsletter_subscribed capture failed`,
            phErr,
          );
        }
      }

      if (result === "check-inbox") {
        return withRequestId(redirect("/newsletter/check-inbox"), requestId);
      }
      if (result === "already-subscribed") {
        return withRequestId(redirect("/newsletter/already"), requestId);
      }
      if (result === "resubscribed") {
        return withRequestId(redirect("/newsletter/resubscribed"), requestId);
      }
      return withRequestId(redirect("/newsletter/check-inbox"), requestId);
    } catch (error) {
      console.error(requestLogPrefix(requestId), "error", error);
      captureServerException({
        error,
        route: PH_ROUTE,
        branch: "subscribeNewsletterEmail",
        request,
        requestId,
        distinctId: posthogDistinctIdFromEmail(email),
      });
      return withRequestId(redirect("/newsletter/error"), requestId);
    }
  } finally {
    waitUntil(
      flushPostHogServer().catch((err) => {
        console.warn("[posthog] flush failed", err);
      }),
    );
  }
};
