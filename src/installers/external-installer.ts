import { readdir, readFile, stat } from "fs/promises";
import { join, basename, dirname } from "path";
import { parseFrontmatter } from "../utils/frontmatter";
import type { Skill } from "../types";

const SKIP_DIRS = ["node_modules", ".git", "dist", "build", "__pycache__"];

/**
 * Check if internal skills should be installed.
 * Internal skills are hidden by default unless INSTALL_INTERNAL_SKILLS=1 is set.
 */
export function shouldInstallInternalSkills(): boolean {
  const envValue = process.env.INSTALL_INTERNAL_SKILLS;
  return envValue === "1" || envValue === "true";
}

async function hasSkillMd(dir: string): Promise<boolean> {
  try {
    const skillPath = join(dir, "SKILL.md");
    const stats = await stat(skillPath);
    return stats.isFile();
  } catch {
    return false;
  }
}

async function parseSkillMd(
  skillMdPath: string,
  options?: { includeInternal?: boolean },
): Promise<Skill | null> {
  try {
    const content = await readFile(skillMdPath, "utf-8");
    const { data } = parseFrontmatter(content);

    if (!data.name || !data.description) return null;
    if (typeof data.name !== "string" || typeof data.description !== "string")
      return null;

    // Skip internal skills unless:
    // 1. INSTALL_INTERNAL_SKILLS=1 is set, OR
    // 2. includeInternal option is true (e.g., when user explicitly requests a skill)
    const isInternal =
      (data.metadata as Record<string, unknown>)?.internal === true;
    if (isInternal && !shouldInstallInternalSkills() && !options?.includeInternal) {
      return null;
    }

    return {
      name: data.name,
      description: data.description,
      path: dirname(skillMdPath),
      rawContent: content,
      metadata: data.metadata as Record<string, unknown> | undefined,
    };
  } catch {
    return null;
  }
}

async function findSkillDirs(
  dir: string,
  depth = 0,
  maxDepth = 5,
): Promise<string[]> {
  if (depth > maxDepth) return [];

  try {
    const [hasSkill, entries] = await Promise.all([
      hasSkillMd(dir),
      readdir(dir, { withFileTypes: true }).catch(() => []),
    ]);

    const currentDir = hasSkill ? [dir] : [];

    const subDirResults = await Promise.all(
      entries
        .filter(
          (entry) =>
            entry.isDirectory() && !SKIP_DIRS.includes(entry.name),
        )
        .map((entry) =>
          findSkillDirs(join(dir, entry.name), depth + 1, maxDepth),
        ),
    );

    return [...currentDir, ...subDirResults.flat()];
  } catch {
    return [];
  }
}

export interface DiscoverSkillsOptions {
  /** Include internal skills (e.g., when user explicitly requests a skill by name) */
  includeInternal?: boolean;
  /** Search all subdirectories even when a root SKILL.md exists */
  fullDepth?: boolean;
}

export async function discoverSkills(
  basePath: string,
  subpath?: string,
  options?: DiscoverSkillsOptions,
): Promise<Skill[]> {
  const skills: Skill[] = [];
  const seenNames = new Set<string>();
  const searchPath = subpath ? join(basePath, subpath) : basePath;

  // If pointing directly at a skill, add it (and return early unless fullDepth is set)
  if (await hasSkillMd(searchPath)) {
    const skill = await parseSkillMd(join(searchPath, "SKILL.md"), options);
    if (skill) {
      skills.push(skill);
      seenNames.add(skill.name);
      if (!options?.fullDepth) {
        return skills;
      }
    }
  }

  // Search common skill locations across all known agent directories
  const priorityDirs = [
    searchPath,
    join(searchPath, "skills"),
    join(searchPath, "skills/.curated"),
    join(searchPath, "skills/.experimental"),
    join(searchPath, "skills/.system"),
    join(searchPath, ".agent/skills"),
    join(searchPath, ".agents/skills"),
    join(searchPath, ".claude/skills"),
    join(searchPath, ".cline/skills"),
    join(searchPath, ".codebuddy/skills"),
    join(searchPath, ".codex/skills"),
    join(searchPath, ".commandcode/skills"),
    join(searchPath, ".continue/skills"),
    join(searchPath, ".cursor/skills"),
    join(searchPath, ".github/skills"),
    join(searchPath, ".goose/skills"),
    join(searchPath, ".iflow/skills"),
    join(searchPath, ".junie/skills"),
    join(searchPath, ".kilocode/skills"),
    join(searchPath, ".kiro/skills"),
    join(searchPath, ".mux/skills"),
    join(searchPath, ".neovate/skills"),
    join(searchPath, ".opencode/skills"),
    join(searchPath, ".openhands/skills"),
    join(searchPath, ".pi/skills"),
    join(searchPath, ".qoder/skills"),
    join(searchPath, ".roo/skills"),
    join(searchPath, ".trae/skills"),
    join(searchPath, ".windsurf/skills"),
    join(searchPath, ".zencoder/skills"),
  ];

  for (const dir of priorityDirs) {
    try {
      const entries = await readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const skillDir = join(dir, entry.name);
          if (await hasSkillMd(skillDir)) {
            const skill = await parseSkillMd(
              join(skillDir, "SKILL.md"),
              options,
            );
            if (skill && !seenNames.has(skill.name)) {
              skills.push(skill);
              seenNames.add(skill.name);
            }
          }
        }
      }
    } catch {
      // Directory doesn't exist
    }
  }

  // Fall back to recursive search if nothing found, or if fullDepth is set
  if (skills.length === 0 || options?.fullDepth) {
    const allSkillDirs = await findSkillDirs(searchPath);

    for (const skillDir of allSkillDirs) {
      const skill = await parseSkillMd(join(skillDir, "SKILL.md"), options);
      if (skill && !seenNames.has(skill.name)) {
        skills.push(skill);
        seenNames.add(skill.name);
      }
    }
  }

  return skills;
}

export function getSkillDisplayName(skill: Skill): string {
  return skill.name || basename(skill.path);
}

export interface Asset {
  name: string;
  description: string;
  path: string;
  content: string;
}

export async function discoverCommands(basePath: string): Promise<Asset[]> {
  const assets: Asset[] = [];
  const dirs = [basePath, join(basePath, "commands")];

  for (const dir of dirs) {
    try {
      const entries = await readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        if (!entry.isFile() || !entry.name.endsWith(".md")) continue;

        const filePath = join(dir, entry.name);
        const content = await readFile(filePath, "utf-8");
        const { data } = parseFrontmatter(content);

        assets.push({
          name: entry.name.replace(".md", ""),
          description:
            typeof data.description === "string" ? data.description : "",
          path: filePath,
          content,
        });
      }
    } catch {
      // Directory doesn't exist
    }
  }

  return assets;
}

export async function discoverRules(basePath: string): Promise<Asset[]> {
  const assets: Asset[] = [];
  const dirs = [basePath, join(basePath, "rules")];

  for (const dir of dirs) {
    try {
      const entries = await readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        if (!entry.isFile() || !entry.name.endsWith(".md")) continue;

        const filePath = join(dir, entry.name);
        const content = await readFile(filePath, "utf-8");
        const { data } = parseFrontmatter(content);

        assets.push({
          name: entry.name.replace(".md", ""),
          description:
            typeof data.description === "string" ? data.description : "",
          path: filePath,
          content,
        });
      }
    } catch {
      // Directory doesn't exist
    }
  }

  return assets;
}

export function filterSkills(skills: Skill[], names: string[]): Skill[] {
  const normalized = names.map((n) => n.toLowerCase());
  return skills.filter((skill) => {
    const name = skill.name.toLowerCase();
    const displayName = getSkillDisplayName(skill).toLowerCase();
    return normalized.some((input) => input === name || input === displayName);
  });
}
