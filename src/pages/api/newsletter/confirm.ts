import type { APIRoute } from "astro";

import { handleNewsletterConfirmGet } from "../../../lib/newsletter-confirm-http";

export const prerender = false;

/** Long confirm URL — same handler as {@link ../c.ts `/c`}. */
export const GET: APIRoute = async ({ request }) => {
  return handleNewsletterConfirmGet(request, "GET /api/newsletter/confirm");
};
