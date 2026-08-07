import { defineMiddleware } from "astro:middleware";

import { getRequestId, withRequestId } from "./lib/request-id";

/**
 * Adds `x-request-id` for log / support correlation (matches Vercel’s id when
 * present). Uses classic middleware (see `astro.config.ts`) so POST API routes
 * that redirect are not proxied through Edge fetch.
 *
 * Skips `request.headers` on prerendered routes so Astro does not warn that
 * `Astro.request.headers` is unavailable during static generation.
 */
export const onRequest = defineMiddleware(async (context, next) => {
  if (context.isPrerendered) {
    return next();
  }

  const requestId = getRequestId(context.request);
  const response = await next();
  return withRequestId(response, requestId);
});
