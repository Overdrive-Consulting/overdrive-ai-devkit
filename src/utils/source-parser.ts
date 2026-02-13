import { isAbsolute, resolve } from "path";
import type { ParsedSource } from "../types";

export function getOwnerRepo(parsed: ParsedSource): string | null {
  if (parsed.type === "local") {
    return null;
  }

  if (!parsed.url.startsWith("http://") && !parsed.url.startsWith("https://")) {
    return null;
  }

  try {
    const url = new URL(parsed.url);
    let path = url.pathname.slice(1);
    path = path.replace(/\.git$/, "");

    if (path.includes("/")) {
      return path;
    }
  } catch {
    // Invalid URL
  }

  return null;
}

function isLocalPath(input: string): boolean {
  return (
    isAbsolute(input) ||
    input.startsWith("./") ||
    input.startsWith("../") ||
    input === "." ||
    input === ".." ||
    /^[a-zA-Z]:[/\\]/.test(input)
  );
}

export function parseSource(input: string): ParsedSource {
  // Local path: absolute, relative, or current directory
  if (isLocalPath(input)) {
    const resolvedPath = resolve(input);
    return {
      type: "local",
      url: resolvedPath,
      localPath: resolvedPath,
    };
  }

  // GitHub URL with path: https://github.com/owner/repo/tree/branch/path/to/skill
  const githubTreeWithPathMatch = input.match(
    /github\.com\/([^/]+)\/([^/]+)\/tree\/([^/]+)\/(.+)/,
  );
  if (githubTreeWithPathMatch) {
    const [, owner, repo, ref, subpath] = githubTreeWithPathMatch;
    return {
      type: "github",
      url: `https://github.com/${owner}/${repo}.git`,
      ref,
      subpath,
    };
  }

  // GitHub URL with branch only: https://github.com/owner/repo/tree/branch
  const githubTreeMatch = input.match(
    /github\.com\/([^/]+)\/([^/]+)\/tree\/([^/]+)$/,
  );
  if (githubTreeMatch) {
    const [, owner, repo, ref] = githubTreeMatch;
    return {
      type: "github",
      url: `https://github.com/${owner}/${repo}.git`,
      ref,
    };
  }

  // GitHub URL: https://github.com/owner/repo
  const githubRepoMatch = input.match(/github\.com\/([^/]+)\/([^/]+)/);
  if (githubRepoMatch) {
    const [, owner, repo] = githubRepoMatch;
    const cleanRepo = repo!.replace(/\.git$/, "");
    return {
      type: "github",
      url: `https://github.com/${owner}/${cleanRepo}.git`,
    };
  }

  // GitHub shorthand with @skill syntax: owner/repo@skill-name
  const atSkillMatch = input.match(/^([^/]+)\/([^/@]+)@(.+)$/);
  if (
    atSkillMatch &&
    !input.includes(":") &&
    !input.startsWith(".") &&
    !input.startsWith("/")
  ) {
    const [, owner, repo, skillFilter] = atSkillMatch;
    return {
      type: "github",
      url: `https://github.com/${owner}/${repo}.git`,
      skillFilter,
    };
  }

  // GitHub shorthand: owner/repo or owner/repo/path
  const shorthandMatch = input.match(/^([^/]+)\/([^/]+)(?:\/(.+))?$/);
  if (
    shorthandMatch &&
    !input.includes(":") &&
    !input.startsWith(".") &&
    !input.startsWith("/")
  ) {
    const [, owner, repo, subpath] = shorthandMatch;
    return {
      type: "github",
      url: `https://github.com/${owner}/${repo}.git`,
      subpath,
    };
  }

  // Fallback: treat as direct git URL
  return {
    type: "git",
    url: input,
  };
}
