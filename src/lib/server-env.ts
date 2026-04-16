/**
 * Shared env for Astro (Vite injects `import.meta.env`) and Bun CLI scripts
 * (`bun run scripts/...`), where `.env` is only on `process.env`.
 */
function pick(...candidates: Array<string | undefined>): string | undefined {
  for (const c of candidates) {
    if (typeof c === "string") {
      const t = c.trim();
      if (t) return t;
    }
  }
  return undefined;
}

const metaEnv = import.meta.env as Record<string, string | undefined>;

function envVar(name: string): () => string | undefined {
  return () => pick(metaEnv[name], process.env[name]);
}

export const envPostgresUrl = envVar("POSTGRES_URL");
export const envNewsletterTokenSecret = envVar("NEWSLETTER_TOKEN_SECRET");
export const envResendFromEmail = envVar("RESEND_FROM_EMAIL");
export const envResendWebhookSecret = envVar("RESEND_WEBHOOK_SECRET");
export const envResendApiKey = envVar("RESEND_API_KEY");
export const envResendContactsApiKey = envVar("RESEND_CONTACTS_API_KEY");
