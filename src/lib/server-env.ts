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

export function envPostgresUrl(): string | undefined {
  return pick(import.meta.env.POSTGRES_URL, process.env.POSTGRES_URL);
}

export function envNewsletterTokenSecret(): string | undefined {
  return pick(
    import.meta.env.NEWSLETTER_TOKEN_SECRET,
    process.env.NEWSLETTER_TOKEN_SECRET,
  );
}

export function envResendFromEmail(): string | undefined {
  return pick(import.meta.env.RESEND_FROM_EMAIL, process.env.RESEND_FROM_EMAIL);
}

export function envResendWebhookSecret(): string | undefined {
  return pick(
    import.meta.env.RESEND_WEBHOOK_SECRET,
    process.env.RESEND_WEBHOOK_SECRET,
  );
}

export function envResendApiKey(): string | undefined {
  return pick(import.meta.env.RESEND_API_KEY, process.env.RESEND_API_KEY);
}

export function envResendContactsApiKey(): string | undefined {
  return pick(
    import.meta.env.RESEND_CONTACTS_API_KEY,
    process.env.RESEND_CONTACTS_API_KEY,
  );
}
