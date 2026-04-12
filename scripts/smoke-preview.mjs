import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";

const host = "127.0.0.1";
const port = 4321;
const previewUrl = `http://${host}:${port}/`;
const scriptDirectory = dirname(fileURLToPath(import.meta.url));

/** Prefer root `dist/`, then Vercel-style `dist/client/`, then copied static output. */
const indexCandidates = [
  resolve(scriptDirectory, "../dist/index.html"),
  resolve(scriptDirectory, "../dist/client/index.html"),
  resolve(scriptDirectory, "../.vercel/output/static/index.html"),
];

const distIndexPath = indexCandidates.find((p) => existsSync(p));

const packageJsonPath = resolve(scriptDirectory, "../package.json");
const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
const expectedSnippets = packageJson.smoke?.expectedSnippets ?? [];

if (!distIndexPath) {
  throw new Error(
    "Build output is missing. Run `bun run build` before `bun run smoke`.",
  );
}

const staticRoot = dirname(distIndexPath);

/**
 * Serves the built `index.html` for GET `/` only.
 *
 * `astro preview` uses Vite with `build.outDir` = project `outDir` (`dist/`). The Vercel
 * adapter writes prerendered HTML under `dist/client/`, so `/` is 404 in preview even when
 * the site builds successfully. CI smoke instead checks the same files Vercel deploys.
 */
function createSmokeServer() {
  const indexPath = join(staticRoot, "index.html");
  return createServer((req, res) => {
    if (req.method !== "GET" && req.method !== "HEAD") {
      res.writeHead(405);
      res.end();
      return;
    }
    const url = new URL(req.url ?? "/", previewUrl);
    if (url.pathname !== "/") {
      res.writeHead(404);
      res.end();
      return;
    }
    const body = readFileSync(indexPath);
    res.writeHead(200, {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Length": String(body.length),
    });
    if (req.method === "HEAD") {
      res.end();
    } else {
      res.end(body);
    }
  });
}

const server = createSmokeServer();

server.listen(port, host, (err) => {
  if (err) {
    console.error("Failed to bind smoke server:", err);
    process.exitCode = 1;
  }
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

async function stopServer() {
  await new Promise((resolve) => {
    server.close(() => resolve());
  });
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
  await stopServer();
}
