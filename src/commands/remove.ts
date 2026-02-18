import * as p from "@clack/prompts";
import pc from "picocolors";
import { readdir, rm, lstat } from "fs/promises";
import { join } from "path";
import { homedir } from "os";
import { agents, detectInstalledAgents } from "../agents";
import {
  readLockFile,
  removeAssetFromLock,
} from "../utils/lock";
import {
  getInstallPath,
  sanitizeName,
} from "../installers/skill-installer";
import { AGENTS_DIR, SKILLS_SUBDIR } from "../constants";
import type { AgentType, AssetType } from "../types";

interface RemoveOptions {
  global?: boolean;
  yes?: boolean;
  agent?: string[];
  all?: boolean;
}

function parseRemoveArgs(args: string[]): {
  type?: AssetType;
  names: string[];
  options: RemoveOptions;
} {
  const options: RemoveOptions = {};
  const positional: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;

    if (arg === "-g" || arg === "--global") {
      options.global = true;
    } else if (arg === "-y" || arg === "--yes") {
      options.yes = true;
    } else if (arg === "--all") {
      options.all = true;
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

  let type: AssetType | undefined;
  let names: string[] = [];

  if (positional.length > 0) {
    const maybeType = positional[0]!;
    if (["skill", "command", "rule", "mcp"].includes(maybeType)) {
      type = maybeType as AssetType;
      names = positional.slice(1);
    } else {
      names = positional;
    }
  }

  return { type, names, options };
}

export async function runRemove(args: string[]): Promise<void> {
  const { type, names, options } = parseRemoveArgs(args);
  const isGlobal = options.global ?? false;
  const cwd = process.cwd();

  const spinner = p.spinner();
  spinner.start("Scanning for installed assets...");

  // Scan lock file for installed assets
  const lock = await readLockFile(isGlobal ? undefined : cwd);
  let assetKeys = Object.keys(lock.assets);

  // Filter by type if specified
  if (type) {
    assetKeys = assetKeys.filter((key) => key.startsWith(`${type}:`));
  }

  // Also scan filesystem for skills not in lock file
  const skillNamesSet = new Set<string>();
  const scanDir = async (dir: string) => {
    try {
      const entries = await readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          skillNamesSet.add(entry.name);
        }
      }
    } catch {
      // Directory doesn't exist
    }
  };

  if (!type || type === "skill") {
    const canonicalDir = isGlobal
      ? join(homedir(), AGENTS_DIR, SKILLS_SUBDIR)
      : join(cwd, AGENTS_DIR, SKILLS_SUBDIR);
    await scanDir(canonicalDir);

    for (const agent of Object.values(agents)) {
      const agentDir = isGlobal
        ? agent.globalSkillsDir
        : join(cwd, agent.skillsDir);
      if (agentDir) await scanDir(agentDir);
    }
  }

  // Merge lock file assets and filesystem skills
  const allAssets = new Set([
    ...assetKeys,
    ...Array.from(skillNamesSet).map((n) => `skill:${n}`),
  ]);

  const sortedAssets = Array.from(allAssets).sort();
  spinner.stop(`Found ${sortedAssets.length} installed asset(s)`);

  if (sortedAssets.length === 0) {
    p.outro(pc.yellow("No assets found to remove."));
    return;
  }

  // Select assets to remove
  let selectedAssets: string[];

  if (options.all) {
    selectedAssets = sortedAssets;
  } else if (names.length > 0) {
    const normalizedNames = names.map((n) => n.toLowerCase());
    selectedAssets = sortedAssets.filter((key) => {
      const assetName = key.split(":").slice(1).join(":");
      return normalizedNames.some(
        (n) => n === assetName.toLowerCase() || n === key.toLowerCase(),
      );
    });

    if (selectedAssets.length === 0) {
      p.log.error(`No matching assets found for: ${names.join(", ")}`);
      return;
    }
  } else {
    const choices = sortedAssets.map((key) => ({
      value: key,
      label: key,
    }));

    const selected = await p.multiselect({
      message: `Select assets to remove ${pc.dim("(space to toggle)")}`,
      options: choices,
      required: true,
    });

    if (p.isCancel(selected)) {
      p.cancel("Removal cancelled");
      process.exit(0);
    }

    selectedAssets = selected as string[];
  }

  // Validate and detect target agents
  let targetAgents: AgentType[];
  if (options.agent && options.agent.length > 0) {
    const validAgents = Object.keys(agents);
    const invalidAgents = options.agent.filter(
      (a) => !validAgents.includes(a),
    );
    if (invalidAgents.length > 0) {
      p.log.error(`Invalid agents: ${invalidAgents.join(", ")}`);
      p.log.info(`Valid agents: ${validAgents.join(", ")}`);
      process.exit(1);
    }
    targetAgents = options.agent as AgentType[];
  } else {
    targetAgents = await detectInstalledAgents();
    if (targetAgents.length === 0) {
      targetAgents = Object.keys(agents) as AgentType[];
    }
  }

  // Confirm
  if (!options.yes) {
    p.log.info("Assets to remove:");
    for (const asset of selectedAssets) {
      p.log.message(`  ${pc.red("•")} ${asset}`);
    }

    const confirmed = await p.confirm({
      message: `Remove ${selectedAssets.length} asset(s)?`,
    });

    if (p.isCancel(confirmed) || !confirmed) {
      p.cancel("Removal cancelled");
      process.exit(0);
    }
  }

  // Remove assets
  spinner.start("Removing assets...");

  let successCount = 0;
  let failCount = 0;

  for (const assetKey of selectedAssets) {
    try {
      const [assetType, ...nameParts] = assetKey.split(":");
      const assetName = nameParts.join(":");

      if (assetType === "skill") {
        // Remove from all agent directories
        for (const agentKey of targetAgents) {
          const skillPath = getInstallPath(assetName, agentKey, {
            global: isGlobal,
            cwd,
          });

          try {
            const stats = await lstat(skillPath).catch(() => null);
            if (stats) {
              await rm(skillPath, { recursive: true, force: true });
            }
          } catch {
            // Ignore individual failures
          }
        }

        // Remove from canonical directory
        const canonicalBase = isGlobal
          ? join(homedir(), AGENTS_DIR, SKILLS_SUBDIR)
          : join(cwd, AGENTS_DIR, SKILLS_SUBDIR);
        const canonicalPath = join(canonicalBase, sanitizeName(assetName));
        await rm(canonicalPath, { recursive: true, force: true }).catch(
          () => {},
        );
      } else if (assetType === "command") {
        if (isGlobal) {
          p.log.error(
            `Global removal for commands is not supported yet: ${assetName}`,
          );
          failCount++;
          continue;
        }

        for (const agentKey of targetAgents) {
          const agent = agents[agentKey];
          const commandsSubdir = agent.commandsSubdir || "commands";
          const agentDir = agent.skillsDir.split("/")[0] || agent.name;
          const commandPath = join(
            cwd,
            `.${agentDir.replace(/^\./, "")}`,
            commandsSubdir,
            `${assetName}.md`,
          );
          await rm(commandPath, { force: true }).catch(() => {});
        }
      } else if (assetType === "rule") {
        if (isGlobal) {
          p.log.error(
            `Global removal for rules is not supported yet: ${assetName}`,
          );
          failCount++;
          continue;
        }

        for (const agentKey of targetAgents) {
          const agent = agents[agentKey];
          const rulesSubdir = agent.rulesSubdir || "rules";
          const agentDir = agent.skillsDir.split("/")[0] || agent.name;
          const ext = agentKey === "cursor" ? ".mdc" : ".md";
          const rulePath = join(
            cwd,
            `.${agentDir.replace(/^\./, "")}`,
            rulesSubdir,
            `${assetName}${ext}`,
          );
          await rm(rulePath, { force: true }).catch(() => {});
        }
      }

      // Remove from lock file
      await removeAssetFromLock(
        assetKey,
        isGlobal ? undefined : cwd,
      );

      successCount++;
    } catch {
      failCount++;
    }
  }

  spinner.stop("Removal complete");

  if (successCount > 0) {
    p.log.success(pc.green(`Removed ${successCount} asset(s)`));
  }
  if (failCount > 0) {
    p.log.error(pc.red(`Failed to remove ${failCount} asset(s)`));
  }

  p.outro(pc.green("Done!"));
}
