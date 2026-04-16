/**
 * Redirect with cache-busting headers so browsers and CDNs do not reuse an old
 * redirect response (important for one-shot verification links).
 */
export function redirectUncached(
  pathOrUrl: string,
  request: Request,
): Response {
  const target =
    pathOrUrl.startsWith("https://") || pathOrUrl.startsWith("http://")
      ? pathOrUrl
      : new URL(pathOrUrl, new URL(request.url)).toString();

  return new Response(null, {
    status: 302,
    headers: {
      Location: target,
      "Cache-Control": "no-store, no-cache, must-revalidate",
      Pragma: "no-cache",
    },
  });
}
