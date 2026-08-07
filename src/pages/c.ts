import type { APIRoute } from "astro";

import { handleNewsletterConfirmGet } from "../lib/newsletter-confirm-http";

/**
 * Short confirmation entrypoint so the emailed URL stays smaller — Apple Mail → Safari
 * is less likely to wrap or truncate long paths than `/api/newsletter/confirm`.
 *
 * Runs confirm inline (no redirect hop) so Vercel Authentication on preview
 * cannot drop `?token=` on a second Location.
 */
export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  return handleNewsletterConfirmGet(request, "GET /c");
};
