/// <reference types="astro/client" />

interface ImportMetaEnv {
  /** Neon connection string (server-only). */
  readonly POSTGRES_URL?: string;
  /**
   * Resend API key for sending email (optional if you only use Contacts sync with
   * `RESEND_CONTACTS_API_KEY`). May be a send-only key.
   */
  readonly RESEND_API_KEY?: string;
  /** Full-access Resend API key for Contacts API (newsletter sync). Falls back to `RESEND_API_KEY` if unset. */
  readonly RESEND_CONTACTS_API_KEY?: string;
  /** Resend Svix secret used to verify webhook deliveries. */
  readonly RESEND_WEBHOOK_SECRET?: string;
  /** HMAC secret for tokenized newsletter management links. */
  readonly NEWSLETTER_TOKEN_SECRET?: string;
}

declare namespace NodeJS {
  interface ProcessEnv {
    POSTGRES_URL?: string;
    RESEND_API_KEY?: string;
    RESEND_CONTACTS_API_KEY?: string;
    RESEND_WEBHOOK_SECRET?: string;
    NEWSLETTER_TOKEN_SECRET?: string;
  }
}
