import { PostHog } from "posthog-node";

let posthogClient: PostHog | null = null;

/**
 * Get the PostHog server-side client.
 * Uses a singleton pattern to avoid creating multiple clients.
 */
export function getPostHogServer(): PostHog {
  const apiKey = import.meta.env.PUBLIC_POSTHOG_PROJECT_TOKEN?.trim() ?? "";
  if (!apiKey) {
    throw new Error(
      "getPostHogServer() requires PUBLIC_POSTHOG_PROJECT_TOKEN (call only when isPostHogServerEnabled() is true).",
    );
  }
  if (!posthogClient) {
    posthogClient = new PostHog(apiKey, {
      host: import.meta.env.PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
      flushAt: 1,
      flushInterval: 0,
    });
  }
  return posthogClient;
}
