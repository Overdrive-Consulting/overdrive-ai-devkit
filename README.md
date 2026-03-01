# AI DevKit

AI DevKit (`adk`) is one CLI to install and manage AI agent assets:
skills, commands, rules, and MCP servers.

Works across Claude Code, Cursor, Codex, OpenCode, Windsurf, and many more.

## Install

```bash
# run once
npx @enteroverdrive/ai-devkit

# or install globally
npm i -g @enteroverdrive/ai-devkit
adk
```

## Quick start

```bash
# interactive setup
adk

# install from GitHub
adk add skill owner/repo

# install one skill from multi-skill repo
adk add skill owner/repo@skill-name

# see what is installed
adk list
```

## Commands

```bash
adk init
adk add <skill|command|rule> <source>
adk remove [skill|command|rule] [name]
adk list [skill|command|rule|mcp]
adk find [query]
adk create <skill|command|rule> [name]
adk check
adk update
```

Useful flags: `--yes`, `--agent <a b c>`, `--global`, `--list`, `--all`.

## Sources

```bash
# local
adk add skill ./skills

# github shorthand
adk add skill owner/repo

# github tree url
adk add command https://github.com/owner/repo/tree/main/commands
adk add rule https://github.com/owner/repo/tree/main/rules
```

## Updates

`adk check` and `adk update` verify GitHub-sourced installs with folder hashes.

```bash
adk check
adk update -y
```

For private repos, set `GITHUB_TOKEN`.

## Optional config

Create `devkit.config.mjs`:

```js
export default {
  agents: ["claude-code", "cursor", "opencode"],
  skills: ["debug", "frontend-design"],
};
```

## Artifacts and gitignore

AI DevKit writes local agent/config artifacts (dirs + lock/config files).
If you want them local-only, add:

```gitignore
.agents/
.mcp.json
.cursor/mcp.json
opencode.json
.ai-devkit-lock.json
```

Common optional agent dirs:
`.claude/`, `.cursor/`, `.roo/`, `.windsurf/`.

## Bundled assets

- `skills/`
- `commands/`
- `rules/`
- `mcp/servers.json`

## Dev

```bash
bun install
bun run dev
bun run typecheck
bun run test
bun run build
```

## Requirements

Node.js 18+ (or Bun), Git on PATH, and network access for GitHub/search.

## License

MIT
