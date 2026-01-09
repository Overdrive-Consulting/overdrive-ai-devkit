<p align="center">
  <img src="https://raw.githubusercontent.com/Overdrive-Consulting/overdrive-ai-devkit/main/assets/logo.svg" alt="AI DevKit" width="120" />
</p>

<h1 align="center">AI DevKit</h1>

<p align="center">
  <strong>Bootstrap AI coding environments in seconds.</strong>
</p>

<p align="center">
  MCP servers · Claude Code skills · Cursor rules · Commands · Safety nets
</p>

<p align="center">
  <a href="https://github.com/Overdrive-Consulting">
    <img src="https://img.shields.io/badge/Overdrive-Consulting-blue?style=flat-square&logo=github" />
  </a>
</p>

<p align="center">
  <a href="#quick-start">Quick Start</a> •
  <a href="#features">Features</a> •
  <a href="#commands">Commands</a> •
  <a href="#skills">Skills</a> •
  <a href="#mcp-servers">MCP Servers</a> •
  <a href="#rules">Rules</a> •
  <a href="#safety-net">Safety Net</a>
</p>

---

## What is this?

**AI DevKit** is a unified CLI that provisions AI coding tools across your projects. Instead of manually configuring Claude Code, Cursor, and OpenCode separately—copying files, setting up MCP servers, adding rules—run one command and ship faster.

---

## Quick Start

### Run Without Installing

```bash
# Using npx (Node.js)
npx @enteroverdrive/ai-devkit

# Using bunx (Bun)
bunx @enteroverdrive/ai-devkit
```

### Or Install Globally

```bash
# Using npm
npm install -g @enteroverdrive/ai-devkit
adk

# Using Bun
bun add -g @enteroverdrive/ai-devkit
adk
```

### Prerequisites

- Node.js (v18+) or [Bun](https://bun.sh) (v1.0+)

### What Happens Next?

The interactive CLI guides you through:

1. **Select AI tools** — Claude Code, Cursor, OpenCode
2. **Pick MCP servers** — Context7, Exa, Supabase, Morph, AST-Grep, Perplexity, Convex
3. **Choose skills** — Frontend design, TDD, debugging, code search
4. **Install commands** — `/deslop`, `/onboard`, `/security-audit`, and more
5. **Add rules** — Convex guidelines, UV package management
6. **Configure extras** — Beads, Continuous Claude, Safety Net

---

## Features

### 🛠 Multi-Tool Support

| Tool | What Gets Installed |
|------|---------------------|
| **Claude Code** | `.claude/` directory with commands, skills, MCP config |
| **Cursor** | `.cursor/` directory with commands, MCP config, rules |
| **OpenCode** | `AGENTS.md`, commands, skills |

### 🔌 MCP Server Registry

Pre-configured MCP servers ready to install:

| Server | Description |
|--------|-------------|
| **Context7** | Up-to-date documentation lookup for any library |
| **Exa** | Web search, code context, and research tools |
| **Supabase** | Database operations via Supabase |
| **Morph** | Fast codebase search (20x faster than grep) |
| **AST-Grep** | AST-based code search and refactoring |
| **Perplexity** | AI-powered web search and reasoning |
| **AI Elements** | Access to the AI SDK component registry |
| **Convex** | Convex database operations |

### 📦 Skills Library

Skills are reusable instructions that enhance AI capabilities:

| Skill | Purpose |
|-------|---------|
| `frontend-design` | Create distinctive, production-grade UIs that avoid generic "AI slop" |
| `test-driven-development` | Enforce red-green-refactor discipline |
| `debug` | Investigate issues via logs, database, git history |
| `morph-search` | Fast codebase search using WarpGrep |
| `ast-grep-find` | Structural code search with AST patterns |
| `qlty-check` | Code quality, linting, and formatting via qlty CLI |

### ⚡ Slash Commands

Commands are single-action prompts you can invoke:

| Command | What It Does |
|---------|--------------|
| `/deslop` | Remove AI-generated code smell from your branch |
| `/onboard` | Comprehensive developer onboarding workflow |
| `/security-audit` | Perform a security review with remediation steps |
| `/visualize` | Generate mermaid diagrams for data lineage |
| `/interview` | Conduct in-depth interviews about feature plans |
| `/add-documentation` | Add comprehensive documentation for code |

### 📏 Rules Library

Framework-specific guidelines:

| Rule | Scope |
|------|-------|
| `convex` | Convex best practices, schema design, function patterns |
| `uv` | Python package management with UV |

---

## Commands

### `init`

Bootstrap AI tools into the current project. Default command.

```bash
# If installed globally
adk init
# or just
adk

# Run directly without installing
npx @enteroverdrive/ai-devkit
```

### `update`

Check for updates to installed commands and skills, then selectively apply them.

```bash
adk update
# or
npx @enteroverdrive/ai-devkit update
```

### `help`

Show usage information.

```bash
adk help
```

---

## Skills

Skills are markdown files that provide specialized instructions to AI assistants. They're installed to `.claude/skills/` (Claude Code) or referenced in `AGENTS.md` (OpenCode).

### Frontend Design

Creates distinctive, production-grade interfaces. Enforces:

- **Bold aesthetic direction** — brutally minimal, maximalist, retro-futuristic, etc.
- **Distinctive typography** — no generic Inter/Roboto/Arial
- **Motion and micro-interactions** — scroll-triggering, hover states
- **Unique spatial composition** — asymmetry, overlap, grid-breaking

### Test-Driven Development

Enforces the TDD discipline:

```
NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST
```

- Write test → Watch it fail → Write minimal code → Refactor
- No exceptions, no rationalizations

### Debug

Investigate issues without editing files:

- Check logs, database state, git history
- Spawn parallel investigation tasks
- Present structured debug reports

### Code Search Skills

- **morph-search**: 20x faster text/regex search via WarpGrep
- **ast-grep-find**: Structural code search that understands syntax
- **qlty-check**: Universal linting, formatting, and metrics

---

## MCP Servers

MCP (Model Context Protocol) servers extend AI capabilities. The devkit includes a curated registry in `mcp/servers.json`.

### Configuration

Servers are installed to:

- **Claude Code**: `.mcp.json`
- **Cursor**: `.cursor/mcp.json`

### Environment Variables

Some servers require API keys:

```bash
# Supabase
export SUPABASE_ACCESS_TOKEN="your-token"

# Morph (WarpGrep)
export MORPH_API_KEY="your-key"

# Perplexity
export PERPLEXITY_API_KEY="your-key"
```

---

## Rules

Rules are framework-specific guidelines installed as markdown files.

### Convex Rules

Comprehensive guidelines for Convex projects:

- Function syntax (new format with validators)
- HTTP endpoint registration
- Schema design patterns
- Query and mutation best practices
- Full-text search, pagination, scheduling
- TypeScript typing with `Id<"table">`

### UV Rules

Python package management with UV:

```bash
uv add <package>     # Add dependencies
uv remove <package>  # Remove dependencies
uv sync              # Reinstall from lockfile
uv run script.py     # Run with dependencies
```

---

## Safety Net (Claude Code Only)

The devkit includes **[Claude Code Safety Net](https://github.com/kenryu42/claude-code-safety-net)** by [kenryu42](https://github.com/kenryu42) — a protection layer that blocks destructive commands before they execute. This feature is automatically installed when you select Claude Code during `adk init`.

### Why It Exists

AI agents can accidentally run commands like:

- `git reset --hard` — destroys uncommitted changes
- `git checkout -- file` — discards changes permanently
- `rm -rf ~/` — catastrophic file deletion
- `git push --force` — destroys remote history

### What Gets Blocked

| Category | Examples |
|----------|----------|
| **Git destructive** | `git reset --hard`, `git checkout -- files`, `git clean -f` |
| **Git history** | `git push --force`, `git branch -D`, `git stash clear` |
| **File deletion** | `rm -rf` outside cwd, `rm -rf /`, `rm -rf ~` |
| **Dynamic execution** | `xargs rm -rf`, `find -delete`, shell wrappers |

### What's Allowed

| Category | Examples |
|----------|----------|
| **Safe git** | `git checkout -b`, `git restore --staged`, `git branch -d` |
| **Safe deletion** | `rm -rf /tmp/*`, `rm -rf ./build` (within cwd) |
| **Preview** | `git clean -n`, `--dry-run` variants |

### Custom Rules

Create `.safety-net.json` in your project:

```json
{
  "version": 1,
  "rules": [
    {
      "name": "block-git-add-all",
      "command": "git",
      "subcommand": "add",
      "block_args": ["-A", "--all", "."],
      "reason": "Use 'git add <specific-files>' instead."
    }
  ]
}
```

---

## Project Structure

```
ai-devkit/
├── src/
│   ├── cli.ts              # Entry point
│   ├── commands/
│   │   ├── init.ts         # Interactive setup
│   │   └── update.ts       # Update checker
│   ├── installers/
│   │   ├── claude.ts       # Claude Code installer
│   │   ├── cursor.ts       # Cursor installer
│   │   ├── opencode.ts     # OpenCode installer
│   │   ├── mcp.ts          # MCP server installer
│   │   ├── rules.ts        # Rules installer
│   │   ├── beads.ts        # Beads issue tracker
│   │   ├── safety-net.ts   # Safety Net (CC only)
│   │   └── continuous-claude.ts  # (CC only)
│   └── utils/
├── commands/               # Slash command templates
├── skills/                 # Skill definitions
├── rules/                  # Framework rules
├── mcp/
│   └── servers.json        # MCP server registry
└── claude-code-safety-net/ # Safety net plugin
```

---

## Development

### Setup

```bash
# Install dependencies
bun install
# or
npm install
```

### Run Locally

```bash
bun run dev
# or
npm run dev
```

### Type Check

```bash
bun run typecheck
# or
npm run typecheck
```

### Build

```bash
bun run build
# or
npm run build
```

---

## Extras

### Beads Integration

[Beads](https://github.com/beads-ai/beads-cli) is an issue tracker designed for AI agents. The CLI can:

- **Full setup**: Install CLI, initialize beads, configure hooks
- **MCP only**: Just add the beads MCP server

### Continuous Claude

Based on **[Continuous Claude v2](https://github.com/parcadei/Continuous-Claude-v2)** — session continuity for Claude Code with:

- `thoughts/` directory for persistent context
- Ledgers for tracking work
- Handoff notes between sessions

---

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run type checks: `bun run typecheck`
5. Submit a pull request

---

## License

MIT

---

<p align="center">
  <a href="https://github.com/Konan69">
    <img src="https://img.shields.io/badge/Built%20by-Konan-red?style=for-the-badge&logo=github" />
  </a>
  🏎️
</p>

<p align="center">
  Made with ❤️ for developers who ship fast with AI
</p>