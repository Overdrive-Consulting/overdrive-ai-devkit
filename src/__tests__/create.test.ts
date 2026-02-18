import { describe, expect, it } from "vitest";
import { sanitizeScaffoldName } from "../commands/create";

describe("sanitizeScaffoldName", () => {
  it("accepts valid names", () => {
    expect(sanitizeScaffoldName("my-skill", "skill")).toBe("my-skill");
    expect(sanitizeScaffoldName("Command1", "command")).toBe("Command1");
  });

  it("rejects traversal and separators", () => {
    expect(() => sanitizeScaffoldName("../bad", "skill")).toThrow();
    expect(() => sanitizeScaffoldName("a/b", "command")).toThrow();
    expect(() => sanitizeScaffoldName("a\\b", "rule")).toThrow();
  });

  it("rejects invalid characters", () => {
    expect(() => sanitizeScaffoldName("bad name", "skill")).toThrow();
    expect(() => sanitizeScaffoldName("bad$name", "skill")).toThrow();
  });
});
