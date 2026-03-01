import { describe, expect, it } from "vitest";
import { parseOwnerRepo } from "../utils/github";

describe("parseOwnerRepo", () => {
  it("parses GitHub URLs with dotted repo names", () => {
    const parsed = parseOwnerRepo("https://github.com/acme/tools.v2");
    expect(parsed).toEqual({ owner: "acme", repo: "tools.v2" });
  });

  it("strips .git from GitHub URLs", () => {
    const parsed = parseOwnerRepo(
      "https://github.com/acme/tools.v2.git/tree/main/skills/debug",
    );
    expect(parsed).toEqual({ owner: "acme", repo: "tools.v2" });
  });

  it("parses shorthand refs with dotted repo names", () => {
    const parsed = parseOwnerRepo("acme/tools.v2@debug-skill");
    expect(parsed).toEqual({ owner: "acme", repo: "tools.v2" });
  });

  it("returns null for non-GitHub sources", () => {
    expect(parseOwnerRepo("git@gitlab.com:acme/tools.v2.git")).toBeNull();
  });
});
