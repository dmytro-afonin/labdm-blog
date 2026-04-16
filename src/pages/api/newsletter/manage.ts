import type { APIRoute } from "astro";

import {
  performNewsletterManageAction,
  type NewsletterManageAction,
} from "../../../lib/newsletter";
import { isDatabaseConfigured } from "../../../lib/neon";
import {
  captureServerException,
  captureServerOutcome,
  isPostHogServerEnabled,
  posthogDistinctIdFromEmail,
  POSTHOG_SERVER_DISTINCT_ID,
} from "../../../lib/posthog-server-tracking";
import { getPostHogServer } from "../../../lib/posthog-server";

const PH_ROUTE = "POST /api/newsletter/manage";

export const prerender = false;

function isManageAction(value: string): value is NewsletterManageAction {
  return value === "unsubscribe" || value === "resubscribe";
}

export const POST: APIRoute = async ({ request, redirect }) => {
  if (!isDatabaseConfigured()) {
    await captureServerOutcome({
      route: PH_ROUTE,
      outcome: "database_not_configured",
      request,
    });
    return redirect("/newsletter/error");
  }

  const contentType = request.headers.get("content-type") ?? "";
  if (
    !contentType.includes("application/x-www-form-urlencoded") &&
    !contentType.includes("multipart/form-data")
  ) {
    await captureServerOutcome({
      route: PH_ROUTE,
      outcome: "invalid_content_type",
      request,
    });
    return redirect("/newsletter/manage-invalid");
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch (error) {
    await captureServerException({
      error,
      route: PH_ROUTE,
      branch: "formdata_parse_failed",
      request,
    });
    return redirect("/newsletter/manage-invalid");
  }

  const token = formData.get("token");
  const action = formData.get("action");
  if (
    typeof token !== "string" ||
    typeof action !== "string" ||
    !isManageAction(action)
  ) {
    await captureServerOutcome({
      route: PH_ROUTE,
      outcome: "invalid_form_fields",
      request,
      properties: {
        has_token: typeof token === "string",
        action_ok: typeof action === "string" && isManageAction(action),
      },
    });
    return redirect("/newsletter/manage-invalid");
  }

  try {
    const outcome = await performNewsletterManageAction(token, action);
    if (outcome.status === "invalid") {
      await captureServerOutcome({
        route: PH_ROUTE,
        outcome: "manage_token_invalid",
        request,
      });
      return redirect("/newsletter/manage-invalid");
    }

    if (isPostHogServerEnabled()) {
      try {
        const posthog = getPostHogServer();
        const distinctId = posthogDistinctIdFromEmail(outcome.email);
        if (outcome.status === "unsubscribed") {
          await posthog.captureImmediate({
            distinctId,
            event: "newsletter_unsubscribed",
          });
        } else {
          await posthog.captureImmediate({
            distinctId,
            event: "newsletter_resubscribed_via_manage",
          });
        }
      } catch (phErr) {
        console.warn("[posthog] newsletter manage capture failed", phErr);
      }
    }

    if (outcome.status === "unsubscribed") {
      return redirect("/newsletter/unsubscribed");
    }
    return redirect("/newsletter/resubscribed");
  } catch (error) {
    await captureServerException({
      error,
      route: PH_ROUTE,
      branch: "performNewsletterManageAction",
      request,
      distinctId: POSTHOG_SERVER_DISTINCT_ID,
    });
    return redirect("/newsletter/error");
  }
};
