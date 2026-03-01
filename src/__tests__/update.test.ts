import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { mkdtemp, rm } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { addAssetToLock } from "../utils/lock";
import { checkGitHubAssets } from "../commands/update";

describe("checkGitHubAssets", () => {
  let tempDir: string;
  let fetchMock: ReturnType<typeof vi.fn>;
  let originalFetch: typeof globalThis.fetch | undefined;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "adk-update-test-"));
    fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({}),
    });
    originalFetch = globalThis.fetch;
    (globalThis as { fetch?: typeof globalThis.fetch }).fetch =
      fetchMock as unknown as typeof globalThis.fetch;
  });

  afterEach(async () => {
    (globalThis as { fetch?: typeof globalThis.fetch }).fetch =
      originalFetch;
    await rm(tempDir, { recursive: true, force: true });
  });

  it("tracks failed GitHub hash lookups as errors", async () => {
    await addAssetToLock(
      "skill:debug",
      {
        type: "skill",
        source: "owner/repo",
        sourceType: "github",
        sourceUrl: "owner/repo",
        sourceRef: "main",
        contentHash: "abc",
        skillFolderHash: "old-sha",
        skillPath: "skills/debug",
      },
      tempDir,
    );

    const result = await checkGitHubAssets(tempDir);

    expect(result.errors).toBe(1);
    expect(result.outdated).toHaveLength(0);
    expect(result.upToDate).toBe(0);
    expect(result.skipped).toBe(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
