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
  // Recover confirmation links where `?` was encoded into the path
  // (`/c%3Ftoken=…` → `/c?token=…`). Must run before the prerendered early
  // return — a bad path would otherwise hit static 404 and skip recovery.
  const malformedConfirm = /^\/c%3Ftoken=(.+)$/i.exec(context.url.pathname);
  if (malformedConfirm?.[1]) {
    let token = malformedConfirm[1];
    try {
      token = decodeURIComponent(token);
    } catch {
      // keep raw token
    }
    const fixed = new URL("/c", context.url.origin);
    fixed.searchParams.set("token", token);
    return context.redirect(fixed.pathname + fixed.search, 302);
  }

  if (context.isPrerendered) {
    return next();
  }

  const requestId = getRequestId(context.request);
  const response = await next();
  return withRequestId(response, requestId);
});
