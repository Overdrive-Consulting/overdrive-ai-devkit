import pc from "picocolors";
import { homedir } from "os";
import { sep } from "path";
import { readLockFile } from "../utils/lock";
import { listInstalledSkills } from "../installers/skill-installer";
import { agents } from "../agents";
import type { AgentType } from "../types";

interface ListOptions {
  global?: boolean;
  agent?: string[];
  type?: string;
}

function parseListArgs(args: string[]): ListOptions {
  const options: ListOptions = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;

    if (arg === "-g" || arg === "--global") {
      options.global = true;
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
    } else if (
      !arg.startsWith("-") &&
      ["skill", "command", "rule", "mcp"].includes(arg)
    ) {
      options.type = arg;
    }
  }

  return options;
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

function formatList(items: string[], maxShow = 5): string {
  if (items.length <= maxShow) {
    return items.join(", ");
  }
  const shown = items.slice(0, maxShow);
  const remaining = items.length - maxShow;
  return `${shown.join(", ")} +${remaining} more`;
}

export async function runList(args: string[]): Promise<void> {
  const options = parseListArgs(args);
  const cwd = process.cwd();
  const isGlobal = options.global ?? false;

  // Validate agent filter
  let agentFilter: AgentType[] | undefined;
  if (options.agent && options.agent.length > 0) {
    const validAgents = Object.keys(agents);
    const invalidAgents = options.agent.filter(
      (a) => !validAgents.includes(a),
    );
    if (invalidAgents.length > 0) {
      console.log(pc.yellow(`Invalid agents: ${invalidAgents.join(", ")}`));
      process.exit(1);
    }
    agentFilter = options.agent as AgentType[];
  }

  // Read lock file for non-skill assets
  const lock = await readLockFile(isGlobal ? undefined : cwd);
  const scopeLabel = isGlobal ? "Global" : "Project";

  let hasOutput = false;

  // List assets from lock file
  if (!options.type || options.type !== "skill") {
    const assetKeys = Object.keys(lock.assets).sort();
    const filteredKeys = options.type
      ? assetKeys.filter((k) => k.startsWith(`${options.type}:`))
      : assetKeys;

    if (filteredKeys.length > 0) {
      console.log(pc.bold(`\n${scopeLabel} Assets (from lock file)`));
      console.log();

      for (const key of filteredKeys) {
        const entry = lock.assets[key]!;
        const [assetType, ...nameParts] = key.split(":");
        const name = nameParts.join(":");
        console.log(
          `${pc.cyan(name)} ${pc.dim(`[${assetType}]`)}  ${pc.dim(entry.source)}`,
        );
      }
      console.log();
      hasOutput = true;
    }
  }

  // List skills from filesystem
  if (!options.type || options.type === "skill") {
    const installedSkills = await listInstalledSkills({
      global: isGlobal,
      agentFilter,
    });

    if (installedSkills.length > 0) {
      console.log(pc.bold(`\n${scopeLabel} Skills`));
      console.log();

      for (const skill of installedSkills) {
        const shortPath = shortenPath(skill.path, cwd);
        const agentNames = skill.agents.map(
          (a) => agents[a].displayName,
        );
        const agentInfo =
          skill.agents.length > 0
            ? formatList(agentNames)
            : pc.yellow("not linked");

        console.log(
          `${pc.cyan(skill.name)} ${pc.dim(`[skill]`)}  ${pc.dim(shortPath)}`,
        );
        console.log(`  Agents: ${agentInfo}`);
      }
      console.log();
      hasOutput = true;
    }
  }

  if (!hasOutput) {
    console.log(
      pc.dim(`\nNo ${scopeLabel.toLowerCase()} assets found.`),
    );
    if (isGlobal) {
      console.log(pc.dim("Try listing project assets without -g"));
    } else {
      console.log(pc.dim("Try listing global assets with -g"));
    }
  }
}
