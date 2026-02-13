interface GitHubTreeEntry {
  path: string;
  mode: string;
  type: "blob" | "tree";
  sha: string;
  size?: number;
}

interface GitHubTreeResponse {
  sha: string;
  tree: GitHubTreeEntry[];
  truncated: boolean;
}

/**
 * Parse an owner/repo string or GitHub URL into owner and repo.
 */
export function parseOwnerRepo(
  source: string,
): { owner: string; repo: string } | null {
  // Try GitHub URL: https://github.com/owner/repo...
  const urlMatch = source.match(/github\.com\/([^/]+)\/([^/.]+)/);
  if (urlMatch) {
    return { owner: urlMatch[1]!, repo: urlMatch[2]! };
  }

  // Try shorthand: owner/repo or owner/repo@skill
  const shortMatch = source.match(/^([^/]+)\/([^/@\s]+)/);
  if (shortMatch && !source.includes(":") && !source.startsWith(".")) {
    return { owner: shortMatch[1]!, repo: shortMatch[2]! };
  }

  return null;
}

/**
 * Fetch the tree SHA for a specific folder path within a GitHub repo.
 * Uses the GitHub Trees API (no auth required for public repos).
 *
 * Returns null if the path is not found or the API call fails.
 */
export async function fetchSkillFolderHash(
  owner: string,
  repo: string,
  skillPath: string,
  ref = "HEAD",
): Promise<string | null> {
  const url = `https://api.github.com/repos/${owner}/${repo}/git/trees/${ref}?recursive=1`;

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "ai-devkit",
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as GitHubTreeResponse;

    // Normalize the skill path (strip leading/trailing slashes)
    const normalized = skillPath.replace(/^\/+|\/+$/g, "");

    // Find the tree entry matching the skill folder path
    const entry = data.tree.find(
      (e) => e.type === "tree" && e.path === normalized,
    );

    return entry?.sha ?? null;
  } catch {
    return null;
  }
}

/**
 * Fetch tree SHAs for multiple skill paths in a single API call.
 */
export async function fetchSkillFolderHashes(
  owner: string,
  repo: string,
  skillPaths: string[],
  ref = "HEAD",
): Promise<Map<string, string>> {
  const results = new Map<string, string>();
  const url = `https://api.github.com/repos/${owner}/${repo}/git/trees/${ref}?recursive=1`;

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "ai-devkit",
      },
    });

    if (!response.ok) {
      return results;
    }

    const data = (await response.json()) as GitHubTreeResponse;

    for (const skillPath of skillPaths) {
      const normalized = skillPath.replace(/^\/+|\/+$/g, "");
      const entry = data.tree.find(
        (e) => e.type === "tree" && e.path === normalized,
      );
      if (entry) {
        results.set(skillPath, entry.sha);
      }
    }
  } catch {
    // API failure — return empty map
  }

  return results;
}
