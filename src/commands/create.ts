import * as p from "@clack/prompts";
import pc from "picocolors";
import { join, normalize, resolve, sep } from "path";
import { existsSync, mkdirSync, writeFileSync } from "fs";

export async function runCreate(args: string[]): Promise<void> {
  const subtype = args[0];
  const name = args[1];

  if (!subtype) {
    p.log.error("Missing type. Usage: adk create <skill|command|rule> [name]");
    process.exit(1);
  }

  switch (subtype) {
    case "skill":
      await createSkill(name);
      break;
    case "command":
      await createCommand(name);
      break;
    case "rule":
      await createRule(name);
      break;
    default:
      p.log.error(
        `Unknown type: ${subtype}. Must be one of: skill, command, rule`,
      );
      process.exit(1);
  }
}

function ensureWithinCwd(path: string): boolean {
  const cwd = normalize(resolve(process.cwd()));
  const target = normalize(resolve(path));
  return target === cwd || target.startsWith(cwd + sep);
}

function fail(message: string): never {
  p.log.error(message);
  process.exit(1);
}

export function sanitizeScaffoldName(
  input: string,
  kind: "skill" | "command" | "rule",
): string {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new Error("Name is required");
  }

  if (
    trimmed.includes("/") ||
    trimmed.includes("\\") ||
    trimmed.includes("..")
  ) {
    throw new Error(`Invalid ${kind} name: path separators are not allowed`);
  }

  if (!/^[a-z0-9-]+$/i.test(trimmed)) {
    throw new Error(
      `Invalid ${kind} name: use letters, numbers, and hyphens only`,
    );
  }

  return trimmed;
}

function normalizeScaffoldName(
  value: string,
  kind: "skill" | "command" | "rule",
): string {
  try {
    return sanitizeScaffoldName(value, kind);
  } catch (error) {
    fail(error instanceof Error ? error.message : `Invalid ${kind} name`);
  }
}

async function createSkill(name?: string): Promise<void> {
  let skillName = name;

  if (!skillName) {
    const input = await p.text({
      message: "What is the name of your skill?",
      placeholder: "my-skill",
      validate: (value) => {
        if (!value.trim()) return "Name is required";
        if (!/^[a-z0-9-]+$/.test(value))
          return "Name must be lowercase alphanumeric with hyphens";
        return undefined;
      },
    });

    if (p.isCancel(input)) {
      p.cancel("Cancelled");
      process.exit(0);
    }

    skillName = input as string;
  }

  skillName = normalizeScaffoldName(skillName, "skill");

  const dir = join(process.cwd(), skillName);
  if (!ensureWithinCwd(dir)) {
    fail("Refusing to create skill outside the current directory.");
  }

  if (existsSync(dir)) {
    fail(`Directory already exists: ${skillName}`);
  }

  mkdirSync(dir, { recursive: true });

  const skillMd = `---
name: ${skillName}
description: TODO - describe what this skill does
---

# ${skillName}

TODO - Add your skill instructions here.

This file will be included as context when an AI agent uses this skill.
`;

  const readmeMd = `# ${skillName}

A skill for AI coding agents.

## Installation

\`\`\`bash
adk add skill ./${skillName}
\`\`\`

## Description

TODO - Describe what this skill does and when agents should use it.
`;

  writeFileSync(join(dir, "SKILL.md"), skillMd);
  writeFileSync(join(dir, "README.md"), readmeMd);

  p.log.success(`Created skill scaffold at ${pc.cyan(skillName + "/")}`);
  p.log.info(`  ${skillName}/SKILL.md  - Skill instructions (edit this)`);
  p.log.info(`  ${skillName}/README.md - Documentation`);
  p.log.info("");
  p.log.info(
    `Install locally: ${pc.dim(`adk add skill ./${skillName}`)}`,
  );
}

async function createCommand(name?: string): Promise<void> {
  let cmdName = name;

  if (!cmdName) {
    const input = await p.text({
      message: "What is the name of your command?",
      placeholder: "my-command",
      validate: (value) => {
        if (!value.trim()) return "Name is required";
        return undefined;
      },
    });

    if (p.isCancel(input)) {
      p.cancel("Cancelled");
      process.exit(0);
    }

    cmdName = input as string;
  }

  cmdName = normalizeScaffoldName(cmdName, "command");

  const filePath = join(process.cwd(), `${cmdName}.md`);
  if (!ensureWithinCwd(filePath)) {
    fail("Refusing to create command outside the current directory.");
  }

  if (existsSync(filePath)) {
    fail(`File already exists: ${cmdName}.md`);
  }

  const content = `---
description: TODO - describe what this command does
---

# /${cmdName}

TODO - Add your command instructions here.

This command will be available as \`/${cmdName}\` in supported AI agents.
`;

  writeFileSync(filePath, content);
  p.log.success(`Created command: ${pc.cyan(cmdName + ".md")}`);
}

async function createRule(name?: string): Promise<void> {
  let ruleName = name;

  if (!ruleName) {
    const input = await p.text({
      message: "What is the name of your rule?",
      placeholder: "my-rule",
      validate: (value) => {
        if (!value.trim()) return "Name is required";
        return undefined;
      },
    });

    if (p.isCancel(input)) {
      p.cancel("Cancelled");
      process.exit(0);
    }

    ruleName = input as string;
  }

  ruleName = normalizeScaffoldName(ruleName, "rule");

  const filePath = join(process.cwd(), `${ruleName}.md`);
  if (!ensureWithinCwd(filePath)) {
    fail("Refusing to create rule outside the current directory.");
  }

  if (existsSync(filePath)) {
    fail(`File already exists: ${ruleName}.md`);
  }

  const content = `---
description: TODO - describe what this rule enforces
---

# ${ruleName}

TODO - Add your rule content here.

This rule will be included in the agent's context to guide its behavior.
`;

  writeFileSync(filePath, content);
  p.log.success(`Created rule: ${pc.cyan(ruleName + ".md")}`);
}
