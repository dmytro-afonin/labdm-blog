import { neon } from "@neondatabase/serverless";

import { envPostgresUrl } from "./server-env";

let sql: ReturnType<typeof neon> | null = null;

function getPostgresUrl(): string | null {
  const url = envPostgresUrl();
  return url ?? null;
}

export function getNeonSql(): ReturnType<typeof neon> {
  if (sql) return sql;

  const url = getPostgresUrl();
  if (!url) {
    throw new Error("POSTGRES_URL is not configured.");
  }

  sql = neon(url);
  return sql;
}

export function isDatabaseConfigured(): boolean {
  return getPostgresUrl() !== null;
}
