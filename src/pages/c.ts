import type { APIRoute } from "astro";

import { captureServerOutcome } from "../lib/posthog-server-tracking";
import { redirectUncached } from "../lib/redirect-uncached";

/**
 * Short confirmation entrypoint so the emailed URL stays smaller — Apple Mail → Safari
 * is less likely to wrap or truncate long paths than `/api/newsletter/confirm`.
 */
export const prerender = false;

const PH_ROUTE = "GET /c";

export const GET: APIRoute = async ({ request }) => {
  const token = new URL(request.url).searchParams.get("token")?.trim() ?? "";
  if (!token) {
    await captureServerOutcome({
      route: PH_ROUTE,
      outcome: "missing_token",
      request,
    });
    return redirectUncached("/newsletter/confirm-invalid", request);
  }
  return redirectUncached(
    `/api/newsletter/confirm?token=${encodeURIComponent(token)}`,
    request,
  );
};
