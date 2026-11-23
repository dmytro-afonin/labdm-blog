import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const root = resolve(scriptDir, "../..");

// Drain stdin so the hook process does not block waiting on a pipe; the payload
// from Cursor is not used here, so reading it discards it.
readFileSync(0, "utf-8");

const result = spawnSync("pnpm", ["run", "verify"], {
  cwd: root,
  encoding: "utf-8",
  env: process.env,
});

if (result.stdout) {
  process.stderr.write(result.stdout);
}
if (result.stderr) {
  process.stderr.write(result.stderr);
}

const ok = result.status === 0;

if (ok) {
  console.log(JSON.stringify({}));
} else {
  console.log(
    JSON.stringify({
      followup_message:
        "Verify failed after this agent run (see hook output on stderr: `pnpm run verify` = build + typecheck). Fix the errors, run `pnpm run verify` locally until it passes, and avoid leaving the repo in a broken state. If the same failure repeats, summarize the blocker for the user instead of looping.",
    }),
  );
}

process.exit(0);
