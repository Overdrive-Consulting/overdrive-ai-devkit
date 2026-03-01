import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { mkdtemp, mkdir, rm, writeFile } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { listInstalledSkills } from "../installers/skill-installer";

async function writeSkill(dir: string, name: string, description: string) {
  await mkdir(dir, { recursive: true });
  await writeFile(
    join(dir, "SKILL.md"),
    `---
name: ${name}
description: ${description}
---

# ${name}
`,
    "utf-8",
  );
}

describe("listInstalledSkills", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "adk-list-skills-test-"));
  });

  afterEach(async () => {
    if (existsSync(tempDir)) {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("lists skills for an explicit agent filter without relying on detection", async () => {
    await writeSkill(
      join(tempDir, ".cursor", "skills", "debug-helper"),
      "Debug Helper",
      "Help debug flows",
    );

    const result = await listInstalledSkills({
      cwd: tempDir,
      global: false,
      agentFilter: ["cursor"],
    });

    expect(result).toHaveLength(1);
    expect(result[0]!.name).toBe("Debug Helper");
    expect(result[0]!.agents).toEqual(["cursor"]);
  });

  it("lists project skills even when no agent filter is passed", async () => {
    await writeSkill(
      join(tempDir, ".claude", "skills", "plan-check"),
      "Plan Check",
      "Track task plans",
    );

    const result = await listInstalledSkills({
      cwd: tempDir,
      global: false,
    });

    const skill = result.find((item) => item.name === "Plan Check");
    expect(skill).toBeDefined();
    expect(skill!.agents).toContain("claude-code");
  });
});
