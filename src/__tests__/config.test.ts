import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, writeFile } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { loadConfig } from "../config";

describe("loadConfig", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "adk-config-test-"));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("returns null when no config file exists", async () => {
    const config = await loadConfig(tempDir);
    expect(config).toBeNull();
  });

  it("loads a .js config file", async () => {
    const configContent = `export default {
  agents: ["claude-code", "cursor"],
  skills: ["debug"],
};`;

    await writeFile(join(tempDir, "devkit.config.mjs"), configContent);

    const config = await loadConfig(tempDir);
    expect(config).not.toBeNull();
    expect(config!.agents).toEqual(["claude-code", "cursor"]);
    expect(config!.skills).toEqual(["debug"]);
  });
});
