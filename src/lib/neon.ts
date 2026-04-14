import { neon } from "@neondatabase/serverless";

let sql: ReturnType<typeof neon> | null = null;

export function getNeonSql(): ReturnType<typeof neon> {
  if (sql) return sql;
  const url = process.env.POSTGRES_URL;
  if (!url || typeof url !== "string") {
    throw new Error("POSTGRES_URL is not configured.");
  }
  sql = neon(url);
  return sql;
}

export function isDatabaseConfigured(): boolean {
  const url = process.env.POSTGRES_URL;
  return typeof url === "string" && url.length > 0;
}
