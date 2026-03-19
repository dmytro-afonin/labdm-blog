import { spawn } from "node:child_process";
import { once } from "node:events";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";

const host = "127.0.0.1";
const port = 4321;
const previewUrl = `http://${host}:${port}/`;
const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const distIndexPath = resolve(scriptDirectory, "../dist/index.html");
const astroExecutable = resolve(
  scriptDirectory,
  process.platform === "win32"
    ? "../node_modules/.bin/astro.cmd"
    : "../node_modules/.bin/astro",
);

const packageJsonPath = resolve(scriptDirectory, "../package.json");
const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
const expectedSnippets = packageJson.smoke?.expectedSnippets ?? [];

if (!existsSync(distIndexPath)) {
  throw new Error(
    "Build output is missing. Run `bun run build` before `bun run smoke`.",
  );
}

const previewProcess = spawn(
  astroExecutable,
  ["preview", "--host", host, "--port", String(port)],
  {
    env: {
      ...process.env,
      ASTRO_TELEMETRY_DISABLED: "1",
    },
    stdio: ["ignore", "pipe", "pipe"],
  },
);

previewProcess.stdout.on("data", (chunk) => {
  process.stdout.write(chunk);
});

previewProcess.stderr.on("data", (chunk) => {
  process.stderr.write(chunk);
});

previewProcess.on("error", (error) => {
  console.error("Failed to start Astro preview:", error);
});

async function waitForPreview() {
  const attempts = 20;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(previewUrl);

      if (response.ok) {
        return;
      }
    } catch {
      // The server has not started yet.
    }

    await delay(500);
  }

  throw new Error(`Preview server did not become ready at ${previewUrl}.`);
}

async function stopPreview() {
  if (previewProcess.exitCode !== null) {
    return;
  }

  previewProcess.kill("SIGTERM");

  const result = await Promise.race([
    once(previewProcess, "exit").then(() => "exited"),
    delay(5_000, "timeout"),
  ]);

  if (result === "timeout" && previewProcess.exitCode === null) {
    previewProcess.kill("SIGKILL");
    await once(previewProcess, "exit");
  }
}

try {
  await waitForPreview();

  const response = await fetch(previewUrl);

  if (!response.ok) {
    throw new Error(
      `Expected HTTP 200 from preview, received ${response.status}.`,
    );
  }

  const html = await response.text();

  for (const snippet of expectedSnippets) {
    if (!html.includes(snippet)) {
      throw new Error(
        `Preview response is missing expected content: ${snippet}`,
      );
    }
  }

  console.log(`Smoke check passed for ${previewUrl}`);
} finally {
  await stopPreview();
}
