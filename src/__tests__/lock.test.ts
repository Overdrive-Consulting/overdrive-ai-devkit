import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, readFile } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import {
  readLockFile,
  writeLockFile,
  addAssetToLock,
  removeAssetFromLock,
  computeContentHash,
  saveSelectedAgents,
  getLastSelectedAgents,
} from "../utils/lock";

describe("lock file operations", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "adk-lock-test-"));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("returns empty lock file when none exists", async () => {
    const lock = await readLockFile(tempDir);
    expect(lock.version).toBe(1);
    expect(lock.assets).toEqual({});
  });

  it("writes and reads lock file", async () => {
    const lock = {
      version: 1,
      assets: {
        "skill:debug": {
          type: "skill" as const,
          source: "bundled",
          sourceType: "bundled",
          sourceUrl: "@enteroverdrive/ai-devkit",
          contentHash: "abc123",
          installedAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
        },
      },
    };

    await writeLockFile(lock, tempDir);
    const read = await readLockFile(tempDir);
    expect(read.assets["skill:debug"]).toBeDefined();
    expect(read.assets["skill:debug"]!.source).toBe("bundled");
  });

  it("adds asset to lock file", async () => {
    await addAssetToLock(
      "skill:test",
      {
        type: "skill",
        source: "owner/repo",
        sourceType: "github",
        sourceUrl: "owner/repo",
        contentHash: "hash123",
      },
      tempDir,
    );

    const lock = await readLockFile(tempDir);
    expect(lock.assets["skill:test"]).toBeDefined();
    expect(lock.assets["skill:test"]!.source).toBe("owner/repo");
    expect(lock.assets["skill:test"]!.installedAt).toBeTruthy();
    expect(lock.assets["skill:test"]!.updatedAt).toBeTruthy();
  });

  it("removes asset from lock file", async () => {
    await addAssetToLock(
      "skill:test",
      {
        type: "skill",
        source: "owner/repo",
        sourceType: "github",
        sourceUrl: "owner/repo",
        contentHash: "hash123",
      },
      tempDir,
    );

    const removed = await removeAssetFromLock("skill:test", tempDir);
    expect(removed).toBe(true);

    const lock = await readLockFile(tempDir);
    expect(lock.assets["skill:test"]).toBeUndefined();
  });

  it("returns false when removing non-existent asset", async () => {
    const removed = await removeAssetFromLock(
      "skill:nonexistent",
      tempDir,
    );
    expect(removed).toBe(false);
  });

  it("saves and retrieves selected agents", async () => {
    await saveSelectedAgents(
      ["claude-code", "cursor"],
      tempDir,
    );

    const result = await getLastSelectedAgents(tempDir);
    expect(result).toEqual(["claude-code", "cursor"]);
  });

  it("computeContentHash produces consistent hashes", () => {
    const hash1 = computeContentHash("hello world");
    const hash2 = computeContentHash("hello world");
    const hash3 = computeContentHash("different");

    expect(hash1).toBe(hash2);
    expect(hash1).not.toBe(hash3);
    expect(hash1.length).toBe(64); // SHA-256 hex
  });
});
