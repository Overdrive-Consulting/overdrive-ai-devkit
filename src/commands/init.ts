import * as p from "@clack/prompts";
import pc from "picocolors";
import { printBanner, printSuccess, printInfo, printSuccessBox } from "../utils/ui";
import { getMcpServerOptions, installMcpServers } from "../installers/mcp";
import { getCommandOptions, getSkillOptions, installClaude } from "../installers/claude";
import { installCursor } from "../installers/cursor";
import { installOpencode } from "../installers/opencode";
import { installBeads } from "../installers/beads";
import { getRuleOptions, installRules } from "../installers/rules";
import { installContinuousClaude } from "../installers/continuous-claude";
import { installSafetyNet } from "../installers/safety-net";

export async function runInit() {
  await printBanner();

  const targetDir = process.cwd();

  // Step 1: Select AI tools
  const tools = await p.multiselect({
    message: "Which AI tools do you want to configure?",
    options: [
      {
        value: "claude",
        label: "Claude Code",
        hint: "Commands, skills, MCP servers, settings",
      },
      {
        value: "cursor",
        label: "Cursor",
        hint: "Commands, MCP servers, rules",
      },
      {
        value: "opencode",
        label: "OpenCode",
        hint: "Commands, skills, rules (AGENTS.md)",
      },
    ],
    required: true,
  });

  if (p.isCancel(tools)) {
    p.cancel("Setup cancelled");
    process.exit(0);
  }

  const forClaude = (tools as string[]).includes("claude");
  const forCursor = (tools as string[]).includes("cursor");
  const forOpencode = (tools as string[]).includes("opencode");

  // Step 2: Select MCP servers
  const mcpOptions = getMcpServerOptions();
  const mcpServers = await p.multiselect({
    message: "Which MCP servers do you want to add?",
    options: mcpOptions.map(opt => ({
      value: opt.value,
      label: opt.label,
      hint: opt.hint,
    })),
    required: false,
  });

  if (p.isCancel(mcpServers)) {
    p.cancel("Setup cancelled");
    process.exit(0);
  }

  // Step 3: Select skills (if Claude or OpenCode selected)
  let selectedSkills: string[] = [];
  if (forClaude || forOpencode) {
    const skillOptions = getSkillOptions();
    if (skillOptions.length > 0) {
      const skills = await p.multiselect({
        message: "Which skills do you want to install?",
        options: skillOptions.map(opt => ({
          value: opt.value,
          label: opt.label,
          hint: opt.hint,
        })),
        required: false,
      });

      if (p.isCancel(skills)) {
        p.cancel("Setup cancelled");
        process.exit(0);
      }

      selectedSkills = skills as string[];
    }
  }

  // Step 4: Select commands
  const commandOptions = getCommandOptions();
  const commands = await p.multiselect({
    message: "Which commands do you want to install?",
    options: commandOptions.map(opt => ({
      value: opt.value,
      label: `/${opt.label}`,
      hint: opt.hint,
    })),
    required: false,
  });

  if (p.isCancel(commands)) {
    p.cancel("Setup cancelled");
    process.exit(0);
  }

  const selectedCommands = commands as string[];

  // Step 5: Select rules (for both Claude and Cursor)
  let selectedRules: string[] = [];
  const ruleOptions = getRuleOptions();
  if (ruleOptions.length > 0) {
    const rules = await p.multiselect({
      message: "Which rules do you want to install?",
      options: ruleOptions.map(opt => ({
        value: opt.value,
        label: opt.label,
        hint: opt.hint,
      })),
      required: false,
    });

    if (p.isCancel(rules)) {
      p.cancel("Setup cancelled");
      process.exit(0);
    }

    selectedRules = rules as string[];
  }

  // Step 6: Beads setup
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

  // Step 7: Continuous Claude setup (Claude Code only)
  let continuousClaudeChoice = false;
  if (forClaude) {
    const ccChoice = await p.confirm({
      message: "Set up Continuous Claude (session continuity & handoffs)? [Claude Code only]",
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
      message: "Set up Safety Net (blocks destructive commands)? [Claude Code only]",
    });

    if (p.isCancel(snChoice)) {
      p.cancel("Setup cancelled");
      process.exit(0);
    }

    safetyNetChoice = snChoice;
  }

  // Step 9: Confirmation
  printInfo("Summary:");
  printInfo(`  Target: ${targetDir}`);
  printInfo(`  Tools: ${(tools as string[]).join(", ")}`);
  if ((mcpServers as string[]).length > 0) {
    printInfo(`  MCP: ${(mcpServers as string[]).join(", ")}`);
  }
  if (selectedSkills.length > 0) {
    printInfo(`  Skills: ${selectedSkills.join(", ")}`);
  }
  if (selectedCommands.length > 0) {
    printInfo(`  Commands: ${selectedCommands.map(c => `/${c}`).join(", ")}`);
  }
  if (selectedRules.length > 0) {
    printInfo(`  Rules: ${selectedRules.join(", ")}`);
  }
  printInfo(`  Beads: ${beadsChoice}`);
  if (forClaude) {
    printInfo(`  Continuous Claude: ${continuousClaudeChoice ? "yes" : "no"}`);
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
  if ((mcpServers as string[]).length > 0) {
    spinner.start("Installing MCP servers...");
    installMcpServers({
      targetDir,
      serverKeys: mcpServers as string[],
      forClaude,
      forCursor,
      forOpencode,
    });
    spinner.stop("MCP servers configured");
  }

  // Install Claude components
  if (forClaude) {
    spinner.start("Installing Claude Code components...");
    installClaude({
      targetDir,
      commands: selectedCommands,
      skills: selectedSkills,
    });
    spinner.stop("Claude Code configured");
  }

  // Install Cursor components
  if (forCursor) {
    spinner.start("Installing Cursor components...");
    installCursor({
      targetDir,
      commands: selectedCommands,
    });
    spinner.stop("Cursor configured");
  }

  // Install OpenCode components
  if (forOpencode) {
    spinner.start("Installing OpenCode components...");
    installOpencode({
      targetDir,
      commands: selectedCommands,
      skills: selectedSkills,
    });
    spinner.stop("OpenCode configured");
  }

  // Install rules (for Claude, Cursor, and OpenCode)
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

  // Install beads (no spinner - installBeads has its own interactive output)
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

  const summaryLines = ["✓ AI DevKit setup complete!"];
  if ((mcpServers as string[]).includes("supabase")) {
    summaryLines.push("");
    summaryLines.push("Don't forget to set SUPABASE_ACCESS_TOKEN");
  }
  printSuccessBox(summaryLines);
}
