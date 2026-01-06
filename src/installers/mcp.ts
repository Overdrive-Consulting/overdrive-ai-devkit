import { join } from "path";
import { readJson, getProjectRoot, fileExists } from "../utils/files";
import { mergeMcpConfig, mergeOpencodeConfig } from "../utils/merge";
import { printSuccess, printInfo } from "../utils/ui";

interface McpServerConfig {
  name: string;
  description: string;
  command?: string;
  args?: string[];
  url?: string;
  env?: Record<string, string>;
}

interface McpServersRegistry {
  [key: string]: McpServerConfig;
}

export function getAvailableMcpServers(): McpServersRegistry {
  const root = getProjectRoot();
  const serversPath = join(root, "mcp", "servers.json");
  return readJson<McpServersRegistry>(serversPath);
}

export function getMcpServerOptions() {
  const servers = getAvailableMcpServers();
  return Object.entries(servers).map(([key, config]) => ({
    value: key,
    label: config.name,
    hint: config.description,
  }));
}

function buildMcpServerConfig(server: McpServerConfig) {
  if (server.url) {
    // HTTP-based server
    return {
      type: "http",
      url: server.url,
    };
  }

  // stdio-based server
  const config: Record<string, unknown> = {
    type: "stdio",
    command: server.command,
    args: server.args,
  };

  if (server.env && Object.keys(server.env).length > 0) {
    config.env = server.env;
  }

  return config;
}

function buildCursorMcpServerConfig(server: McpServerConfig) {
  if (server.url) {
    return { url: server.url };
  }

  const config: Record<string, unknown> = {
    command: server.command,
    args: server.args,
  };

  if (server.env && Object.keys(server.env).length > 0) {
    config.env = server.env;
  }

  return config;
}

function buildOpencodeMcpServerConfig(server: McpServerConfig) {
  if (server.url) {
    return {
      type: "remote",
      url: server.url,
    };
  }

  const config: Record<string, unknown> = {
    type: "local",
    command: [server.command, ...(server.args || [])],
  };

  if (server.env && Object.keys(server.env).length > 0) {
    config.environment = server.env;
  }

  return config;
}

export interface InstallMcpOptions {
  targetDir: string;
  serverKeys: string[];
  forClaude: boolean;
  forCursor: boolean;
  forOpencode: boolean;
}

export function installMcpServers(options: InstallMcpOptions) {
  const { targetDir, serverKeys, forClaude, forCursor, forOpencode } = options;
  const allServers = getAvailableMcpServers();

  // Build server configs for selected servers
  const claudeServers: Record<string, unknown> = {};
  const cursorServers: Record<string, unknown> = {};
  const opencodeServers: Record<string, unknown> = {};

  for (const key of serverKeys) {
    const server = allServers[key];
    if (!server) continue;

    claudeServers[key] = buildMcpServerConfig(server);
    cursorServers[key] = buildCursorMcpServerConfig(server);
    opencodeServers[key] = buildOpencodeMcpServerConfig(server);
  }

  if (forClaude && Object.keys(claudeServers).length > 0) {
    const mcpPath = join(targetDir, ".mcp.json");
    mergeMcpConfig(mcpPath, claudeServers);
    printSuccess(`Added MCP servers to .mcp.json`);
  }

  if (forCursor && Object.keys(cursorServers).length > 0) {
    const mcpPath = join(targetDir, ".cursor", "mcp.json");
    mergeMcpConfig(mcpPath, cursorServers);
    printSuccess(`Added MCP servers to .cursor/mcp.json`);
  }

  if (forOpencode && Object.keys(opencodeServers).length > 0) {
    const configPath = join(targetDir, "opencode.json");
    mergeOpencodeConfig(configPath, { mcp: opencodeServers });
    printSuccess(`Added MCP servers to opencode.json`);
  }

  // Print env var hints
  const envVars = new Set<string>();
  for (const key of serverKeys) {
    const server = allServers[key];
    if (server?.env) {
      for (const envVar of Object.keys(server.env)) {
        if (envVar.startsWith("$")) continue; // Skip placeholders
        envVars.add(envVar);
      }
    }
  }

  if (envVars.size > 0) {
    printInfo("Required environment variables:");
    for (const envVar of envVars) {
      printInfo(`  ${envVar}`);
    }
  }
}
