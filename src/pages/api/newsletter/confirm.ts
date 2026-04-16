import type { APIRoute } from "astro";

import { confirmNewsletterSubscription } from "../../../lib/newsletter";
import { isDatabaseConfigured } from "../../../lib/neon";
import { redirectUncached } from "../../../lib/redirect-uncached";
import {
  captureServerException,
  captureServerOutcome,
  isPostHogServerEnabled,
} from "../../../lib/posthog-server-tracking";
import { getPostHogServer } from "../../../lib/posthog-server";

const PH_ROUTE = "GET /api/newsletter/confirm";

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  if (!isDatabaseConfigured()) {
    await captureServerOutcome({
      route: PH_ROUTE,
      outcome: "database_not_configured",
      request,
    });
    return redirectUncached("/newsletter/error", request);
  }

  const token = new URL(request.url).searchParams.get("token")?.trim() ?? "";
  if (!token) {
    await captureServerOutcome({
      route: PH_ROUTE,
      outcome: "missing_token",
      request,
    });
    return redirectUncached("/newsletter/confirm-invalid", request);
  }

  try {
    const result = await confirmNewsletterSubscription(token);
    if (result === "invalid") {
      await captureServerOutcome({
        route: PH_ROUTE,
        outcome: "token_invalid",
        request,
        distinctId: token,
      });
      return redirectUncached("/newsletter/confirm-invalid", request);
    }
    if (result === "expired") {
      await captureServerOutcome({
        route: PH_ROUTE,
        outcome: "token_expired",
        request,
        distinctId: token,
      });
      return redirectUncached("/newsletter/confirm-expired", request);
    }
    if (isPostHogServerEnabled()) {
      try {
        await getPostHogServer().captureImmediate({
          distinctId: token,
          event: "newsletter_confirmed",
        });
      } catch (phErr) {
        console.warn("[posthog] newsletter_confirmed capture failed", phErr);
      }
    }
    return redirectUncached("/newsletter/confirmed", request);
  } catch (error) {
    await captureServerException({
      error,
      route: PH_ROUTE,
      branch: "confirmNewsletterSubscription",
      request,
      distinctId: token,
    });
    return redirectUncached("/newsletter/error", request);
  }
};
