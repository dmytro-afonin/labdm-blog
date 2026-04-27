import { REQUEST_ID_HEADER } from "./request-id";

/**
 * Redirect with cache-busting headers so browsers and CDNs do not reuse an old
 * redirect response (important for one-shot verification links).
 */
export function redirectUncached(
  pathOrUrl: string,
  request: Request,
  requestId?: string,
): Response {
  const baseUrl = request.url;

  let target: string;
  if (pathOrUrl.startsWith("https://") || pathOrUrl.startsWith("http://")) {
    target = pathOrUrl;
  } else if (pathOrUrl.startsWith("//") || pathOrUrl.startsWith("\\")) {
    const origin = new URL(baseUrl).origin;
    const asPath = `/${pathOrUrl.replace(/^[\\/]+/, "")}`;
    target = new URL(asPath, `${origin}/`).toString();
  } else {
    target = new URL(pathOrUrl, baseUrl).toString();
  }

  const headers: Record<string, string> = {
    Location: target,
    "Cache-Control": "no-store, no-cache, must-revalidate",
    Pragma: "no-cache",
  };
  if (requestId) headers[REQUEST_ID_HEADER] = requestId;

  return new Response(null, {
    status: 302,
    headers,
  });
}
