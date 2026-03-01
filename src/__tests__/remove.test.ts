import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { mkdtemp, mkdir, rm, writeFile } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { runRemove } from "../commands/remove";

async function makeInstalledSkill(dir: string) {
  await mkdir(dir, { recursive: true });
  await writeFile(
    join(dir, "SKILL.md"),
    `---
name: smoke
description: smoke
---

# smoke
`,
    "utf-8",
  );
}

describe("runRemove", () => {
  let tempDir: string;
  let previousCwd: string;

  beforeEach(async () => {
    previousCwd = process.cwd();
    tempDir = await mkdtemp(join(tmpdir(), "adk-remove-test-"));
    process.chdir(tempDir);
  });

  afterEach(async () => {
    process.chdir(previousCwd);
    await rm(tempDir, { recursive: true, force: true });
  });

  it("removes a skill from all agent directories by default", async () => {
    const cursorSkill = join(tempDir, ".cursor", "skills", "smoke");
    const claudeSkill = join(tempDir, ".claude", "skills", "smoke");
    await makeInstalledSkill(cursorSkill);
    await makeInstalledSkill(claudeSkill);

    expect(existsSync(cursorSkill)).toBe(true);
    expect(existsSync(claudeSkill)).toBe(true);

    await runRemove(["skill", "smoke", "--yes"]);

    expect(existsSync(cursorSkill)).toBe(false);
    expect(existsSync(claudeSkill)).toBe(false);
  });
});
