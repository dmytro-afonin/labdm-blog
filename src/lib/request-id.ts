/** Response + log correlation id (Vercel request id when present). */
export const REQUEST_ID_HEADER = "x-request-id";

/**
 * Stable id for this HTTP request: Vercel’s `x-vercel-id` when deployed, else
 * an incoming `x-request-id` if a caller already set one, else a fresh UUID
 * (local dev, or rare cases without Vercel headers).
 *
 * Use the same value on logs, PostHog properties (`request_id`), and the
 * `x-request-id` response header so Vercel logs ↔ PostHog ↔ support tickets line up.
 */
export function getRequestId(request: Request): string {
  const vercel = request.headers.get("x-vercel-id")?.trim();
  if (vercel) return vercel;
  const incoming = request.headers.get(REQUEST_ID_HEADER)?.trim();
  if (incoming) return incoming;
  return crypto.randomUUID();
}

/** Prefix for structured server logs, e.g. `[req=abc123] subscribe ok`. */
export function requestLogPrefix(requestId: string): string {
  return `[req=${requestId}]`;
}

/**
 * Return a new Response with `x-request-id` set. Does not mutate the original
 * (Response headers are immutable).
 */
export function withRequestId(response: Response, requestId: string): Response {
  if (response.headers.get(REQUEST_ID_HEADER)) return response;
  const headers = new Headers(response.headers);
  headers.set(REQUEST_ID_HEADER, requestId);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
