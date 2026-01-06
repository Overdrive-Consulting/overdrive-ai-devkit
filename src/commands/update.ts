import * as p from "@clack/prompts";
import { printBanner, printInfo, printSuccess, printWarning } from "../utils/ui";
import { getProjectRoot, readFile, fileExists } from "../utils/files";
import { join } from "path";
import { readdirSync } from "fs";

interface UpdateItem {
  type: "command" | "skill" | "mcp";
  name: string;
  status: "new" | "updated" | "unchanged";
  localPath?: string;
  registryPath: string;
}

function compareFiles(localPath: string, registryPath: string): "new" | "updated" | "unchanged" {
  if (!fileExists(localPath)) {
    return "new";
  }

  const localContent = readFile(localPath);
  const registryContent = readFile(registryPath);

  if (localContent === registryContent) {
    return "unchanged";
  }

  return "updated";
}

function findUpdates(targetDir: string): UpdateItem[] {
  const root = getProjectRoot();
  const updates: UpdateItem[] = [];

  // Check commands
  const commandsDir = join(root, "commands");
  try {
    const commands = readdirSync(commandsDir).filter(f => f.endsWith(".md"));
    for (const cmd of commands) {
      const name = cmd.replace(".md", "");
      const registryPath = join(commandsDir, cmd);

      // Check Claude
      const claudePath = join(targetDir, ".claude", "commands", cmd);
      if (fileExists(join(targetDir, ".claude"))) {
        updates.push({
          type: "command",
          name: `${name} (Claude)`,
          status: compareFiles(claudePath, registryPath),
          localPath: claudePath,
          registryPath,
        });
      }

      // Check Cursor
      const cursorPath = join(targetDir, ".cursor", "commands", cmd);
      if (fileExists(join(targetDir, ".cursor"))) {
        updates.push({
          type: "command",
          name: `${name} (Cursor)`,
          status: compareFiles(cursorPath, registryPath),
          localPath: cursorPath,
          registryPath,
        });
      }
    }
  } catch {
    // No commands directory
  }

  // Check skills
  const skillsDir = join(root, "skills");
  try {
    const skills = readdirSync(skillsDir);
    for (const skill of skills) {
      const registryPath = join(skillsDir, skill, "SKILL.md");
      const localPath = join(targetDir, ".claude", "skills", skill, "SKILL.md");

      if (fileExists(join(targetDir, ".claude"))) {
        updates.push({
          type: "skill",
          name: skill,
          status: compareFiles(localPath, registryPath),
          localPath,
          registryPath,
        });
      }
    }
  } catch {
    // No skills directory
  }

  return updates;
}

export async function runUpdate() {
  printBanner();

  const targetDir = process.cwd();

  printInfo("Checking for updates...");

  const updates = findUpdates(targetDir);

  const newItems = updates.filter(u => u.status === "new");
  const updatedItems = updates.filter(u => u.status === "updated");
  const unchangedItems = updates.filter(u => u.status === "unchanged");

  if (newItems.length === 0 && updatedItems.length === 0) {
    printSuccess("Everything is up to date!");
    return;
  }

  // Show what's available
  if (newItems.length > 0) {
    printSuccess("New items available:");
    for (const item of newItems) {
      printSuccess(`  + ${item.name}`);
    }
  }

  if (updatedItems.length > 0) {
    printWarning("Updates available:");
    for (const item of updatedItems) {
      printWarning(`  ~ ${item.name}`);
    }
  }

  if (unchangedItems.length > 0) {
    printInfo(`${unchangedItems.length} items unchanged`);
  }

  // Ask what to update
  const toUpdate = await p.multiselect({
    message: "Select items to update:",
    options: [...newItems, ...updatedItems].map(item => ({
      value: item,
      label: item.name,
      hint: item.status === "new" ? "new" : "updated",
    })),
    required: false,
  });

  if (p.isCancel(toUpdate) || (toUpdate as UpdateItem[]).length === 0) {
    printInfo("No updates applied");
    return;
  }

  // Apply updates
  const spinner = p.spinner();
  spinner.start("Applying updates...");

  for (const item of toUpdate as UpdateItem[]) {
    if (item.localPath) {
      const content = readFile(item.registryPath);
      const { writeFile } = await import("../utils/files");
      writeFile(item.localPath, content);
    }
  }

  spinner.stop("Updates applied");

  printSuccess(`Updated ${(toUpdate as UpdateItem[]).length} items`);
}
