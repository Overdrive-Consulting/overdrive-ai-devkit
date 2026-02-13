import * as p from "@clack/prompts";
import pc from "picocolors";
import { existsSync } from "fs";
import { sep } from "path";
import { homedir } from "os";
import { parseSource, getOwnerRepo } from "../utils/source-parser";
import { cloneRepo, cleanupTempDir, GitCloneError } from "../utils/git";
import {
  parseOwnerRepo,
  fetchSkillFolderHashes,
} from "../utils/github";
import {
  discoverSkills,
  discoverCommands,
  discoverRules,
  filterSkills,
  getSkillDisplayName,
  type DiscoverSkillsOptions,
} from "../installers/external-installer";
import {
  installSkillForAgent,
  isSkillInstalled,
  sanitizeName,
} from "../installers/skill-installer";
import { agents, detectInstalledAgents } from "../agents";
import {
  searchMultiselect,
  cancelSymbol,
} from "../prompts/search-multiselect";
import {
  addAssetToLock,
  computeContentHash,
  getLastSelectedAgents,
  saveSelectedAgents,
} from "../utils/lock";
import type { AgentType, AssetType, Skill } from "../types";

interface AddOptions {
  global?: boolean;
  yes?: boolean;
  skill?: string[];
  agent?: string[];
  list?: boolean;
  all?: boolean;
  fullDepth?: boolean;
}

function parseAddArgs(args: string[]): {
  type: AssetType;
  source: string;
  options: AddOptions;
} {
  const options: AddOptions = {};
  let type: AssetType = "skill";
  let source = "";

  const positional: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;

    if (arg === "-g" || arg === "--global") {
      options.global = true;
    } else if (arg === "-y" || arg === "--yes") {
      options.yes = true;
    } else if (arg === "-l" || arg === "--list") {
      options.list = true;
    } else if (arg === "--all") {
      options.all = true;
    } else if (arg === "--full-depth") {
      options.fullDepth = true;
    } else if (arg === "-s" || arg === "--skill") {
      options.skill = options.skill || [];
      i++;
      let nextArg = args[i];
      while (i < args.length && nextArg && !nextArg.startsWith("-")) {
        options.skill.push(nextArg);
        i++;
        nextArg = args[i];
      }
      i--;
    } else if (arg === "-a" || arg === "--agent") {
      options.agent = options.agent || [];
      i++;
      let nextArg = args[i];
      while (i < args.length && nextArg && !nextArg.startsWith("-")) {
        options.agent.push(nextArg);
        i++;
        nextArg = args[i];
      }
      i--;
    } else if (!arg.startsWith("-")) {
      positional.push(arg);
    }
  }

  if (positional.length >= 2) {
    const maybeType = positional[0]!;
    if (["skill", "command", "rule", "mcp"].includes(maybeType)) {
      type = maybeType as AssetType;
      source = positional[1]!;
    } else {
      source = positional[0]!;
    }
  } else if (positional.length === 1) {
    source = positional[0]!;
  }

  // --all implies --skill '*', --agent '*', and -y
  if (options.all) {
    options.skill = ["*"];
    options.agent = ["*"];
    options.yes = true;
  }

  return { type, source, options };
}

function shortenPath(fullPath: string, cwd: string): string {
  const home = homedir();
  if (fullPath === home || fullPath.startsWith(home + sep)) {
    return "~" + fullPath.slice(home.length);
  }
  if (fullPath === cwd || fullPath.startsWith(cwd + sep)) {
    return "." + fullPath.slice(cwd.length);
  }
  return fullPath;
}

export async function runAdd(args: string[]): Promise<void> {
  const { type, source, options } = parseAddArgs(args);

  if (!source) {
    p.log.error("Missing source. Usage: adk add <type> <source>");
    p.log.info("Examples:");
    p.log.info("  adk add skill owner/repo");
    p.log.info("  adk add skill ./local-skills");
    p.log.info("  adk add command owner/repo");
    p.log.info("Options:");
    p.log.info("  -g, --global       Install globally");
    p.log.info("  -y, --yes          Skip prompts");
    p.log.info("  -l, --list         List available skills without installing");
    p.log.info("  --all              Install all skills to all agents");
    p.log.info("  --full-depth       Search all subdirectories for skills");
    p.log.info("  -s, --skill <n>    Filter specific skills");
    p.log.info("  -a, --agent <n>    Target specific agents");
    process.exit(1);
  }

  const parsed = parseSource(source);
  const cwd = process.cwd();
  let tempDir: string | null = null;

  try {
    let basePath: string;

    if (parsed.type === "local") {
      basePath = parsed.localPath!;
      if (!existsSync(basePath)) {
        p.log.error(`Local path does not exist: ${basePath}`);
        process.exit(1);
      }
    } else {
      const spinner = p.spinner();
      spinner.start(`Cloning ${parsed.url}...`);
      tempDir = await cloneRepo(parsed.url, parsed.ref);
      spinner.stop("Repository cloned");
      basePath = tempDir;
    }

    if (type === "skill") {
      await addSkills(basePath, parsed.subpath, parsed.skillFilter, options, cwd, source, parsed.type);
    } else if (type === "command") {
      await addCommands(basePath, options, cwd, source);
    } else if (type === "rule") {
      await addRules(basePath, options, cwd, source);
    } else {
      p.log.error(`Adding MCP configs is not yet supported via add command.`);
      p.log.info("Use 'adk init' to configure MCP servers.");
    }
  } catch (error) {
    if (error instanceof GitCloneError) {
      p.log.error(pc.red("Failed to clone repository"));
      for (const line of error.message.split("\n")) {
        p.log.message(pc.dim(line));
      }
      if (error.isAuthError) {
        p.log.info(
          pc.dim(
            "For private repos, ensure your SSH keys or credentials are configured.",
          ),
        );
      }
    } else {
      p.log.error(
        error instanceof Error ? error.message : "Unknown error occurred",
      );
    }
    p.outro(pc.red("Installation failed"));
    process.exit(1);
  } finally {
    if (tempDir) {
      await cleanupTempDir(tempDir);
    }
  }
}

async function addSkills(
  basePath: string,
  subpath: string | undefined,
  skillFilter: string | undefined,
  options: AddOptions,
  cwd: string,
  source: string,
  sourceType: "github" | "local" | "git" = "local",
): Promise<void> {
  const spinner = p.spinner();

  // Include internal skills when explicitly requested by name
  const includeInternal = !!(
    skillFilter ||
    (options.skill && options.skill.length > 0)
  );

  const discoverOpts: DiscoverSkillsOptions = {
    includeInternal,
    fullDepth: options.fullDepth,
  };

  spinner.start("Discovering skills...");
  let skills = await discoverSkills(basePath, subpath, discoverOpts);
  spinner.stop(`Found ${skills.length} skill(s)`);

  if (skills.length === 0) {
    p.log.warn(
      "No skills found. Skills require a SKILL.md with name and description.",
    );
    return;
  }

  // --list: show available skills and exit
  if (options.list) {
    p.log.step(pc.bold("Available Skills"));
    for (const skill of skills) {
      p.log.message(`  ${pc.cyan(getSkillDisplayName(skill))}`);
      p.log.message(`    ${pc.dim(skill.description)}`);
    }
    p.outro("Use --skill <name> to install specific skills");
    return;
  }

  // Apply skill filter from @skill syntax
  if (skillFilter) {
    skills = filterSkills(skills, [skillFilter]);
    if (skills.length === 0) {
      p.log.error(`No skill matching "${skillFilter}" found.`);
      return;
    }
  }

  // Select skills
  let selectedSkills: Skill[];

  if (options.skill?.includes("*")) {
    selectedSkills = skills;
    p.log.info(`Installing all ${skills.length} skills`);
  } else if (skills.length === 1 || options.yes) {
    selectedSkills = skills;
  } else if (options.skill && options.skill.length > 0) {
    selectedSkills = filterSkills(skills, options.skill);
    if (selectedSkills.length === 0) {
      p.log.error("No matching skills found for the given filter.");
      p.log.info("Available skills:");
      for (const s of skills) {
        p.log.message(`  - ${getSkillDisplayName(s)}`);
      }
      return;
    }
    p.log.info(
      `Selected ${selectedSkills.length} skill(s): ${selectedSkills.map((s) => pc.cyan(getSkillDisplayName(s))).join(", ")}`,
    );
  } else {
    const result = await searchMultiselect<Skill>({
      message: "Select skills to install",
      items: skills.map((s) => ({
        value: s,
        label: getSkillDisplayName(s),
        hint:
          s.description.length > 60
            ? s.description.slice(0, 57) + "..."
            : s.description,
      })),
      required: true,
    });

    if (result === cancelSymbol) {
      p.cancel("Installation cancelled");
      process.exit(0);
    }

    selectedSkills = result as Skill[];
  }

  // Select target agents
  const targetAgents = await selectTargetAgents(options);
  if (!targetAgents) return;

  // Select scope
  let isGlobal = options.global ?? false;
  const supportsGlobal = targetAgents.some(
    (a) => agents[a].globalSkillsDir !== undefined,
  );

  if (options.global === undefined && !options.yes && supportsGlobal) {
    const scope = await p.select({
      message: "Installation scope",
      options: [
        {
          value: false,
          label: "Project",
          hint: "Install in current directory (committed with your project)",
        },
        {
          value: true,
          label: "Global",
          hint: "Install in home directory (available across all projects)",
        },
      ],
    });

    if (p.isCancel(scope)) {
      p.cancel("Installation cancelled");
      process.exit(0);
    }

    isGlobal = scope as boolean;
  }

  // Check for overwrites
  const overwriteChecks = await Promise.all(
    selectedSkills.flatMap((skill) =>
      targetAgents.map(async (agent) => ({
        skillName: getSkillDisplayName(skill),
        agent,
        installed: await isSkillInstalled(
          getSkillDisplayName(skill),
          agent,
          { global: isGlobal },
        ),
      })),
    ),
  );

  const overwriteAgents = new Set<string>();
  for (const check of overwriteChecks) {
    if (check.installed) {
      overwriteAgents.add(agents[check.agent].displayName);
    }
  }

  // Show confirmation summary
  if (!options.yes) {
    p.log.info("Installation summary:");
    for (const skill of selectedSkills) {
      p.log.message(
        `  ${pc.cyan(getSkillDisplayName(skill))} - ${pc.dim(skill.description)}`,
      );
    }
    p.log.message(
      `  Agents: ${targetAgents.map((a) => agents[a].displayName).join(", ")}`,
    );
    p.log.message(`  Scope: ${isGlobal ? "global" : "project"}`);

    if (overwriteAgents.size > 0) {
      p.log.message(
        `  ${pc.yellow("Overwrites:")} ${Array.from(overwriteAgents).join(", ")}`,
      );
    }

    const confirmed = await p.confirm({
      message: "Proceed with installation?",
    });

    if (p.isCancel(confirmed) || !confirmed) {
      p.cancel("Installation cancelled");
      process.exit(0);
    }
  }

  // Install skills
  const installSpinner = p.spinner();

  for (const skill of selectedSkills) {
    for (const agentType of targetAgents) {
      installSpinner.start(
        `Installing ${getSkillDisplayName(skill)} for ${agents[agentType].displayName}...`,
      );

      const result = await installSkillForAgent(skill, agentType, {
        global: isGlobal,
        cwd,
      });

      if (result.success) {
        const shortPath = shortenPath(result.path, cwd);
        installSpinner.stop(
          `${pc.green("✓")} ${getSkillDisplayName(skill)} → ${shortPath}`,
        );
      } else {
        installSpinner.stop(
          `${pc.red("✗")} ${getSkillDisplayName(skill)} → ${agents[agentType].displayName}: ${result.error}`,
        );
      }
    }

  }

  // Compute GitHub tree SHAs for update tracking (batch call)
  const parsed = parseSource(source);
  const ownerRepo = getOwnerRepo(parsed);
  let folderHashes = new Map<string, string>();

  if (sourceType === "github" && ownerRepo) {
    const { owner, repo } = parseOwnerRepo(source) || {};
    if (owner && repo) {
      const { relative } = await import("path");
      const skillPaths = selectedSkills.map((s) =>
        relative(basePath, s.path),
      );
      folderHashes = await fetchSkillFolderHashes(
        owner,
        repo,
        skillPaths,
        parsed.ref,
      );
    }
  }

  // Update lock file for each skill
  const { relative } = await import("path");
  for (const skill of selectedSkills) {
    const lockKey = `skill:${sanitizeName(getSkillDisplayName(skill))}`;
    const skillRelPath = relative(basePath, skill.path);
    const folderHash = folderHashes.get(skillRelPath);

    await addAssetToLock(
      lockKey,
      {
        type: "skill",
        source: ownerRepo || source,
        sourceType: parsed.type,
        sourceUrl: source,
        contentHash: computeContentHash(skill.rawContent || skill.name),
        skillFolderHash: folderHash,
        skillPath: sourceType !== "local" ? skillRelPath : undefined,
      },
      isGlobal ? undefined : cwd,
    );
  }

  // Save selected agents
  await saveSelectedAgents(targetAgents, isGlobal ? undefined : cwd);

  p.log.success(
    pc.green(`Successfully installed ${selectedSkills.length} skill(s)`),
  );
}

async function addCommands(
  basePath: string,
  options: AddOptions,
  cwd: string,
  source: string,
): Promise<void> {
  const spinner = p.spinner();
  spinner.start("Discovering commands...");
  const commands = await discoverCommands(basePath);
  spinner.stop(`Found ${commands.length} command(s)`);

  if (commands.length === 0) {
    p.log.warn("No commands found in the source.");
    return;
  }

  const targetAgents = await selectTargetAgents(options);
  if (!targetAgents) return;

  const { ensureDir, writeFile } = await import("../utils/files");
  const { join } = await import("path");

  for (const cmd of commands) {
    for (const agentType of targetAgents) {
      const agent = agents[agentType];
      const commandsSubdir = agent.commandsSubdir || "commands";
      const agentDir = agent.skillsDir.split("/")[0] || agent.name;
      const targetDir = join(
        cwd,
        `.${agentDir.replace(/^\./, "")}`,
        commandsSubdir,
      );
      ensureDir(targetDir);

      const dest = join(targetDir, `${cmd.name}.md`);
      writeFile(dest, cmd.content);
      p.log.success(`Added ${agent.displayName} command: ${cmd.name}`);
    }

    const lockKey = `command:${cmd.name}`;
    await addAssetToLock(
      lockKey,
      {
        type: "command",
        source: source,
        sourceType: parseSource(source).type,
        sourceUrl: source,
        contentHash: computeContentHash(cmd.content),
      },
      cwd,
    );
  }
}

async function addRules(
  basePath: string,
  options: AddOptions,
  cwd: string,
  source: string,
): Promise<void> {
  const spinner = p.spinner();
  spinner.start("Discovering rules...");
  const rules = await discoverRules(basePath);
  spinner.stop(`Found ${rules.length} rule(s)`);

  if (rules.length === 0) {
    p.log.warn("No rules found in the source.");
    return;
  }

  const targetAgents = await selectTargetAgents(options);
  if (!targetAgents) return;

  const { ensureDir, writeFile } = await import("../utils/files");
  const { join } = await import("path");

  for (const rule of rules) {
    for (const agentType of targetAgents) {
      const agent = agents[agentType];
      const rulesSubdir = agent.rulesSubdir || "rules";
      const agentDir = agent.skillsDir.split("/")[0] || agent.name;
      const targetDir = join(
        cwd,
        `.${agentDir.replace(/^\./, "")}`,
        rulesSubdir,
      );
      ensureDir(targetDir);

      const ext = agentType === "cursor" ? ".mdc" : ".md";
      const dest = join(targetDir, `${rule.name}${ext}`);
      writeFile(dest, rule.content);
      p.log.success(`Added ${agent.displayName} rule: ${rule.name}`);
    }

    const lockKey = `rule:${rule.name}`;
    await addAssetToLock(
      lockKey,
      {
        type: "rule",
        source: source,
        sourceType: parseSource(source).type,
        sourceUrl: source,
        contentHash: computeContentHash(rule.content),
      },
      cwd,
    );
  }
}

async function selectTargetAgents(
  options: AddOptions,
): Promise<AgentType[] | null> {
  const validAgents = Object.keys(agents);

  // --agent '*' selects all agents
  if (options.agent?.includes("*")) {
    p.log.info(`Installing to all ${validAgents.length} agents`);
    return validAgents as AgentType[];
  }

  if (options.agent && options.agent.length > 0) {
    const invalidAgents = options.agent.filter(
      (a) => !validAgents.includes(a),
    );
    if (invalidAgents.length > 0) {
      p.log.error(`Invalid agents: ${invalidAgents.join(", ")}`);
      p.log.info(`Valid agents: ${validAgents.join(", ")}`);
      return null;
    }
    return options.agent as AgentType[];
  }

  const detected = await detectInstalledAgents();
  const lastSelected = await getLastSelectedAgents(process.cwd());

  // Use lock file history for pre-selection, fall back to sensible defaults.
  // Detection is shown as hints only.
  let initialSelected: AgentType[];
  if (lastSelected && lastSelected.length > 0) {
    initialSelected = lastSelected.filter((a) =>
      validAgents.includes(a),
    ) as AgentType[];
  } else {
    const defaults: AgentType[] = ["claude-code", "cursor", "opencode"];
    initialSelected = defaults.filter((a) => validAgents.includes(a));
  }

  if (options.yes) {
    return initialSelected.length > 0
      ? initialSelected
      : (["claude-code", "cursor"] as AgentType[]);
  }

  const allAgents = Object.entries(agents).map(([key, config]) => ({
    value: key as AgentType,
    label: config.displayName,
    hint: detected.includes(key as AgentType) ? "detected" : undefined,
  }));

  const result = await searchMultiselect<AgentType>({
    message: "Select target agents",
    items: allAgents,
    initialSelected,
    required: true,
  });

  if (result === cancelSymbol) {
    p.cancel("Installation cancelled");
    process.exit(0);
  }

  return result as AgentType[];
}
