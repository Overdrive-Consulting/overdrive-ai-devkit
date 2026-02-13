/**
 * Background worker for update checking.
 * Spawned as a detached child process by update-notifier.ts.
 * Fetches the latest version from npm registry and caches the result.
 */
import https from "node:https";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

const [pkgName, _currentVersion] = process.argv.slice(2);

if (!pkgName) {
  process.exit(1);
}

// Kill self after 15 seconds (network timeout protection)
setTimeout(() => process.exit(1), 15_000);

function getCachePath(): string {
  const base =
    process.env.XDG_CONFIG_HOME || join(homedir(), ".config");
  const dir = join(base, "ai-devkit");
  mkdirSync(dir, { recursive: true });
  return join(dir, "update-check.json");
}

const url = `https://registry.npmjs.org/-/package/${pkgName}/dist-tags`;

https
  .get(url, { headers: { Accept: "application/json" } }, (res) => {
    let body = "";
    res.on("data", (chunk: string) => (body += chunk));
    res.on("end", () => {
      try {
        const tags = JSON.parse(body) as Record<string, string>;
        const latest = tags.latest;
        if (latest) {
          writeFileSync(
            getCachePath(),
            JSON.stringify({ latest, lastCheck: Date.now() }),
          );
        }
      } catch {
        // Ignore parse errors
      }
      process.exit(0);
    });
  })
  .on("error", () => process.exit(1));
