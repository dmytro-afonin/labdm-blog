/**
 * Apply pending SQL files from db/migrations/ against Neon/Postgres.
 *
 * Usage:
 *   bun run db:migrate
 *   bun run db:migrate -- --dry-run
 *
 * Connection: POSTGRES_URL (preferred) or DATABASE_URL.
 * Loads .env.local / .env / .vercel/.env.*.local when those vars are unset.
 */
import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { neonConfig, Pool, type PoolClient } from "@neondatabase/serverless";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const migrationsDir = path.join(repoRoot, "db", "migrations");

const dryRun = process.argv.includes("--dry-run");

if (typeof WebSocket !== "undefined") {
  neonConfig.webSocketConstructor = WebSocket;
}

function stripQuotes(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

function parseEnvFile(contents: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
    out[key] = stripQuotes(trimmed.slice(eq + 1).trim());
  }
  return out;
}

async function loadEnvFiles(): Promise<void> {
  if (process.env.POSTGRES_URL?.trim() || process.env.DATABASE_URL?.trim()) {
    return;
  }

  const candidates = [
    path.join(repoRoot, ".env.local"),
    path.join(repoRoot, ".env"),
    path.join(repoRoot, ".vercel", ".env.preview.local"),
    path.join(repoRoot, ".vercel", ".env.production.local"),
    path.join(repoRoot, ".vercel", ".env.development.local"),
  ];

  for (const file of candidates) {
    try {
      const parsed = parseEnvFile(await readFile(file, "utf8"));
      for (const [key, value] of Object.entries(parsed)) {
        if (process.env[key] === undefined) {
          process.env[key] = value;
        }
      }
      if (
        process.env.POSTGRES_URL?.trim() ||
        process.env.DATABASE_URL?.trim()
      ) {
        return;
      }
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "ENOENT"
      ) {
        continue;
      }
      throw error;
    }
  }
}

function getDatabaseUrl(): string {
  const url =
    process.env.POSTGRES_URL?.trim() || process.env.DATABASE_URL?.trim();
  if (!url) {
    throw new Error(
      "POSTGRES_URL (or DATABASE_URL) is not configured. Set it in .env.local (from Neon) or run migrations in the Vercel build where Sensitive env is injected.",
    );
  }
  if (url === "[SENSITIVE]") {
    throw new Error(
      "POSTGRES_URL is Sensitive and cannot be read via vercel env pull. Migrations run in the Vercel build (see vercel.json buildCommand).",
    );
  }
  return url;
}

function checksum(contents: string): string {
  return createHash("sha256").update(contents).digest("hex");
}

function migrationSequence(name: string): number {
  const match = /^(\d+)_/u.exec(name);
  return match ? Number.parseInt(match[1]!, 10) : Number.POSITIVE_INFINITY;
}

async function listMigrationFiles(): Promise<string[]> {
  const entries = await readdir(migrationsDir);
  return entries
    .filter((name) => /^\d+_.+\.sql$/u.test(name))
    .sort((a, b) => {
      const seq = migrationSequence(a) - migrationSequence(b);
      return seq !== 0 ? seq : a.localeCompare(b, "en");
    });
}

async function ensureMigrationsTable(client: PoolClient): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      checksum TEXT NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
}

async function migrationsTableExists(client: PoolClient): Promise<boolean> {
  const result = await client.query<{ exists: boolean }>(
    `SELECT to_regclass('public.schema_migrations') IS NOT NULL AS exists`,
  );
  return Boolean(result.rows[0]?.exists);
}

async function appliedMigrations(
  client: PoolClient,
): Promise<Map<string, string>> {
  const result = await client.query<{ id: string; checksum: string }>(
    `SELECT id, checksum FROM schema_migrations`,
  );
  return new Map(result.rows.map((row) => [row.id, row.checksum]));
}

async function applyMigration(
  client: PoolClient,
  id: string,
  sql: string,
  fileChecksum: string,
): Promise<void> {
  await client.query("BEGIN");
  try {
    await client.query(sql);
    await client.query(
      `INSERT INTO schema_migrations (id, checksum) VALUES ($1, $2)`,
      [id, fileChecksum],
    );
    await client.query("COMMIT");
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // ignore rollback failures; original error is more useful
    }
    throw error;
  }
}

async function main(): Promise<void> {
  await loadEnvFiles();
  const databaseUrl = getDatabaseUrl();
  const files = await listMigrationFiles();

  if (files.length === 0) {
    console.log("No migration files found in db/migrations/.");
    return;
  }

  const pool = new Pool({ connectionString: databaseUrl });
  const client = await pool.connect();

  try {
    await client.query("SELECT pg_advisory_lock($1)", [872451003]);

    let applied: Map<string, string>;
    if (dryRun) {
      applied = (await migrationsTableExists(client))
        ? await appliedMigrations(client)
        : new Map();
    } else {
      await ensureMigrationsTable(client);
      applied = await appliedMigrations(client);
    }

    let pending = 0;
    for (const file of files) {
      const sql = await readFile(path.join(migrationsDir, file), "utf8");
      const fileChecksum = checksum(sql);
      const previous = applied.get(file);

      if (previous) {
        if (previous !== fileChecksum) {
          throw new Error(
            `Migration ${file} was already applied but its contents changed (checksum mismatch). Add a new migration file instead of editing applied SQL.`,
          );
        }
        console.log(`skip  ${file}`);
        continue;
      }

      pending += 1;
      if (dryRun) {
        console.log(`pending  ${file}`);
        continue;
      }

      console.log(`apply ${file}`);
      await applyMigration(client, file, sql, fileChecksum);
    }

    if (dryRun) {
      console.log(
        pending === 0
          ? "Dry run: database is up to date."
          : `Dry run: ${pending} migration(s) pending.`,
      );
      return;
    }

    console.log(
      pending === 0
        ? "Database is up to date."
        : `Applied ${pending} migration(s).`,
    );
  } finally {
    try {
      await client.query("SELECT pg_advisory_unlock($1)", [872451003]);
    } catch {
      // ignore unlock failures on disconnect
    }
    client.release();
    await pool.end();
  }
}

try {
  await main();
} catch (error) {
  const message =
    error instanceof Error ? error.message : "Database migration failed.";
  console.error(message);
  process.exit(1);
}
