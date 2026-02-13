import {
  mkdir,
  cp,
  access,
  readdir,
  rm,
  stat,
  writeFile,
} from "fs/promises";
import { join, basename, normalize, resolve, sep } from "path";
import { homedir } from "os";
import type { Skill, AgentType } from "../types";
import { agents, detectInstalledAgents } from "../agents";
import { AGENTS_DIR, SKILLS_SUBDIR } from "../constants";
import { parseFrontmatter } from "../utils/frontmatter";
import { readFile } from "fs/promises";

export interface SkillInstallResult {
  success: boolean;
  path: string;
  error?: string;
}

/**
 * Sanitizes a skill name for safe filesystem use.
 * Prevents path traversal, enforces kebab-case, max 255 chars.
 */
export function sanitizeName(name: string): string {
  const sanitized = name
    .toLowerCase()
    .replace(/[^a-z0-9._]+/g, "-")
    .replace(/^[.\-]+|[.\-]+$/g, "");

  return sanitized.substring(0, 255) || "unnamed-skill";
}

function isPathSafe(basePath: string, targetPath: string): boolean {
  const normalizedBase = normalize(resolve(basePath));
  const normalizedTarget = normalize(resolve(targetPath));
  return (
    normalizedTarget.startsWith(normalizedBase + sep) ||
    normalizedTarget === normalizedBase
  );
}

function getCanonicalSkillsDir(isGlobal: boolean, cwd?: string): string {
  const baseDir = isGlobal ? homedir() : cwd || process.cwd();
  return join(baseDir, AGENTS_DIR, SKILLS_SUBDIR);
}

async function cleanAndCreateDirectory(path: string): Promise<void> {
  try {
    await rm(path, { recursive: true, force: true });
  } catch {
    // Ignore cleanup errors
  }
  await mkdir(path, { recursive: true });
}

const EXCLUDE_FILES = new Set(["README.md", "metadata.json"]);
const EXCLUDE_DIRS = new Set([".git"]);

function isExcluded(name: string, isDirectory = false): boolean {
  if (EXCLUDE_FILES.has(name)) return true;
  if (name.startsWith("_")) return true;
  if (isDirectory && EXCLUDE_DIRS.has(name)) return true;
  return false;
}

async function copyDirectory(src: string, dest: string): Promise<void> {
  await mkdir(dest, { recursive: true });
  const entries = await readdir(src, { withFileTypes: true });

  await Promise.all(
    entries
      .filter((entry) => !isExcluded(entry.name, entry.isDirectory()))
      .map(async (entry) => {
        const srcPath = join(src, entry.name);
        const destPath = join(dest, entry.name);

        if (entry.isDirectory()) {
          await copyDirectory(srcPath, destPath);
        } else {
          await cp(srcPath, destPath, { dereference: true, recursive: true });
        }
      }),
  );
}

/**
 * Install a skill for a specific agent. Copy-only mode (no symlinks).
 */
export async function installSkillForAgent(
  skill: Skill,
  agentType: AgentType,
  options: { global?: boolean; cwd?: string } = {},
): Promise<SkillInstallResult> {
  const agent = agents[agentType];
  const isGlobal = options.global ?? false;
  const cwd = options.cwd || process.cwd();

  if (isGlobal && agent.globalSkillsDir === undefined) {
    return {
      success: false,
      path: "",
      error: `${agent.displayName} does not support global skill installation`,
    };
  }

  const rawSkillName = skill.name || basename(skill.path);
  const skillName = sanitizeName(rawSkillName);

  const agentBase = isGlobal
    ? agent.globalSkillsDir!
    : join(cwd, agent.skillsDir);
  const agentDir = join(agentBase, skillName);

  if (!isPathSafe(agentBase, agentDir)) {
    return {
      success: false,
      path: agentDir,
      error: "Invalid skill name: potential path traversal detected",
    };
  }

  try {
    await cleanAndCreateDirectory(agentDir);
    await copyDirectory(skill.path, agentDir);

    return {
      success: true,
      path: agentDir,
    };
  } catch (error) {
    return {
      success: false,
      path: agentDir,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function isSkillInstalled(
  skillName: string,
  agentType: AgentType,
  options: { global?: boolean; cwd?: string } = {},
): Promise<boolean> {
  const agent = agents[agentType];
  const sanitized = sanitizeName(skillName);

  if (options.global && agent.globalSkillsDir === undefined) {
    return false;
  }

  const targetBase = options.global
    ? agent.globalSkillsDir!
    : join(options.cwd || process.cwd(), agent.skillsDir);

  const skillDir = join(targetBase, sanitized);

  if (!isPathSafe(targetBase, skillDir)) {
    return false;
  }

  try {
    await access(skillDir);
    return true;
  } catch {
    return false;
  }
}

export function getInstallPath(
  skillName: string,
  agentType: AgentType,
  options: { global?: boolean; cwd?: string } = {},
): string {
  const agent = agents[agentType];
  const cwd = options.cwd || process.cwd();
  const sanitized = sanitizeName(skillName);

  const targetBase =
    options.global && agent.globalSkillsDir !== undefined
      ? agent.globalSkillsDir
      : join(cwd, agent.skillsDir);

  return join(targetBase, sanitized);
}

export interface InstalledSkill {
  name: string;
  description: string;
  path: string;
  scope: "project" | "global";
  agents: AgentType[];
}

export async function listInstalledSkills(
  options: {
    global?: boolean;
    cwd?: string;
    agentFilter?: AgentType[];
  } = {},
): Promise<InstalledSkill[]> {
  const cwd = options.cwd || process.cwd();
  const skillsMap = new Map<string, InstalledSkill>();

  const detectedAgents = await detectInstalledAgents();
  const agentFilter = options.agentFilter;
  const agentsToCheck = agentFilter
    ? detectedAgents.filter((a) => agentFilter.includes(a))
    : detectedAgents;

  const scopeTypes: Array<{ global: boolean }> = [];
  if (options.global === undefined) {
    scopeTypes.push({ global: false }, { global: true });
  } else {
    scopeTypes.push({ global: options.global });
  }

  const scopes: Array<{
    global: boolean;
    path: string;
    agentType?: AgentType;
  }> = [];

  for (const { global: isGlobal } of scopeTypes) {
    scopes.push({
      global: isGlobal,
      path: getCanonicalSkillsDir(isGlobal, cwd),
    });

    for (const agentType of agentsToCheck) {
      const agent = agents[agentType];
      if (isGlobal && agent.globalSkillsDir === undefined) continue;

      const agentDir = isGlobal
        ? agent.globalSkillsDir!
        : join(cwd, agent.skillsDir);

      if (!scopes.some((s) => s.path === agentDir && s.global === isGlobal)) {
        scopes.push({ global: isGlobal, path: agentDir, agentType });
      }
    }
  }

  for (const scope of scopes) {
    try {
      const entries = await readdir(scope.path, { withFileTypes: true });

      for (const entry of entries) {
        if (!entry.isDirectory()) continue;

        const skillDir = join(scope.path, entry.name);
        const skillMdPath = join(skillDir, "SKILL.md");

        try {
          await stat(skillMdPath);
        } catch {
          continue;
        }

        let skillName = entry.name;
        let description = "";

        try {
          const content = await readFile(skillMdPath, "utf-8");
          const { data } = parseFrontmatter(content);
          if (typeof data.name === "string") skillName = data.name;
          if (typeof data.description === "string")
            description = data.description;
        } catch {
          // Use defaults
        }

        const scopeKey = scope.global ? "global" : "project";
        const skillKey = `${scopeKey}:${skillName}`;

        if (scope.agentType) {
          if (skillsMap.has(skillKey)) {
            const existing = skillsMap.get(skillKey)!;
            if (!existing.agents.includes(scope.agentType)) {
              existing.agents.push(scope.agentType);
            }
          } else {
            skillsMap.set(skillKey, {
              name: skillName,
              description,
              path: skillDir,
              scope: scopeKey,
              agents: [scope.agentType],
            });
          }
          continue;
        }

        if (skillsMap.has(skillKey)) {
          // Already found via another path
        } else {
          skillsMap.set(skillKey, {
            name: skillName,
            description,
            path: skillDir,
            scope: scopeKey,
            agents: [],
          });
        }
      }
    } catch {
      // Directory doesn't exist
    }
  }

  return Array.from(skillsMap.values());
}
