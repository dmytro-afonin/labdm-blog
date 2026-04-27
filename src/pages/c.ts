import type { APIRoute } from "astro";
import { waitUntil } from "@vercel/functions";

import {
  captureServerOutcome,
  flushPostHogServer,
} from "../lib/posthog-server-tracking";
import { getRequestId } from "../lib/request-id";
import { redirectUncached } from "../lib/redirect-uncached";

/**
 * Short confirmation entrypoint so the emailed URL stays smaller — Apple Mail → Safari
 * is less likely to wrap or truncate long paths than `/api/newsletter/confirm`.
 */
export const prerender = false;

const PH_ROUTE = "GET /c";

export const GET: APIRoute = async ({ request }) => {
  const requestId = getRequestId(request);
  try {
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
    return redirectUncached(
      `/api/newsletter/confirm?token=${encodeURIComponent(token)}`,
      request,
      requestId,
    );
  } finally {
    waitUntil(flushPostHogServer());
  }
};
