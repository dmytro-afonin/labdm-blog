import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, extname, normalize, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const root = resolve(scriptDir, "../..");

function shouldSkip(absPath) {
  const rel = relative(root, absPath);
  if (rel.startsWith("..") || rel === "") return true;
  const parts = normalize(rel).split(/[/\\]/);
  return parts.some((p) =>
    ["node_modules", ".git", "dist", ".astro", ".vercel"].includes(p),
  );
}

let payload;
try {
  payload = JSON.parse((await Bun.stdin.text()) || "{}");
} catch {
  process.exit(0);
}

const filePath = payload.file_path;
if (!filePath || typeof filePath !== "string" || !existsSync(filePath)) {
  process.exit(0);
}

const resolved = resolve(filePath);
if (shouldSkip(resolved)) {
  process.exit(0);
}

const ext = extname(resolved).toLowerCase();

const PRETTIER_EXT = new Set([
  ".js",
  ".mjs",
  ".cjs",
  ".ts",
  ".mts",
  ".cts",
  ".tsx",
  ".jsx",
  ".json",
  ".jsonc",
  ".md",
  ".mdx",
  ".astro",
  ".css",
  ".scss",
  ".html",
  ".yml",
  ".yaml",
]);

const ESLINT_EXT = new Set([
  ".js",
  ".mjs",
  ".cjs",
  ".jsx",
  ".ts",
  ".mts",
  ".cts",
  ".tsx",
  ".astro",
]);

const STYLELINT_EXT = new Set([".css", ".astro"]);

function run(cmd, args) {
  const r = spawnSync(cmd, args, {
    cwd: root,
    stdio: "inherit",
    env: process.env,
  });
  return r.status ?? 1;
}

if (
  PRETTIER_EXT.has(ext) &&
  run("bunx", ["prettier", "--write", resolved]) !== 0
) {
  process.exit(1);
}

if (ESLINT_EXT.has(ext) && run("bunx", ["eslint", "--fix", resolved]) !== 0) {
  process.exit(1);
}

if (
  STYLELINT_EXT.has(ext) &&
  run("bunx", ["stylelint", resolved, "--fix", "--allow-empty-input"]) !== 0
) {
  process.exit(1);
}

process.exit(0);
