import { fileExists, readFile, readJson, writeFile, writeJson } from "./files";

/**
 * Deep merge two objects, with source values taking precedence
 */
export function deepMerge<T extends Record<string, unknown>>(
  target: T,
  source: Partial<T>
): T {
  const result = { ...target };

  for (const key in source) {
    const sourceValue = source[key];
    const targetValue = result[key];

    if (
      sourceValue !== null &&
      typeof sourceValue === "object" &&
      !Array.isArray(sourceValue) &&
      targetValue !== null &&
      typeof targetValue === "object" &&
      !Array.isArray(targetValue)
    ) {
      result[key] = deepMerge(
        targetValue as Record<string, unknown>,
        sourceValue as Record<string, unknown>
      ) as T[Extract<keyof T, string>];
    } else if (sourceValue !== undefined) {
      result[key] = sourceValue as T[Extract<keyof T, string>];
    }
  }

  return result;
}

/**
 * Merge MCP server configs into existing .mcp.json
 */
export function mergeMcpConfig(
  targetPath: string,
  newServers: Record<string, unknown>
) {
  let existing: { mcpServers?: Record<string, unknown> } = { mcpServers: {} };

  if (fileExists(targetPath)) {
    try {
      existing = readJson(targetPath);
    } catch {
      // File exists but is invalid JSON, start fresh
    }
  }

  const merged = {
    ...existing,
    mcpServers: {
      ...existing.mcpServers,
      ...newServers,
    },
  };

  writeJson(targetPath, merged);
}

/**
 * Merge OpenCode config into existing opencode.json
 */
export function mergeOpencodeConfig(
  targetPath: string,
  newConfig: Record<string, unknown>
) {
  let existing: Record<string, unknown> = {};

  if (fileExists(targetPath)) {
    try {
      existing = readJson(targetPath);
    } catch {
      // File exists but is invalid JSON, start fresh
    }
  }

  const merged = deepMerge(existing, newConfig);
  writeJson(targetPath, merged);
}

/**
 * Append content to a markdown file if not already present
 */
export function appendMarkdownIfNew(
  targetPath: string,
  newContent: string,
  identifier: string
) {
  let existing = "";

  if (fileExists(targetPath)) {
    existing = readFile(targetPath);
    // Check if content already exists (by identifier)
    if (existing.includes(identifier)) {
      return false; // Already exists
    }
  }

  const separator = existing.trim() ? "\n\n---\n\n" : "";
  writeFile(targetPath, existing + separator + newContent);
  return true;
}
