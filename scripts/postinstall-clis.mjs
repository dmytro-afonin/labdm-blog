/**
 * Optional global CLI setup after `bun install` / `npm install`.
 *
 * Skips entirely when CI=true or SKIP_OPTIONAL_CLIS=1.
 *
 * Installs (unless already on PATH):
 * - CodeRabbit CLI (`coderabbit`; Homebrew does not add `cr`) — unless SKIP_CODERABBIT_CLI=1
 * - fnm (Fast Node Manager) — unless SKIP_FNM_CLI=1
 *
 * After fnm is available, runs `fnm install` in the repo root when `.node-version` exists.
 *
 * Already provided by this repo (no global install):
 * - Vercel CLI → `bunx vercel` / `node_modules/.bin/vercel`
 * - Astro, ESLint, Prettier, Stylelint → `bunx …` / local bin
 *
 * Node version for fnm / nvm / asdf: see `.node-version` in the repo root.
 * Bun must be installed separately (see https://bun.sh ).
 *
 * Git: sets `core.hooksPath` to `.githooks` when unset (skipped in CI and when
 * SKIP_GIT_HOOKS_SETUP=1). Optional CLIs are skipped when CI or SKIP_OPTIONAL_CLIS=1.
 */

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const log = (msg) => console.log(`[postinstall-clis] ${msg}`);

const isCi = process.env.CI === "true";
const skipOptionalClis = isCi || process.env.SKIP_OPTIONAL_CLIS === "1";

function hasCmd(name) {
  if (process.platform === "win32") {
    const r = spawnSync("where.exe", [name], {
      encoding: "utf-8",
      windowsHide: true,
      stdio: ["ignore", "ignore", "ignore"],
    });
    return r.status === 0;
  }
  const r = spawnSync(
    "sh",
    ["-c", 'command -v "$1" >/dev/null 2>&1', "hasCmd", name],
    { stdio: ["ignore", "ignore", "ignore"] },
  );
  return r.status === 0;
}

function brewInstall(formula, label) {
  if (!hasCmd("brew")) {
    return false;
  }
  log(`Installing ${label} via Homebrew (\`${formula}\`)…`);
  const r = spawnSync("brew", ["install", formula], { stdio: "inherit" });
  return r.status === 0;
}

function brewInstallCask(cask, label) {
  if (!hasCmd("brew")) {
    return false;
  }
  log(`Installing ${label} via Homebrew cask (\`${cask}\`)…`);
  const r = spawnSync("brew", ["install", "--cask", cask], {
    stdio: "inherit",
  });
  return r.status === 0;
}

function logCodeRabbitAuthHint(context) {
  if (hasCmd("coderabbit")) {
    log(`${context}: run \`coderabbit auth login\` once.`);
    return;
  }
  if (hasCmd("cr")) {
    log(`${context}: run \`cr auth login\` once.`);
    return;
  }
  log(
    `${context}: open a new terminal, ensure Homebrew’s bin dir is on PATH, then run \`coderabbit auth login\`.`,
  );
  log(
    "Homebrew only installs the `coderabbit` command (not `cr`); see https://docs.coderabbit.ai/cli",
  );
}

function installCodeRabbitFromScript() {
  log("Installing CodeRabbit CLI via https://cli.coderabbit.ai/install.sh …");
  const curl = spawnSync(
    "curl",
    ["-fsSL", "https://cli.coderabbit.ai/install.sh"],
    { encoding: "utf-8", maxBuffer: 10 * 1024 * 1024 },
  );
  if (curl.status !== 0) {
    log("curl failed; install manually: https://docs.coderabbit.ai/cli");
    return false;
  }
  const sh = spawnSync("sh", ["-s"], {
    input: curl.stdout,
    stdio: ["pipe", "inherit", "inherit"],
  });
  return sh.status === 0;
}

function installFnmFromScript() {
  log("Installing fnm via https://fnm.vercel.app/install …");
  const curl = spawnSync("curl", ["-fsSL", "https://fnm.vercel.app/install"], {
    encoding: "utf-8",
    maxBuffer: 10 * 1024 * 1024,
  });
  if (curl.status !== 0) {
    log("curl failed; install fnm: https://github.com/Schniz/fnm#installation");
    return false;
  }
  const sh = spawnSync("sh", ["-s"], {
    input: curl.stdout,
    stdio: ["pipe", "inherit", "inherit"],
  });
  return sh.status === 0;
}

function installFnmWindows() {
  if (!hasCmd("winget")) {
    log(
      "fnm: install with `winget install -e --id Schniz.fnm` or see https://github.com/Schniz/fnm#installation",
    );
    return false;
  }
  log("Installing fnm via winget (Schniz.fnm)…");
  const r = spawnSync(
    "winget",
    [
      "install",
      "-e",
      "--id",
      "Schniz.fnm",
      "--accept-package-agreements",
      "--accept-source-agreements",
    ],
    { stdio: "inherit" },
  );
  return r.status === 0;
}

function tryFnmSyncNode() {
  const versionFile = join(root, ".node-version");
  if (!existsSync(versionFile) || !hasCmd("fnm")) {
    return;
  }
  log("Syncing Node from .node-version (`fnm install`)…");
  const r = spawnSync("fnm", ["install"], { cwd: root, stdio: "inherit" });
  if (r.status !== 0) {
    log("fnm install failed; run `fnm install` in the repo root after setup.");
  }
}

function trySetupGitHooks() {
  if (isCi || process.env.SKIP_GIT_HOOKS_SETUP === "1") {
    return;
  }
  const gitMeta = join(root, ".git");
  const prePush = join(root, ".githooks", "pre-push");
  if (!existsSync(gitMeta) || !existsSync(prePush)) {
    return;
  }
  if (!hasCmd("git")) {
    log(
      "Git hooks: `git` not found; run `bun run setup:git-hooks` after installing Git.",
    );
    return;
  }
  const current = spawnSync("git", ["config", "--get", "core.hooksPath"], {
    cwd: root,
    encoding: "utf-8",
  });
  const configured = (current.stdout ?? "").trim();
  if (configured === ".githooks") {
    log("Git hooksPath already set to `.githooks`.");
    return;
  }
  if (configured !== "") {
    log(
      `Git hooksPath is already "${configured}"; not changing. To use this repo’s hooks: git config core.hooksPath .githooks`,
    );
    return;
  }
  log("Setting Git core.hooksPath to `.githooks` (pre-push runs verify:push)…");
  const set = spawnSync("git", ["config", "core.hooksPath", ".githooks"], {
    cwd: root,
    stdio: "inherit",
  });
  if (set.status !== 0) {
    log("Could not set core.hooksPath; run manually: bun run setup:git-hooks");
  }
}

if (skipOptionalClis) {
  log("Skipping optional global CLIs (CI or SKIP_OPTIONAL_CLIS=1).");
} else {
  log(
    "Project CLIs: use `bunx vercel`, `bunx astro`, `bunx eslint`, etc. (from devDependencies).",
  );

  if (process.env.SKIP_CODERABBIT_CLI !== "1") {
    if (hasCmd("cr") || hasCmd("coderabbit")) {
      const cmd = hasCmd("coderabbit") ? "coderabbit" : "cr";
      log(`CodeRabbit CLI already on PATH (use \`${cmd}\`).`);
    } else {
      let ok = false;
      if (process.platform === "darwin") {
        ok = brewInstallCask("coderabbit", "CodeRabbit CLI");
        if (!ok) {
          log(
            "CodeRabbit CLI: run `brew install --cask coderabbit` or see https://docs.coderabbit.ai/cli",
          );
        }
      } else if (process.platform === "linux") {
        ok = installCodeRabbitFromScript();
        if (!ok) {
          log("CodeRabbit CLI: see https://docs.coderabbit.ai/cli");
        }
      } else if (process.platform === "win32") {
        log(
          "CodeRabbit CLI is officially supported on Windows via WSL; see https://docs.coderabbit.ai/cli/wsl-windows",
        );
      }
      if (ok) {
        logCodeRabbitAuthHint("CodeRabbit CLI installed");
      }
    }
  } else {
    log("Skipping CodeRabbit CLI (SKIP_CODERABBIT_CLI=1).");
  }

  if (process.env.SKIP_FNM_CLI !== "1") {
    if (hasCmd("fnm")) {
      log("fnm already on PATH.");
    } else {
      let ok = false;
      if (process.platform === "darwin") {
        ok = brewInstall("fnm", "fnm");
        if (!ok) {
          log(
            "fnm: run `brew install fnm` or see https://github.com/Schniz/fnm#installation",
          );
        }
      } else if (process.platform === "linux") {
        ok = installFnmFromScript();
        if (!ok) {
          log("fnm: see https://github.com/Schniz/fnm#installation");
        }
      } else if (process.platform === "win32") {
        ok = installFnmWindows();
        if (!ok) {
          log("fnm: see https://github.com/Schniz/fnm#installation");
        }
      }
      if (ok && hasCmd("fnm")) {
        log(
          "fnm installed. Ensure your shell loads fnm (see fnm docs for `fnm env`).",
        );
      }
    }
    tryFnmSyncNode();
  } else {
    log("Skipping fnm (SKIP_FNM_CLI=1).");
  }
}

trySetupGitHooks();

process.exit(0);
