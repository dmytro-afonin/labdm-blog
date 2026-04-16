<wizard-report>
# PostHog post-wizard report

The wizard has completed a deep integration of PostHog into the labdm blog — an Astro 6 hybrid-rendered blog with a double opt-in newsletter system backed by Neon (Postgres) and Resend.

**Client-side:** A `posthog.astro` snippet component is imported in `BaseLayout.astro` and rendered in every page's `<head>`. It initialises PostHog via the standard web snippet, reading the project token and host from Astro public environment variables.

**Server-side:** A `posthog-server.ts` singleton wraps `posthog-node`. API routes use `captureImmediate` / `captureExceptionImmediate` so events flush before Vercel serverless exits. **`src/lib/posthog-server-tracking.ts`** centralizes:

- **`server_api_outcome`** — one event for funnel/validation branches; filter by properties `route` and `outcome` (e.g. `invalid_email`, `token_expired`, `database_not_configured`).
- **`$exception`** (via `captureExceptionImmediate`) — real failures in `catch` blocks, with properties `route` and `branch` for the code path.

Success events (`newsletter_subscribed`, `newsletter_confirmed`, etc.) still use the subscriber email or token as `distinctId` where applicable.

**Client events:** The subscribe form fires `newsletter_subscribe_form_submitted` on submit, and each blog post page fires `post_viewed` (with `post_slug` and `post_title` properties) on load.

| Event                                     | Description                                                           | File                                              |
| ----------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------- |
| `newsletter_subscribe_form_submitted`     | User submits the newsletter subscribe form                            | `src/components/SubscribeForm.astro`              |
| `newsletter_subscribed`                   | New subscription initiated (verification email sent)                  | `src/pages/api/subscribe.ts`                      |
| `newsletter_subscribe_already_subscribed` | Subscribe attempt for an already-subscribed email                     | `src/pages/api/subscribe.ts`                      |
| `newsletter_resubscribed`                 | Previously unsubscribed user resubscribed via form                    | `src/pages/api/subscribe.ts`                      |
| `newsletter_confirmed`                    | Email confirmed via verification link                                 | `src/pages/api/newsletter/confirm.ts`             |
| `newsletter_unsubscribed`                 | User unsubscribed via manage page                                     | `src/pages/api/newsletter/manage.ts`              |
| `newsletter_resubscribed_via_manage`      | User resubscribed via manage page                                     | `src/pages/api/newsletter/manage.ts`              |
| `post_viewed`                             | Blog post viewed (properties: `post_slug`, `post_title`)              | `src/pages/posts/[slug].astro`                    |
| `server_api_outcome`                      | Branch / validation step (`route`, `outcome`, optional `$session_id`) | `src/lib/posthog-server-tracking.ts` + API routes |
| `$exception`                              | Error tracking from `catch` (`route`, `branch`)                       | Same                                              |

**`server_api_outcome` — examples by `route`:**

| `route`                              | Example `outcome`                                                                                |
| ------------------------------------ | ------------------------------------------------------------------------------------------------ |
| `POST /api/subscribe`                | `database_not_configured`, `invalid_content_type`, `honeypot_triggered`, `invalid_email`         |
| `GET /api/newsletter/confirm`        | `database_not_configured`, `missing_token`, `token_invalid`, `token_expired`                     |
| `GET /c`                             | `missing_token`                                                                                  |
| `POST /api/newsletter/manage`        | `database_not_configured`, `invalid_content_type`, `invalid_form_fields`, `manage_token_invalid` |
| `POST /api/webhooks/resend/contacts` | `missing_svix_id`, `duplicate_ignored`, `reservation_failed`, `webhook_verification_failed`      |

## Next steps

We've built some insights and a dashboard for you to keep an eye on user behavior, based on the events we just instrumented:

- **Dashboard — Analytics basics:** https://eu.posthog.com/project/160678/dashboard/626750
- **Newsletter subscription funnel** (form submit → subscribed → confirmed): https://eu.posthog.com/project/160678/insights/OQ8Dqvhe
- **Newsletter subscriptions over time:** https://eu.posthog.com/project/160678/insights/MvD9Mse0
- **Newsletter churn over time:** https://eu.posthog.com/project/160678/insights/O4qIm478
- **Post views over time:** https://eu.posthog.com/project/160678/insights/cjZubmUL
- **Top viewed posts (by title):** https://eu.posthog.com/project/160678/insights/PEUeQY9B

In PostHog, open **Error tracking** for `$exception` events, and create a **Trends** insight on `server_api_outcome` broken down by `outcome` or `route`.

### Agent skill

We've left an agent skill folder in your project. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

</wizard-report>
