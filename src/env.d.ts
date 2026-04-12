/// <reference types="astro/client" />

interface ImportMetaEnv {
  /** Neon connection string (server-only). */
  readonly POSTGRES_URL?: string;
}
