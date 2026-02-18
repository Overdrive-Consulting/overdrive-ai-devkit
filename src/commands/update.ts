import * as p from "@clack/prompts";
import pc from "picocolors";
import { readLockFile } from "../utils/lock";
import {
  parseOwnerRepo,
  fetchSkillFolderHashes,
} from "../utils/github";
import type { AssetLockEntry } from "../types";

interface UpdateCandidate {
  key: string;
  entry: AssetLockEntry;
  owner: string;
  repo: string;
  currentHash: string;
  remoteHash: string;
}

interface CheckResult {
  outdated: UpdateCandidate[];
  upToDate: number;
  skipped: number;
  errors: number;
}

async function checkGitHubAssets(
  projectDir?: string,
): Promise<CheckResult> {
  const lock = await readLockFile(projectDir);
  const result: CheckResult = {
    outdated: [],
    upToDate: 0,
    skipped: 0,
    errors: 0,
  };

  // Group assets by owner/repo so we can batch API calls
  const repoGroups = new Map<
    string,
    {
      key: string;
      entry: AssetLockEntry;
      owner: string;
      repo: string;
      ref?: string;
    }[]
  >();

  for (const [key, entry] of Object.entries(lock.assets)) {
    if (
      entry.sourceType !== "github" ||
      !entry.skillFolderHash ||
      !entry.skillPath
    ) {
      result.skipped++;
      continue;
    }

    const parsed = parseOwnerRepo(entry.sourceUrl || entry.source);
    if (!parsed) {
      result.skipped++;
      continue;
    }

    const repoKey = `${parsed.owner}/${parsed.repo}@${entry.sourceRef || "HEAD"}`;
    const group = repoGroups.get(repoKey) || [];
    group.push({ key, entry, ...parsed, ref: entry.sourceRef });
    repoGroups.set(repoKey, group);
  }

  // Fetch tree SHAs per repo (one API call per repo)
  for (const [, group] of repoGroups) {
    const { owner, repo, ref } = group[0]!;
    const skillPaths = group.map((g) => g.entry.skillPath!);

    const hashes = await fetchSkillFolderHashes(owner, repo, skillPaths, ref);

    if (hashes.size === 0) {
      result.errors += group.length;
      continue;
    }

    for (const item of group) {
      const remoteHash = hashes.get(item.entry.skillPath!);
      if (!remoteHash) {
        result.errors++;
        continue;
      }

      if (remoteHash !== item.entry.skillFolderHash) {
        result.outdated.push({
          ...item,
          currentHash: item.entry.skillFolderHash!,
          remoteHash,
        });
      } else {
        result.upToDate++;
      }
    }
  }

  return result;
}

export async function runCheck(args: string[]): Promise<void> {
  const isGlobal = args.includes("-g") || args.includes("--global");
  const cwd = process.cwd();
  const projectDir = isGlobal ? undefined : cwd;
  const scope = isGlobal ? "global" : "project";

  const spinner = p.spinner();
  spinner.start(`Checking ${scope} assets for updates...`);

  const result = await checkGitHubAssets(projectDir);

  spinner.stop("Check complete");

  if (result.outdated.length === 0) {
    p.log.success(pc.green("Everything is up to date!"));
    if (result.upToDate > 0) {
      p.log.info(pc.dim(`${result.upToDate} asset(s) checked, all current`));
    }
    if (result.skipped > 0) {
      p.log.info(
        pc.dim(
          `${result.skipped} asset(s) skipped (local or missing tracking data)`,
        ),
      );
    }
    return;
  }

  p.log.warn(
    pc.yellow(`${result.outdated.length} update(s) available:`),
  );
  for (const candidate of result.outdated) {
    const name = candidate.key.split(":").slice(1).join(":");
    const source = `${candidate.owner}/${candidate.repo}`;
    p.log.message(`  ${pc.cyan(name)} ${pc.dim(`from ${source}`)}`);
  }

  if (result.upToDate > 0) {
    p.log.info(pc.dim(`${result.upToDate} asset(s) already up to date`));
  }

  p.log.info(pc.dim("Run 'adk update' to apply updates"));
}

export async function runUpdate(args: string[] = []): Promise<void> {
  const isGlobal = args.includes("-g") || args.includes("--global");
  const skipPrompts = args.includes("-y") || args.includes("--yes");
  const cwd = process.cwd();
  const projectDir = isGlobal ? undefined : cwd;
  const scope = isGlobal ? "global" : "project";

  const spinner = p.spinner();
  spinner.start(`Checking ${scope} assets for updates...`);

  const result = await checkGitHubAssets(projectDir);

  if (result.outdated.length === 0) {
    spinner.stop("Check complete");
    p.log.success(pc.green("Everything is up to date!"));
    if (result.upToDate > 0) {
      p.log.info(pc.dim(`${result.upToDate} asset(s) checked, all current`));
    }
    return;
  }

  spinner.stop(
    `Found ${result.outdated.length} update(s) available`,
  );

  // Show what's outdated
  for (const candidate of result.outdated) {
    const name = candidate.key.split(":").slice(1).join(":");
    const source = `${candidate.owner}/${candidate.repo}`;
    p.log.message(`  ${pc.yellow("~")} ${pc.cyan(name)} ${pc.dim(`from ${source}`)}`);
  }

  // Confirm
  if (!skipPrompts) {
    const confirmed = await p.confirm({
      message: `Update ${result.outdated.length} asset(s)?`,
    });

    if (p.isCancel(confirmed) || !confirmed) {
      p.cancel("Update cancelled");
      return;
    }
  }

  // Re-install each outdated skill via `adk add`
  const { runAdd } = await import("./add");
  let successCount = 0;
  let failCount = 0;

  for (const candidate of result.outdated) {
    const name = candidate.key.split(":").slice(1).join(":");
    try {
      const addArgs = [
        candidate.entry.type,
        candidate.entry.sourceUrl || `${candidate.owner}/${candidate.repo}`,
        "--skill",
        name,
        "--yes",
      ];

      if (isGlobal) {
        addArgs.push("--global");
      }

      await runAdd(addArgs, { exitOnError: false });
      successCount++;
    } catch {
      p.log.error(pc.red(`Failed to update ${name}`));
      failCount++;
    }
  }

  if (successCount > 0) {
    p.log.success(pc.green(`Updated ${successCount} asset(s)`));
  }
  if (failCount > 0) {
    p.log.error(pc.red(`Failed to update ${failCount} asset(s)`));
  }
}
