import { PostHog } from "posthog-node";

import { envPostHogHost, envPostHogProjectToken } from "./server-env";

let posthogClient: PostHog | null = null;

/**
 * Get the PostHog server-side client.
 * Uses a singleton pattern to avoid creating multiple clients.
 */
export function getPostHogServer(): PostHog {
  const apiKey = envPostHogProjectToken() ?? "";
  if (!apiKey) {
    throw new Error(
      "getPostHogServer() requires PUBLIC_POSTHOG_PROJECT_TOKEN (call only when isPostHogServerEnabled() is true).",
    );
  }
  if (!posthogClient) {
    // Project is on EU cloud — default must not be us.i.posthog.com.
    posthogClient = new PostHog(apiKey, {
      host: envPostHogHost() || "https://eu.i.posthog.com",
      flushAt: 1,
      flushInterval: 0,
    });
  }
  return posthogClient;
}

/**
 * Flush and tear down the singleton PostHog client. Used by long-running
 * scripts (newsletter sync etc.) that need to drain the in-memory queue
 * before the process exits. Astro request handlers should prefer
 * `flushPostHogServer()` from `posthog-server-tracking` together with
 * Vercel's `waitUntil` so events ship without blocking the response.
 */
export async function shutdownPostHogServer(): Promise<void> {
  if (!posthogClient) return;
  await posthogClient.shutdown();
  posthogClient = null;
}
