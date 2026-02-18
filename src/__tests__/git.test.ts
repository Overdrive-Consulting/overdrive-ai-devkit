import { describe, expect, it } from "vitest";
import { validateGitCloneUrl } from "../utils/git";

describe("validateGitCloneUrl", () => {
  it("accepts standard git urls", () => {
    expect(() => validateGitCloneUrl("https://github.com/owner/repo.git")).not.toThrow();
    expect(() => validateGitCloneUrl("git@github.com:owner/repo.git")).not.toThrow();
  });

  it("rejects empty values", () => {
    expect(() => validateGitCloneUrl("")).toThrow();
    expect(() => validateGitCloneUrl("   ")).toThrow();
  });

  it("rejects values that look like flags", () => {
    expect(() => validateGitCloneUrl("--upload-pack=echo")).toThrow();
    expect(() => validateGitCloneUrl("-c core.pager=cat")).toThrow();
  });
});
