<p align="center">
  <img src="https://raw.githubusercontent.com/Overdrive-Consulting/overdrive-ai-devkit/main/assets/logo.svg" alt="AI DevKit" width="120" />
</p>

<h1 align="center">AI DevKit</h1>

<p align="center">
  <strong>The universal package manager for AI coding agents.</strong>
</p>

<p align="center">
  Install skills, commands, rules, and MCP servers across 40+ AI tools in seconds.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@enteroverdrive/ai-devkit">
    <img src="https://img.shields.io/npm/v/@enteroverdrive/ai-devkit?style=flat-square&color=blue" alt="npm version" />
  </a>
  <a href="https://www.npmjs.com/package/@enteroverdrive/ai-devkit">
    <img src="https://img.shields.io/npm/dm/@enteroverdrive/ai-devkit?style=flat-square" alt="npm downloads" />
  </a>
  <a href="https://github.com/Overdrive-Consulting/overdrive-ai-devkit/actions">
    <img src="https://img.shields.io/github/actions/workflow/status/Overdrive-Consulting/overdrive-ai-devkit/ci.yml?style=flat-square&label=CI" alt="CI" />
  </a>
  <a href="https://github.com/Overdrive-Consulting/overdrive-ai-devkit/blob/main/LICENSE">
    <img src="https://img.shields.io/github/license/Overdrive-Consulting/overdrive-ai-devkit?style=flat-square" alt="license" />
  </a>
</p>

<p align="center">
  <a href="#quick-start">Quick Start</a> &middot;
  <a href="#commands">Commands</a> &middot;
  <a href="#supported-agents">40+ Agents</a> &middot;
  <a href="#bundled-assets">Bundled Assets</a> &middot;
  <a href="#external-skills">External Skills</a> &middot;
  <a href="#configuration">Configuration</a>
</p>

---

## What is this?

AI DevKit is a CLI that installs and manages **skills**, **commands**, **rules**, and **MCP servers** for AI coding agents. Think of it as `npm` for AI agent capabilities.

- **40+ agents supported** — Claude Code, Cursor, Codex, Windsurf, Cline, Roo Code, and many more
- **Auto-detection** — Detects which agents you have installed
- **Fuzzy search UI** — Interactive selection with type-to-filter across all prompts
- **External skill sourcing** — Install skills from GitHub repos or local paths
- **Lock file tracking** — `.ai-devkit-lock.json` tracks everything installed
- **Bundled + external** — Ships with curated skills and supports any GitHub repo

---

## Quick Start

```bash
# Run without installing
npx @enteroverdrive/ai-devkit

# Or install globally
npm install -g @enteroverdrive/ai-devkit
adk
```

The interactive wizard walks you through:

1. **Select AI tools** — Fuzzy-search across 40+ agents, auto-detects installed ones
2. **Pick MCP servers** — Context7, Exa, Supabase, Morph, AST-Grep, Perplexity, Convex
3. **Choose skills** — Frontend design, TDD, debugging, code search, and more
4. **Install commands** — `/deslop`, `/onboard`, `/security-audit`, `/visualize`
5. **Add rules** — Framework-specific guidelines (Convex, UV)
6. **Optional hardening** — Enable Safety Net (Claude Code) to block destructive commands

---

## Common Workflows

### Bootstrap a new repo

```bash
adk init
```

### Install a community skill from GitHub

```bash
adk add skill owner/repo
adk add skill owner/repo@skill-name
```

### Install commands/rules from a specific repo folder

```bash
adk add command https://github.com/owner/repo/tree/main/commands
adk add rule https://github.com/owner/repo/tree/main/rules
```

### Keep GitHub-sourced skills up to date

```bash
adk check
adk update
```

---

## Commands

### `adk init`

Interactive setup wizard. Default command when running `adk` with no arguments.

```bash
adk                  # same as adk init
adk init
```

### `adk add`

Install skills, commands, or rules from GitHub repos or local paths.

```bash
# From GitHub
adk add skill owner/repo
adk add skill owner/repo@specific-skill

# From local path
adk add skill ./my-skills

# With options
adk add skill owner/repo --global          # Install globally (~/)
adk add skill owner/repo --yes             # Skip all prompts
adk add skill owner/repo --list            # Preview without installing
adk add skill owner/repo --all             # Install everything to all agents
adk add skill owner/repo --full-depth      # Deep recursive search
adk add skill owner/repo --skill s1 s2     # Filter specific skills
adk add skill owner/repo --agent claude-code cursor  # Target specific agents

# Commands and rules
adk add command owner/repo
adk add rule owner/repo
adk add command https://github.com/owner/repo/tree/main/commands
adk add rule https://github.com/owner/repo/tree/main/rules

# Note: --global is currently supported for skills only
```

### `adk remove`

Remove installed assets.

```bash
adk remove                           # Interactive selection
adk remove skill debug               # Remove by name
adk remove --all                     # Remove everything
adk remove skill debug --agent cursor claude-code  # From specific agents
```

### `adk list`

List installed assets.

```bash
adk list                # All assets
adk list skill          # Skills only
adk list -g             # Global assets
adk list --agent cursor # Filter by agent
```

### `adk find`

Search [skills.sh](https://skills.sh) for community skills.

```bash
adk find auth           # Search and show results
adk find                # Interactive fuzzy search, auto-installs on selection
```

### `adk create`

Scaffold a new skill, command, or rule.

```bash
adk create skill my-skill       # Creates my-skill/SKILL.md + README.md
adk create command my-command    # Creates my-command.md with frontmatter
adk create rule my-rule          # Creates my-rule.md with frontmatter
```

### `adk check`

Check if any GitHub-sourced skills have upstream updates available. Uses the GitHub Trees API to compare stored tree SHAs against the current repo state.

```bash
adk check                # Check project assets
adk check -g             # Check global assets
```

### `adk update`

Check for and apply updates to outdated GitHub-sourced skills. Re-installs skills whose upstream source has changed.

```bash
adk update               # Interactive update
adk update -g            # Update global assets
adk update -y            # Skip confirmation prompt
```

`adk check` / `adk update` support private GitHub repositories when `GITHUB_TOKEN` is set.
If verification fails (API/rate limit/network/path issues), the CLI reports a warning instead of falsely claiming everything is up to date.

---

## Supported Agents

AI DevKit supports **40+ AI coding tools**. Each agent has its own directory structure, and skills are installed to the right location automatically.

| Agent | Skills Directory | Global Directory |
|-------|-----------------|------------------|
| **Claude Code** | `.claude/skills/` | `~/.claude/skills/` |
| **Cursor** | `.cursor/skills/` | `~/.cursor/skills/` |
| **Codex** | `.agents/skills/` | `~/.codex/skills/` |
| **OpenCode** | `.agents/skills/` | `~/.config/opencode/skills/` |
| **Windsurf** | `.windsurf/skills/` | `~/.codeium/windsurf/skills/` |
| **Cline** | `.cline/skills/` | `~/.cline/skills/` |
| **Roo Code** | `.roo/skills/` | `~/.roo/skills/` |
| **GitHub Copilot** | `.agents/skills/` | `~/.copilot/skills/` |
| **Gemini CLI** | `.agents/skills/` | `~/.gemini/skills/` |
| **Continue** | `.continue/skills/` | `~/.continue/skills/` |
| **Goose** | `.goose/skills/` | `~/.config/goose/skills/` |
| **Amp** | `.agents/skills/` | `~/.config/agents/skills/` |

Plus 28 more: Augment, CodeBuddy, Command Code, Crush, Droid, iFlow CLI, Junie, Kilo Code, Kimi CLI, Kiro CLI, Kode, MCPJam, Mistral Vibe, Mux, Neovate, OpenClaw, OpenHands, Pi, Pochi, Qoder, Qwen Code, Replit, Trae, Trae CN, Zencoder, AdaL, Antigravity.

---

## Bundled Assets

### Skills

| Skill | Description |
|-------|-------------|
| `frontend-design` | Create distinctive, production-grade UIs with bold aesthetics |
| `test-driven-development` | Enforce red-green-refactor TDD discipline |
| `debug` | Investigate issues via logs, database, git history without editing files |
| `morph-search` | 20x faster text/regex search via WarpGrep |
| `ast-grep-find` | Structural code search using AST patterns |
| `qlty-check` | Universal code quality, linting, and formatting |
| `code-simplifier` | Reduce complexity and remove unnecessary abstractions |
| `web-design-guidelines` | Interface design principles and patterns |
| `better-auth-best-practices` | Authentication implementation guidelines |
| `react-best-practices` | React and Next.js performance optimization |

### Slash Commands

| Command | Description |
|---------|-------------|
| `/deslop` | Remove AI-generated code smell from your branch |
| `/onboard` | Comprehensive developer onboarding workflow |
| `/security-audit` | Security review with remediation steps |
| `/visualize` | Generate mermaid diagrams for data lineage |
| `/interview` | In-depth interviews about feature plans |
| `/add-documentation` | Add comprehensive documentation for code |
| `/changelog` | Generate changelogs from git history |

### MCP Servers

| Server | Description |
|--------|-------------|
| **Context7** | Up-to-date documentation lookup for any library |
| **Exa** | Web search, code context, and research |
| **Supabase** | Database operations via Supabase |
| **Morph** | Fast codebase search (20x faster than grep) |
| **AST-Grep** | AST-based code search and refactoring |
| **Perplexity** | AI-powered web search and reasoning |
| **AI Elements** | Access to the AI SDK component registry |
| **Convex** | Convex database operations |

### Rules

| Rule | Description |
|------|-------------|
| `convex` | Convex best practices — schema design, function patterns, full-text search |
| `uv` | Python package management with UV |

---

## External Skills

Install skills from any GitHub repo that follows the [SKILL.md convention](https://skills.sh):

```bash
# GitHub shorthand
adk add skill owner/repo

# Specific skill from a multi-skill repo
adk add skill owner/repo@skill-name

# GitHub URL with branch
adk add skill https://github.com/owner/repo/tree/main/skills

# Local directory
adk add skill ./my-local-skills

# Preview what's available
adk add skill owner/repo --list

# Install everything non-interactively
adk add skill owner/repo --all -g
```

Skills are discovered by scanning for `SKILL.md` files with `name` and `description` frontmatter across 30+ known directory patterns.

---

## Configuration

### Project Config

Create `devkit.config.mjs` in your project root to restrict available agents:

```js
export default {
  agents: ["claude-code", "cursor", "opencode"],
  skills: ["debug", "frontend-design"],
};
```

When `agents` is set, `adk init` only shows those agents in the selection.

### Lock File

AI DevKit tracks installed assets in `.ai-devkit-lock.json`:

```json
{
  "version": 1,
  "assets": {
    "skill:debug": {
      "type": "skill",
      "source": "bundled",
      "sourceUrl": "@enteroverdrive/ai-devkit",
      "contentHash": "abc123",
      "installedAt": "2025-01-01T00:00:00.000Z"
    }
  },
  "lastSelectedAgents": ["claude-code", "cursor"]
}
```

### Environment Variables

Some MCP servers require API keys:

```bash
export SUPABASE_ACCESS_TOKEN="your-token"     # Supabase
export MORPH_API_KEY="your-key"               # Morph (WarpGrep)
export PERPLEXITY_API_KEY="your-key"          # Perplexity
export GITHUB_TOKEN="ghp_..."                 # Private GitHub skill update checks
```

---

## Requirements

- Node.js 18+ (or Bun runtime)
- Git installed and available on PATH
- Network access for GitHub/skills.sh installs and update checks

---

## Safety Net (Claude Code)

Optional protection layer that blocks destructive commands before execution. Based on [claude-code-safety-net](https://github.com/kenryu42/claude-code-safety-net).

**What gets blocked:**

| Category | Examples |
|----------|----------|
| Git destructive | `git reset --hard`, `git checkout -- files`, `git clean -f` |
| Git history | `git push --force`, `git branch -D`, `git stash clear` |
| File deletion | `rm -rf` outside cwd, `rm -rf /`, `rm -rf ~` |
| Dynamic execution | `xargs rm -rf`, `find -delete` |

**Customizable** via `.safety-net.json` in your project root.

---

## Project Structure

```
ai-devkit/
├── src/
│   ├── cli.ts                    # Entry point and command router
│   ├── agents.ts                 # 40+ agent registry with detection
│   ├── config.ts                 # devkit.config.ts loader
│   ├── constants.ts              # Shared constants
│   ├── types.ts                  # TypeScript type definitions
│   ├── commands/
│   │   ├── init.ts               # Interactive setup wizard
│   │   ├── add.ts                # Install from GitHub/local
│   │   ├── remove.ts             # Remove installed assets
│   │   ├── list.ts               # List installed assets
│   │   ├── find.ts               # Search skills.sh
│   │   ├── create.ts             # Scaffold new assets
│   │   └── update.ts             # Update checker
│   ├── installers/
│   │   ├── skill-installer.ts    # Copy-based skill installer
│   │   ├── external-installer.ts # Skill/command/rule discovery
│   │   ├── shared.ts             # Shared installation logic
│   │   ├── mcp.ts                # MCP server installer
│   │   ├── rules.ts              # Rules installer
│   │   ├── safety-net.ts         # Safety Net (Claude Code)
│   │   └── ...
│   ├── prompts/
│   │   └── search-multiselect.ts # Fuzzy search multiselect UI
│   └── utils/
│       ├── lock.ts               # Lock file CRUD
│       ├── source-parser.ts      # GitHub/local path parser
│       ├── git.ts                # Git clone operations
│       ├── frontmatter.ts        # YAML frontmatter parser
│       ├── skills-api.ts         # skills.sh API client
│       └── ui.ts                 # Terminal UI helpers
├── commands/                     # Bundled slash commands
├── skills/                       # Bundled skill definitions
├── rules/                        # Bundled framework rules
├── mcp/
│   └── servers.json              # MCP server registry
└── src/__tests__/                # Test suite
```

---

## Development

```bash
# Install dependencies
bun install

# Run locally
bun run dev

# Type check
bun run typecheck

# Run tests
bun run test

# Build
bun run build
```

### CI/CD

- **CI** runs on PRs and pushes to `main`: typecheck, test, build
- **Publish** auto-detects `[patch]` or `[minor]` in commit messages and publishes to npm with provenance

---

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run `bun run typecheck && bun run test`
5. Submit a pull request

---

## License

MIT

---

<p align="center">
  <a href="https://github.com/Konan69">
    <img src="https://img.shields.io/badge/Built%20by-Konan-red?style=for-the-badge&logo=github" />
  </a>
</p>

<p align="center">
  Made for developers who ship fast with AI
</p>
