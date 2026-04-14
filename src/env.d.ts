/// <reference types="astro/client" />

interface ImportMetaEnv {
  /** Neon connection string (server-only). */
  readonly POSTGRES_URL?: string;
  /** Resend API key used by manual sync jobs and provider updates. */
  readonly RESEND_API_KEY?: string;
  /** Resend Svix secret used to verify webhook deliveries. */
  readonly RESEND_WEBHOOK_SECRET?: string;
  /** HMAC secret for tokenized newsletter management links. */
  readonly NEWSLETTER_TOKEN_SECRET?: string;
}

declare namespace NodeJS {
  interface ProcessEnv {
    POSTGRES_URL?: string;
    RESEND_API_KEY?: string;
    RESEND_WEBHOOK_SECRET?: string;
    NEWSLETTER_TOKEN_SECRET?: string;
  }
}
