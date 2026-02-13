import { readFile, writeFile, mkdir } from "fs/promises";
import { join, dirname } from "path";
import { homedir } from "os";
import { createHash } from "crypto";
import { existsSync } from "fs";
import {
  PROJECT_LOCK_FILE,
  GLOBAL_LOCK_FILE,
  LOCK_VERSION,
  AGENTS_DIR,
} from "../constants";
import type { AssetLockEntry, DevkitLockFile } from "../types";

function getProjectLockPath(projectDir: string): string {
  return join(projectDir, PROJECT_LOCK_FILE);
}

function getGlobalLockPath(): string {
  return join(homedir(), AGENTS_DIR, GLOBAL_LOCK_FILE);
}

function createEmptyLockFile(): DevkitLockFile {
  return {
    version: LOCK_VERSION,
    assets: {},
  };
}

export function computeContentHash(content: string): string {
  return createHash("sha256").update(content, "utf-8").digest("hex");
}

export async function readLockFile(
  projectDir?: string,
): Promise<DevkitLockFile> {
  const lockPath = projectDir
    ? getProjectLockPath(projectDir)
    : getGlobalLockPath();

  try {
    const content = await readFile(lockPath, "utf-8");
    const parsed = JSON.parse(content) as DevkitLockFile;

    if (typeof parsed.version !== "number" || !parsed.assets) {
      return createEmptyLockFile();
    }

    if (parsed.version < LOCK_VERSION) {
      return createEmptyLockFile();
    }

    return parsed;
  } catch {
    return createEmptyLockFile();
  }
}

export async function writeLockFile(
  lock: DevkitLockFile,
  projectDir?: string,
): Promise<void> {
  const lockPath = projectDir
    ? getProjectLockPath(projectDir)
    : getGlobalLockPath();

  await mkdir(dirname(lockPath), { recursive: true });
  const content = JSON.stringify(lock, null, 2);
  await writeFile(lockPath, content, "utf-8");
}

export async function addAssetToLock(
  key: string,
  entry: Omit<AssetLockEntry, "installedAt" | "updatedAt">,
  projectDir?: string,
): Promise<void> {
  const lock = await readLockFile(projectDir);
  const now = new Date().toISOString();
  const existing = lock.assets[key];

  lock.assets[key] = {
    ...entry,
    installedAt: existing?.installedAt ?? now,
    updatedAt: now,
  };

  await writeLockFile(lock, projectDir);
}

export async function removeAssetFromLock(
  key: string,
  projectDir?: string,
): Promise<boolean> {
  const lock = await readLockFile(projectDir);

  if (!(key in lock.assets)) {
    return false;
  }

  delete lock.assets[key];
  await writeLockFile(lock, projectDir);
  return true;
}

export async function getLastSelectedAgents(
  projectDir?: string,
): Promise<string[] | undefined> {
  const lock = await readLockFile(projectDir);
  return lock.lastSelectedAgents;
}

export async function saveSelectedAgents(
  agents: string[],
  projectDir?: string,
): Promise<void> {
  const lock = await readLockFile(projectDir);
  lock.lastSelectedAgents = agents;
  await writeLockFile(lock, projectDir);
}
