/// <reference types="astro/client" />

interface ImportMetaEnv {
  /** Neon connection string (server-only). */
  readonly DATABASE_URL?: string;
}
