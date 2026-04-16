/**
 * Redirect with cache-busting headers so browsers and CDNs do not reuse an old
 * redirect response (important for one-shot verification links).
 */
export function redirectUncached(
  pathOrUrl: string,
  request: Request,
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

  return new Response(null, {
    status: 302,
    headers: {
      Location: target,
      "Cache-Control": "no-store, no-cache, must-revalidate",
      Pragma: "no-cache",
    },
  });
}
