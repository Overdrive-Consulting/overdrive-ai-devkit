import { join } from "path";
import { readdirSync, statSync } from "fs";
import {
  copyDir,
  copyFile,
  ensureDir,
  fileExists,
  getProjectRoot,
  readFile,
} from "../utils/files";
import { printSuccess, printInfo } from "../utils/ui";
import { agents } from "../agents";
import type { AgentConfig, AgentType } from "../types";

export function getAvailableCommands(): string[] {
  const root = getProjectRoot();
  const commandsDir = join(root, "commands");

  try {
    return readdirSync(commandsDir)
      .filter((f) => f.endsWith(".md"))
      .map((f) => f.replace(".md", ""));
  } catch {
    return [];
  }
}

export function getAvailableSkills(): string[] {
  const root = getProjectRoot();
  const skillsDir = join(root, "skills");

  try {
    return readdirSync(skillsDir).filter((f) => {
      const skillPath = join(skillsDir, f);
      return statSync(skillPath).isDirectory();
    });
  } catch {
    return [];
  }
}

export function getCommandOptions() {
  const commands = getAvailableCommands();
  const root = getProjectRoot();

  return commands.map((cmd) => {
    const cmdPath = join(root, "commands", `${cmd}.md`);
    const content = readFile(cmdPath);

    const match = content.match(
      /^---\s*\n[\s\S]*?description:\s*(.+?)\n[\s\S]*?---/,
    );
    const description = match?.[1] || cmd;

    return {
      value: cmd,
      label: cmd,
      hint: description,
    };
  });
}

export function getSkillOptions() {
  const skills = getAvailableSkills();
  const root = getProjectRoot();

  return skills.map((skill) => {
    const skillPath = join(root, "skills", skill, "SKILL.md");
    let description = skill;

    try {
      const content = readFile(skillPath);
      const match = content.match(
        /^---\s*\n[\s\S]*?description:\s*(.+?)\n[\s\S]*?---/,
      );
      description = match?.[1] || skill;
    } catch {
      // Use default
    }

    return {
      value: skill,
      label: skill,
      hint: description,
    };
  });
}

export interface InstallOptions {
  targetDir: string;
  commands: string[];
  skills: string[];
}

function installForAgent(agent: AgentConfig, options: InstallOptions) {
  const { targetDir, commands, skills } = options;
  const agentDir = agent.skillsDir.split("/")[0] || agent.name;
  const commandsSubdir = agent.commandsSubdir || "commands";
  const skillsSubdir = "skills";
  const name = agent.displayName;
  const root = getProjectRoot();

  // Install commands
  if (commands.length > 0) {
    const targetCommandsDir = join(
      targetDir,
      `.${agentDir.replace(/^\./, "")}`,
      commandsSubdir,
    );
    ensureDir(targetCommandsDir);

    for (const cmd of commands) {
      const src = join(root, "commands", `${cmd}.md`);
      const dest = join(targetCommandsDir, `${cmd}.md`);

      if (fileExists(dest)) {
        printInfo(`Skipping ${cmd}.md (already exists in ${name})`);
        continue;
      }

      copyFile(src, dest);
      printSuccess(`Added ${name} command: ${cmd}`);
    }
  }

  // Install skills
  if (skills.length > 0) {
    for (const skill of skills) {
      const srcDir = join(root, "skills", skill);
      const destDir = join(
        targetDir,
        `.${agentDir.replace(/^\./, "")}`,
        skillsSubdir,
        skill,
      );

      if (fileExists(join(destDir, "SKILL.md"))) {
        printInfo(`Skipping skill ${skill} (already exists in ${name})`);
        continue;
      }

      copyDir(srcDir, destDir);
      printSuccess(`Added ${name} skill: ${skill}`);
    }
  }
}

export function installClaude(options: InstallOptions) {
  installForAgent(agents["claude-code"], options);
}

export function installCursor(options: InstallOptions) {
  installForAgent(agents["cursor"], options);

  // Ensure rules directory exists
  const rulesDir = join(options.targetDir, ".cursor", "rules");
  ensureDir(rulesDir);
}

export function installOpencode(options: InstallOptions) {
  installForAgent(agents["opencode"], options);
}

/** Install bundled assets for any agent type */
export function installForAgentType(
  agentType: AgentType,
  options: InstallOptions,
) {
  installForAgent(agents[agentType], options);
}
