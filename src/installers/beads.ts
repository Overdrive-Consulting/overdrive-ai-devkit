import { join } from "path";
import { execa } from "execa";
import { printSuccess, printError, printInfo, printWarning } from "../utils/ui";
import { appendMarkdownIfNew } from "../utils/merge";

async function isBdInstalled(): Promise<boolean> {
  try {
    await execa("bd", ["--version"]);
    return true;
  } catch {
    return false;
  }
}

async function isGitRepo(targetDir: string): Promise<boolean> {
  try {
    await execa("git", ["rev-parse", "--git-dir"], { cwd: targetDir });
    return true;
  } catch {
    return false;
  }
}

export interface InstallBeadsOptions {
  targetDir: string;
  mode: "full" | "mcp" | "skip";
  forClaude: boolean;
  forCursor: boolean;
  forOpencode: boolean;
}

export async function installBeads(options: InstallBeadsOptions): Promise<boolean> {
  const { targetDir, mode, forClaude, forCursor, forOpencode } = options;

  if (mode === "skip") {
    return true;
  }

  if (mode === "mcp") {
    printInfo("To use beads MCP server, install it with:");
    printInfo("  uv tool install beads-mcp");
    printInfo("  # or: pip install beads-mcp");
    printInfo("Then add to your MCP config:");
    printInfo('  { "beads": { "command": "beads-mcp" } }');
    return true;
  }

  // Full installation
  const bdInstalled = await isBdInstalled();

  if (!bdInstalled) {
    printWarning("bd (beads CLI) is not installed");
    printInfo("Install it with one of:");
    printInfo("  brew install beads-dev/tap/bd");
    printInfo("  # or: curl -fsSL https://beads.dev/install.sh | sh");
    printInfo("After installing, run 'adk init' again to complete beads setup");
    return false;
  }

  // Common execa options: ignore stdin to prevent interactive prompts from hanging
  // but still show stdout/stderr for progress output
  const nonInteractiveOpts = {
    cwd: targetDir,
    stdio: ["ignore", "inherit", "inherit"] as const,
  };

  // Initialize beads (skip hooks here, we'll install them separately)
  try {
    printInfo("Initializing beads...");
    await execa("bd", ["init", "--skip-hooks"], nonInteractiveOpts);
    printSuccess("Beads initialized");
  } catch (error) {
    printError("Failed to initialize beads");
    return false;
  }

  // Run tool-specific setup
  if (forClaude) {
    try {
      printInfo("Setting up beads for Claude Code...");
      await execa("bd", ["setup", "claude"], nonInteractiveOpts);
      printSuccess("Beads Claude Code integration configured");
    } catch (error) {
      printWarning("Failed to configure beads for Claude Code");
    }
  }

  if (forCursor) {
    try {
      printInfo("Setting up beads for Cursor...");
      await execa("bd", ["setup", "cursor"], nonInteractiveOpts);
      printSuccess("Beads Cursor integration configured");
    } catch (error) {
      printWarning("Failed to configure beads for Cursor");
    }
  }

  // OpenCode: bd setup opencode is not supported, so we add instructions to AGENTS.md
  if (forOpencode) {
    printInfo("Setting up beads for OpenCode...");
    const agentsPath = join(targetDir, "AGENTS.md");
    const beadsInstructions = `<!-- adk-beads -->
## Beads Issue Tracker

Use the \`bd\` CLI for task tracking. Essential commands:
- \`bd ready\` - List tasks with no open blockers
- \`bd create "Title" -p 0\` - Create a P0 task
- \`bd show <id>\` - View task details
- \`bd close <id>\` - Close completed task

For more commands, run \`bd help\`.
`;
    if (appendMarkdownIfNew(agentsPath, beadsInstructions, "<!-- adk-beads -->")) {
      printSuccess("Beads instructions added to AGENTS.md");
    } else {
      printInfo("Beads instructions already in AGENTS.md");
    }
  }

  // Install git hooks if in a git repo
  const isGit = await isGitRepo(targetDir);
  if (isGit) {
    try {
      printInfo("Installing beads git hooks...");
      // Use --force to overwrite without prompting
      await execa("bd", ["hooks", "install", "--shared", "--force"], nonInteractiveOpts);
      printSuccess("Beads git hooks installed");
    } catch (error) {
      printWarning("Failed to install beads git hooks (run 'bd hooks install --shared' manually)");
    }
  }

  return true;
}
