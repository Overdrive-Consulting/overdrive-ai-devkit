import { join } from "path";
import { existsSync } from "fs";
import type { DevkitConfig } from "./types";

const CONFIG_FILES = [
  "devkit.config.ts",
  "devkit.config.js",
  "devkit.config.mjs",
];

export async function loadConfig(
  projectDir: string,
): Promise<DevkitConfig | null> {
  for (const filename of CONFIG_FILES) {
    const configPath = join(projectDir, filename);
    if (!existsSync(configPath)) continue;

    try {
      const imported = await import(configPath);
      return (imported.default ?? imported) as DevkitConfig;
    } catch {
      // Failed to load config, try next
    }
  }
  return null;
}
