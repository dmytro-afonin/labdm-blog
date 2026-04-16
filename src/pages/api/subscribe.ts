import type { APIRoute } from "astro";
import {
  isValidNewsletterEmail,
  normalizeNewsletterEmail,
  subscribeNewsletterEmail,
} from "../../lib/newsletter";
import { isDatabaseConfigured } from "../../lib/neon";
import {
  captureServerException,
  captureServerOutcome,
  isPostHogServerEnabled,
  posthogDistinctIdFromEmail,
} from "../../lib/posthog-server-tracking";
import { getPostHogServer } from "../../lib/posthog-server";

const PH_ROUTE = "POST /api/subscribe";

export const prerender = false;

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
    return redirect("/newsletter/invalid");
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
    return redirect("/newsletter/invalid");
  }

  const honeypot = formData.get("company");
  if (typeof honeypot === "string" && honeypot.trim() !== "") {
    await captureServerOutcome({
      route: PH_ROUTE,
      outcome: "honeypot_triggered",
      request,
    });
    return redirect("/newsletter/check-inbox");
  }
  const raw = formData.get("email");
  const email = typeof raw === "string" ? normalizeNewsletterEmail(raw) : "";
  if (!email || !isValidNewsletterEmail(email)) {
    await captureServerOutcome({
      route: PH_ROUTE,
      outcome: "invalid_email",
      request,
    });
    return redirect("/newsletter/invalid");
  }

  try {
    const result = await subscribeNewsletterEmail(email);
    const sessionId = request.headers.get("X-PostHog-Session-Id") ?? undefined;
    const distinctId = posthogDistinctIdFromEmail(email);

    if (isPostHogServerEnabled()) {
      try {
        const posthog = getPostHogServer();
        if (result === "check-inbox") {
          await posthog.captureImmediate({
            distinctId,
            event: "newsletter_subscribed",
            properties: { $session_id: sessionId },
          });
        } else if (result === "already-subscribed") {
          await posthog.captureImmediate({
            distinctId,
            event: "newsletter_subscribe_already_subscribed",
            properties: { $session_id: sessionId },
          });
        } else if (result === "resubscribed") {
          await posthog.captureImmediate({
            distinctId,
            event: "newsletter_resubscribed",
            properties: { $session_id: sessionId },
          });
        } else {
          await posthog.captureImmediate({
            distinctId,
            event: "newsletter_subscribed",
            properties: { $session_id: sessionId },
          });
        }
      } catch (phErr) {
        console.warn("[posthog] newsletter_subscribed capture failed", phErr);
      }
    }

    if (result === "check-inbox") {
      return redirect("/newsletter/check-inbox");
    }
    if (result === "already-subscribed") {
      return redirect("/newsletter/already");
    }
    if (result === "resubscribed") {
      return redirect("/newsletter/resubscribed");
    }
    return redirect("/newsletter/check-inbox");
  } catch (error) {
    console.error("error", error);
    await captureServerException({
      error,
      route: PH_ROUTE,
      branch: "subscribeNewsletterEmail",
      request,
      distinctId: posthogDistinctIdFromEmail(email),
    });
    return redirect("/newsletter/error");
  }
};
