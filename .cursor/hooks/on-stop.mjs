import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const root = resolve(scriptDir, "../..");

await Bun.stdin.text();

const result = spawnSync("bun", ["run", "verify"], {
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
        "Verify failed after this agent run (see hook output on stderr: `bun run verify` = build + typecheck). Fix the errors, run `bun run verify` locally until it passes, and avoid leaving the repo in a broken state. If the same failure repeats, summarize the blocker for the user instead of looping.",
    }),
  );
}

process.exit(0);
