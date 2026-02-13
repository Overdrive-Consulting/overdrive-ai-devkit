import { spawn } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";
import pc from "picocolors";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ONE_DAY = 86_400_000;
const PKG_NAME = "@enteroverdrive/ai-devkit";

interface UpdateCache {
  latest: string;
  lastCheck: number;
}

function getCacheDir(): string {
  const base =
    process.env.XDG_CONFIG_HOME || join(homedir(), ".config");
  return join(base, "ai-devkit");
}

function getCachePath(): string {
  return join(getCacheDir(), "update-check.json");
}

function readCache(): UpdateCache | null {
  try {
    return JSON.parse(readFileSync(getCachePath(), "utf8"));
  } catch {
    return null;
  }
}

function isNewerVersion(latest: string, current: string): boolean {
  const parse = (v: string) =>
    v
      .replace(/^v/, "")
      .split(".")
      .map(Number);
  const [lMajor = 0, lMinor = 0, lPatch = 0] = parse(latest);
  const [cMajor = 0, cMinor = 0, cPatch = 0] = parse(current);

  if (lMajor !== cMajor) return lMajor > cMajor;
  if (lMinor !== cMinor) return lMinor > cMinor;
  return lPatch > cPatch;
}

/**
 * Non-blocking update check using the stale-read + background-child pattern.
 *
 * - Reads cached result from a previous background check (instant).
 * - If the check interval has elapsed, spawns a detached child process
 *   to query the npm registry (does NOT block the parent).
 * - If a newer version is found in cache, registers a process.exit handler
 *   to print a notification after all command output.
 */
export function notifyUpdate(currentVersion: string): void {
  // Skip in CI, non-TTY, or if user opts out
  if (
    process.env.CI ||
    process.env.NO_UPDATE_NOTIFIER ||
    !process.stderr.isTTY
  ) {
    return;
  }

  const cached = readCache();

  // Spawn background check if enough time has passed
  const lastCheck = cached?.lastCheck ?? 0;
  if (Date.now() - lastCheck >= ONE_DAY) {
    try {
      spawn(
        process.execPath,
        [
          join(__dirname, "update-check-worker.js"),
          PKG_NAME,
          currentVersion,
        ],
        { detached: true, stdio: "ignore" },
      ).unref();
    } catch {
      // Ignore spawn errors
    }
  }

  // Display cached result from PREVIOUS check
  if (cached?.latest && isNewerVersion(cached.latest, currentVersion)) {
    process.on("exit", () => {
      const msg = [
        "",
        `  ${pc.yellow("Update available!")} ${pc.dim(currentVersion)} → ${pc.green(cached.latest)}`,
        `  Run ${pc.cyan(`npm i -g ${PKG_NAME}`)} to update`,
        "",
      ].join("\n");
      console.error(msg);
    });
  }
}
