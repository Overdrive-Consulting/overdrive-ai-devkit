import { join } from "path";
import { readdirSync, statSync } from "fs";
import { copyFile, ensureDir, fileExists, getProjectRoot, readFile } from "../utils/files";
import { printSuccess, printInfo } from "../utils/ui";

export interface InstallOpencodeOptions {
  targetDir: string;
  commands: string[];
  skills: string[];
}

export function installOpencode(options: InstallOpencodeOptions) {
  const { targetDir, commands, skills } = options;
  const root = getProjectRoot();

  // Install commands to .opencode/command/
  if (commands.length > 0) {
    const targetCommandsDir = join(targetDir, ".opencode", "command");
    ensureDir(targetCommandsDir);

    for (const cmd of commands) {
      const src = join(root, "commands", `${cmd}.md`);
      const dest = join(targetCommandsDir, `${cmd}.md`);

      if (fileExists(dest)) {
        printInfo(`Skipping ${cmd}.md (already exists in OpenCode)`);
        continue;
      }

      copyFile(src, dest);
      printSuccess(`Added OpenCode command: ${cmd}`);
    }
  }

  // Install skills to .opencode/skill/
  if (skills.length > 0) {
    for (const skill of skills) {
      const srcDir = join(root, "skills", skill);
      const destDir = join(targetDir, ".opencode", "skill", skill);

      if (fileExists(join(destDir, "SKILL.md"))) {
        printInfo(`Skipping skill ${skill} (already exists in OpenCode)`);
        continue;
      }

      ensureDir(destDir);

      // Copy all files in the skill directory
      const files = readdirSync(srcDir);
      for (const file of files) {
        const srcPath = join(srcDir, file);
        const destPath = join(destDir, file);

        if (statSync(srcPath).isFile()) {
          copyFile(srcPath, destPath);
        }
      }

      printSuccess(`Added OpenCode skill: ${skill}`);
    }
  }
}
