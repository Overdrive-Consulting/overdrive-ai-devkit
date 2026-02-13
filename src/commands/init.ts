import * as p from "@clack/prompts";
import pc from "picocolors";
import {
  printBanner,
  printSuccess,
  printInfo,
  printSuccessBox,
} from "../utils/ui";
import { getMcpServerOptions, installMcpServers } from "../installers/mcp";
import {
  getCommandOptions,
  getSkillOptions,
  installForAgentType,
} from "../installers/shared";
import { installBeads } from "../installers/beads";
import { getRuleOptions, installRules } from "../installers/rules";
import { installContinuousClaude } from "../installers/continuous-claude";
import { installSafetyNet } from "../installers/safety-net";
import { agents, detectInstalledAgents } from "../agents";
import { loadConfig } from "../config";
import {
  searchMultiselect,
  cancelSymbol,
} from "../prompts/search-multiselect";
import {
  writeLockFile,
  readLockFile,
  addAssetToLock,
  saveSelectedAgents,
  getLastSelectedAgents,
  computeContentHash,
} from "../utils/lock";
import type { AgentType } from "../types";
import type { SearchItem } from "../prompts/search-multiselect";

export async function runInit() {
  await printBanner();

  const targetDir = process.cwd();

  // Load devkit.config.ts to filter agent pool
  const config = await loadConfig(targetDir);

  // Step 1: Select AI tools (40+ agents with fuzzy search)
  const detectedAgents = await detectInstalledAgents();

  let agentPool = Object.entries(agents);

  // If config restricts agents, filter the pool
  if (config?.agents && config.agents.length > 0) {
    const allowedSet = new Set(config.agents);
    agentPool = agentPool.filter(([key]) => allowedSet.has(key as AgentType));
  }

  const agentItems: SearchItem<AgentType>[] = agentPool.map(
    ([key, config]) => ({
      value: key as AgentType,
      label: config.displayName,
      hint: detectedAgents.includes(key as AgentType)
        ? "detected"
        : undefined,
    }),
  );

  // Use lock file history for pre-selection, fall back to sensible defaults.
  // Detection is shown as hints only — NOT used for pre-selection (too many false positives).
  const lastSelected = await getLastSelectedAgents(targetDir).catch(
    () => null,
  );
  const agentPoolKeys = agentPool.map(([key]) => key);

  let initialSelected: AgentType[];
  if (lastSelected && lastSelected.length > 0) {
    initialSelected = lastSelected.filter((a) =>
      agentPoolKeys.includes(a),
    ) as AgentType[];
  } else {
    // Sensible defaults for first-time use
    const defaults: AgentType[] = ["claude-code", "cursor", "opencode"];
    initialSelected = defaults.filter((a) => agentPoolKeys.includes(a));
  }

  const selectedTools = await searchMultiselect<AgentType>({
    message: "Which AI tools do you want to configure?",
    items: agentItems,
    initialSelected,
    required: true,
    hintText: "↑↓ move, space select, enter confirm — type to filter",
  });

  if (selectedTools === cancelSymbol) {
    p.cancel("Setup cancelled");
    process.exit(0);
  }

  const selectedAgents = selectedTools as AgentType[];

  const forClaude = selectedAgents.includes("claude-code");
  const forCursor = selectedAgents.includes("cursor");
  const forOpencode = selectedAgents.includes("opencode");

  // Step 2: Select MCP servers (with search)
  const mcpOptions = getMcpServerOptions();
  const mcpItems: SearchItem<string>[] = mcpOptions.map((opt) => ({
    value: opt.value,
    label: opt.label,
    hint: opt.hint,
  }));

  const mcpResult = await searchMultiselect<string>({
    message: "Which MCP servers do you want to add?",
    items: mcpItems,
    hintText: "↑↓ move, space select, enter confirm — type to filter",
  });

  if (mcpResult === cancelSymbol) {
    p.cancel("Setup cancelled");
    process.exit(0);
  }

  const mcpServers = mcpResult as string[];

  // Step 3: Select skills (with search)
  let selectedSkills: string[] = [];
  const skillOptions = getSkillOptions();
  if (skillOptions.length > 0) {
    const skillItems: SearchItem<string>[] = skillOptions.map((opt) => ({
      value: opt.value,
      label: opt.label,
      hint: opt.hint,
    }));

    const skillResult = await searchMultiselect<string>({
      message: "Which skills do you want to install?",
      items: skillItems,
      hintText: "↑↓ move, space select, enter confirm — type to filter",
    });

    if (skillResult === cancelSymbol) {
      p.cancel("Setup cancelled");
      process.exit(0);
    }

    selectedSkills = skillResult as string[];
  }

  // Step 4: Select commands (with search)
  const commandOptions = getCommandOptions();
  const commandItems: SearchItem<string>[] = commandOptions.map((opt) => ({
    value: opt.value,
    label: `/${opt.label}`,
    hint: opt.hint,
  }));

  const commandResult = await searchMultiselect<string>({
    message: "Which commands do you want to install?",
    items: commandItems,
    hintText: "↑↓ move, space select, enter confirm — type to filter",
  });

  if (commandResult === cancelSymbol) {
    p.cancel("Setup cancelled");
    process.exit(0);
  }

  const selectedCommands = commandResult as string[];

  // Step 5: Select rules (with search)
  let selectedRules: string[] = [];
  const ruleOptions = getRuleOptions();
  if (ruleOptions.length > 0) {
    const ruleItems: SearchItem<string>[] = ruleOptions.map((opt) => ({
      value: opt.value,
      label: opt.label,
      hint: opt.hint,
    }));

    const ruleResult = await searchMultiselect<string>({
      message: "Which rules do you want to install?",
      items: ruleItems,
      hintText: "↑↓ move, space select, enter confirm — type to filter",
    });

    if (ruleResult === cancelSymbol) {
      p.cancel("Setup cancelled");
      process.exit(0);
    }

    selectedRules = ruleResult as string[];
  }

  // Step 6: Beads setup (keep as @clack/prompts)
  const beadsChoice = await p.select({
    message: "Set up beads (issue tracker for AI agents)?",
    options: [
      {
        value: "full",
        label: "Full CLI + Integration (Recommended)",
        hint: "Install bd binary, init beads, configure hooks",
      },
      {
        value: "mcp",
        label: "MCP Server Only",
        hint: "Just configure beads-mcp, install bd manually",
      },
      {
        value: "skip",
        label: "Skip",
        hint: "Don't set up beads",
      },
    ],
  });

  if (p.isCancel(beadsChoice)) {
    p.cancel("Setup cancelled");
    process.exit(0);
  }

  // Step 7: Continuous Claude (Claude Code only)
  let continuousClaudeChoice = false;
  if (forClaude) {
    const ccChoice = await p.confirm({
      message:
        "Set up Continuous Claude (session continuity & handoffs)? [Claude Code only]",
    });

    if (p.isCancel(ccChoice)) {
      p.cancel("Setup cancelled");
      process.exit(0);
    }

    continuousClaudeChoice = ccChoice;
  }

  // Step 8: Safety Net (Claude Code only)
  let safetyNetChoice = false;
  if (forClaude) {
    const snChoice = await p.confirm({
      message:
        "Set up Safety Net (blocks destructive commands)? [Claude Code only]",
    });

    if (p.isCancel(snChoice)) {
      p.cancel("Setup cancelled");
      process.exit(0);
    }

    safetyNetChoice = snChoice;
  }

  // Confirmation summary
  printInfo("Summary:");
  printInfo(`  Target: ${targetDir}`);
  printInfo(
    `  Tools: ${selectedAgents.map((a) => agents[a].displayName).join(", ")}`,
  );
  if (mcpServers.length > 0) {
    printInfo(`  MCP: ${mcpServers.join(", ")}`);
  }
  if (selectedSkills.length > 0) {
    printInfo(`  Skills: ${selectedSkills.join(", ")}`);
  }
  if (selectedCommands.length > 0) {
    printInfo(
      `  Commands: ${selectedCommands.map((c) => `/${c}`).join(", ")}`,
    );
  }
  if (selectedRules.length > 0) {
    printInfo(`  Rules: ${selectedRules.join(", ")}`);
  }
  printInfo(`  Beads: ${beadsChoice}`);
  if (forClaude) {
    printInfo(
      `  Continuous Claude: ${continuousClaudeChoice ? "yes" : "no"}`,
    );
    printInfo(`  Safety Net: ${safetyNetChoice ? "yes" : "no"}`);
  }

  const confirm = await p.confirm({
    message: "Proceed with installation?",
  });

  if (p.isCancel(confirm) || !confirm) {
    p.cancel("Setup cancelled");
    process.exit(0);
  }

  // Execute installation
  const spinner = p.spinner();

  // Install MCP servers
  if (mcpServers.length > 0) {
    spinner.start("Installing MCP servers...");
    installMcpServers({
      targetDir,
      serverKeys: mcpServers,
      forClaude,
      forCursor,
      forOpencode,
    });
    spinner.stop("MCP servers configured");
  }

  // Install for each selected agent
  for (const agentType of selectedAgents) {
    const agent = agents[agentType];
    spinner.start(`Installing ${agent.displayName} components...`);

    installForAgentType(agentType, {
      targetDir,
      commands: selectedCommands,
      skills: selectedSkills,
    });

    spinner.stop(`${agent.displayName} configured`);
  }

  // Install rules
  if (selectedRules.length > 0) {
    spinner.start("Installing rules...");
    installRules({
      targetDir,
      rules: selectedRules,
      forClaude,
      forCursor,
      forOpencode,
    });
    spinner.stop("Rules configured");
  }

  // Install beads
  if (beadsChoice !== "skip") {
    await installBeads({
      targetDir,
      mode: beadsChoice as "full" | "mcp",
      forClaude,
      forCursor,
      forOpencode,
    });
  }

  // Install continuous-claude
  if (continuousClaudeChoice && forClaude) {
    spinner.start("Setting up Continuous Claude...");
    await installContinuousClaude({
      targetDir,
      install: continuousClaudeChoice,
      forClaude,
    });
    spinner.stop("Continuous Claude configured");
  }

  // Install safety-net
  if (safetyNetChoice && forClaude) {
    spinner.start("Setting up Safety Net...");
    await installSafetyNet({
      targetDir,
      install: safetyNetChoice,
      forClaude,
    });
    spinner.stop("Safety Net configured");
  }

  // Step 9: Write lock file
  spinner.start("Writing lock file...");

  for (const skill of selectedSkills) {
    await addAssetToLock(
      `skill:${skill}`,
      {
        type: "skill",
        source: "bundled",
        sourceType: "bundled",
        sourceUrl: "@enteroverdrive/ai-devkit",
        contentHash: computeContentHash(skill),
      },
      targetDir,
    );
  }

  for (const cmd of selectedCommands) {
    await addAssetToLock(
      `command:${cmd}`,
      {
        type: "command",
        source: "bundled",
        sourceType: "bundled",
        sourceUrl: "@enteroverdrive/ai-devkit",
        contentHash: computeContentHash(cmd),
      },
      targetDir,
    );
  }

  for (const rule of selectedRules) {
    await addAssetToLock(
      `rule:${rule}`,
      {
        type: "rule",
        source: "bundled",
        sourceType: "bundled",
        sourceUrl: "@enteroverdrive/ai-devkit",
        contentHash: computeContentHash(rule),
      },
      targetDir,
    );
  }

  for (const mcp of mcpServers) {
    await addAssetToLock(
      `mcp:${mcp}`,
      {
        type: "mcp",
        source: "bundled",
        sourceType: "bundled",
        sourceUrl: "@enteroverdrive/ai-devkit",
        contentHash: computeContentHash(mcp),
      },
      targetDir,
    );
  }

  await saveSelectedAgents(selectedAgents, targetDir);

  spinner.stop("Lock file written");

  const summaryLines = ["✓ AI DevKit setup complete!"];
  if (mcpServers.includes("supabase")) {
    summaryLines.push("");
    summaryLines.push("Don't forget to set SUPABASE_ACCESS_TOKEN");
  }
  printSuccessBox(summaryLines);
}
