export type AssetType = "skill" | "command" | "rule" | "mcp";

export type AgentType =
  | "amp"
  | "antigravity"
  | "augment"
  | "claude-code"
  | "openclaw"
  | "cline"
  | "codebuddy"
  | "codex"
  | "command-code"
  | "continue"
  | "crush"
  | "cursor"
  | "droid"
  | "gemini-cli"
  | "github-copilot"
  | "goose"
  | "iflow-cli"
  | "junie"
  | "kilo"
  | "kimi-cli"
  | "kiro-cli"
  | "kode"
  | "mcpjam"
  | "mistral-vibe"
  | "mux"
  | "neovate"
  | "opencode"
  | "openhands"
  | "pi"
  | "qoder"
  | "qwen-code"
  | "replit"
  | "roo"
  | "trae"
  | "trae-cn"
  | "windsurf"
  | "zencoder"
  | "pochi"
  | "adal";

export interface AgentConfig {
  name: string;
  displayName: string;
  skillsDir: string;
  globalSkillsDir: string | undefined;
  detectInstalled: () => Promise<boolean>;
  showInUniversalList?: boolean;
  /** Subdirectory name for commands (e.g., "commands" or "command") */
  commandsSubdir?: string;
  /** Subdirectory name for rules */
  rulesSubdir?: string;
  /** Path to MCP config file relative to agent root */
  mcpConfigPath?: string;
}

export interface Skill {
  name: string;
  description: string;
  path: string;
  rawContent?: string;
  metadata?: Record<string, unknown>;
}

export interface ParsedSource {
  type: "github" | "local" | "git";
  url: string;
  subpath?: string;
  localPath?: string;
  ref?: string;
  skillFilter?: string;
}

export interface DevkitConfig {
  agents?: AgentType[];
  skills?: string[];
  commands?: string[];
  rules?: string[];
  mcp?: string[];
}

export interface AssetLockEntry {
  type: AssetType;
  source: string;
  sourceType: string;
  sourceUrl: string;
  assetPath?: string;
  contentHash: string;
  /** GitHub tree SHA for the skill folder — used for update detection */
  skillFolderHash?: string;
  /** Path to the skill within the source repo (e.g., "skills/debug") */
  skillPath?: string;
  installedAt: string;
  updatedAt: string;
}

export interface DevkitLockFile {
  version: number;
  assets: Record<string, AssetLockEntry>;
  lastSelectedAgents?: string[];
}
