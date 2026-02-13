import { describe, it, expect } from "vitest";
import { parseFrontmatter } from "../utils/frontmatter";

describe("parseFrontmatter", () => {
  it("parses YAML frontmatter with name and description", () => {
    const input = `---
name: My Skill
description: A test skill
---

# Content here`;

    const result = parseFrontmatter(input);
    expect(result.data.name).toBe("My Skill");
    expect(result.data.description).toBe("A test skill");
    expect(result.content.trim()).toBe("# Content here");
  });

  it("handles content without frontmatter", () => {
    const input = "# Just a heading\n\nSome content";
    const result = parseFrontmatter(input);
    expect(result.data).toEqual({});
    expect(result.content.trim()).toBe("# Just a heading\n\nSome content");
  });

  it("handles empty frontmatter", () => {
    const input = `---
---

Content`;

    const result = parseFrontmatter(input);
    expect(result.data).toEqual({});
    expect(result.content.trim()).toBe("Content");
  });

  it("handles nested metadata", () => {
    const input = `---
name: Test
metadata:
  internal: true
  tags:
    - auth
    - security
---

Content`;

    const result = parseFrontmatter(input);
    expect(result.data.name).toBe("Test");
    const metadata = result.data.metadata as Record<string, unknown>;
    expect(metadata.internal).toBe(true);
    expect(metadata.tags).toEqual(["auth", "security"]);
  });
});
