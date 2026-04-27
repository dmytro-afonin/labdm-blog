import type { APIRoute } from "astro";
import { waitUntil } from "@vercel/functions";

import {
  performNewsletterManageAction,
  type NewsletterManageAction,
} from "../../../lib/newsletter";
import { isDatabaseConfigured } from "../../../lib/neon";
import {
  captureServerException,
  captureServerOutcome,
  flushPostHogServer,
  isPostHogServerEnabled,
  posthogDistinctIdFromEmail,
  POSTHOG_SERVER_DISTINCT_ID,
} from "../../../lib/posthog-server-tracking";
import { getPostHogServer } from "../../../lib/posthog-server";
import { getRequestId, withRequestId } from "../../../lib/request-id";

const PH_ROUTE = "POST /api/newsletter/manage";

export const prerender = false;

function isManageAction(value: string): value is NewsletterManageAction {
  return value === "unsubscribe" || value === "resubscribe";
}

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
      return withRequestId(redirect("/newsletter/manage-invalid"), requestId);
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
      return withRequestId(redirect("/newsletter/manage-invalid"), requestId);
    }

    const token = formData.get("token");
    const action = formData.get("action");
    if (
      typeof token !== "string" ||
      typeof action !== "string" ||
      !isManageAction(action)
    ) {
      captureServerOutcome({
        route: PH_ROUTE,
        outcome: "invalid_form_fields",
        request,
        requestId,
        properties: {
          has_token: typeof token === "string",
          action_ok: typeof action === "string" && isManageAction(action),
        },
      });
      return withRequestId(redirect("/newsletter/manage-invalid"), requestId);
    }

    try {
      const outcome = await performNewsletterManageAction(token, action);
      if (outcome.status === "invalid") {
        captureServerOutcome({
          route: PH_ROUTE,
          outcome: "manage_token_invalid",
          request,
          requestId,
        });
        return withRequestId(redirect("/newsletter/manage-invalid"), requestId);
      }

      if (isPostHogServerEnabled()) {
        try {
          const posthog = getPostHogServer();
          const distinctId = posthogDistinctIdFromEmail(outcome.email);
          if (outcome.status === "unsubscribed") {
            posthog.capture({
              distinctId,
              event: "newsletter_unsubscribed",
              properties: { request_id: requestId },
            });
          } else {
            posthog.capture({
              distinctId,
              event: "newsletter_resubscribed_via_manage",
              properties: { request_id: requestId },
            });
          }
        } catch (phErr) {
          console.warn("[posthog] newsletter manage capture failed", phErr);
        }
      }

      if (outcome.status === "unsubscribed") {
        return withRequestId(redirect("/newsletter/unsubscribed"), requestId);
      }
      return withRequestId(redirect("/newsletter/resubscribed"), requestId);
    } catch (error) {
      captureServerException({
        error,
        route: PH_ROUTE,
        branch: "performNewsletterManageAction",
        request,
        requestId,
        distinctId: POSTHOG_SERVER_DISTINCT_ID,
      });
      return withRequestId(redirect("/newsletter/error"), requestId);
    }
  } finally {
    waitUntil(flushPostHogServer());
  }
};
