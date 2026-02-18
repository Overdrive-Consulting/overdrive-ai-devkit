import simpleGit from "simple-git";
import { join, normalize, resolve, sep } from "path";
import { mkdtemp, rm } from "fs/promises";
import { tmpdir } from "os";

const CLONE_TIMEOUT_MS = 60000;

export function validateGitCloneUrl(url: string): void {
  const trimmed = url.trim();
  if (!trimmed) {
    throw new GitCloneError("Git URL cannot be empty.", url);
  }

  // Prevent argument injection via values interpreted as git flags.
  if (trimmed.startsWith("-")) {
    throw new GitCloneError("Invalid git URL.", url);
  }
}

export class GitCloneError extends Error {
  readonly url: string;
  readonly isTimeout: boolean;
  readonly isAuthError: boolean;

  constructor(
    message: string,
    url: string,
    isTimeout = false,
    isAuthError = false,
  ) {
    super(message);
    this.name = "GitCloneError";
    this.url = url;
    this.isTimeout = isTimeout;
    this.isAuthError = isAuthError;
  }
}

export async function cloneRepo(url: string, ref?: string): Promise<string> {
  validateGitCloneUrl(url);

  const tempDir = await mkdtemp(join(tmpdir(), "adk-"));
  const git = simpleGit({ timeout: { block: CLONE_TIMEOUT_MS } });
  const cloneOptions = ref
    ? ["--depth", "1", "--branch", ref]
    : ["--depth", "1"];

  try {
    await git.clone(url, tempDir, cloneOptions);
    return tempDir;
  } catch (error) {
    await rm(tempDir, { recursive: true, force: true }).catch(() => {});

    const errorMessage =
      error instanceof Error ? error.message : String(error);
    const isTimeout =
      errorMessage.includes("block timeout") ||
      errorMessage.includes("timed out");
    const isAuthError =
      errorMessage.includes("Authentication failed") ||
      errorMessage.includes("could not read Username") ||
      errorMessage.includes("Permission denied") ||
      errorMessage.includes("Repository not found");

    if (isTimeout) {
      throw new GitCloneError(
        `Clone timed out after 60s. Ensure you have access and your SSH keys or credentials are configured.`,
        url,
        true,
        false,
      );
    }

    if (isAuthError) {
      throw new GitCloneError(
        `Authentication failed for ${url}. For private repos, ensure you have access.`,
        url,
        false,
        true,
      );
    }

    throw new GitCloneError(
      `Failed to clone ${url}: ${errorMessage}`,
      url,
      false,
      false,
    );
  }
}

export async function cleanupTempDir(dir: string): Promise<void> {
  const normalizedDir = normalize(resolve(dir));
  const normalizedTmpDir = normalize(resolve(tmpdir()));

  if (
    !normalizedDir.startsWith(normalizedTmpDir + sep) &&
    normalizedDir !== normalizedTmpDir
  ) {
    throw new Error(
      "Attempted to clean up directory outside of temp directory",
    );
  }

  await rm(dir, { recursive: true, force: true });
}
