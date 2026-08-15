# progressive-search

### Code and docs discovery for AI agents

A skill for finding things in a codebase or its docs without falling back to ad-hoc greps and full-file reads. It also keeps a running graph of what it already knows during a session and checks that before going back to disk, so fewer tool calls and less context get burned per lookup.

---

## How it routes

| Looking for | Tool | Falls back to |
|---|---|---|
| Code: symbols, call graphs, dependencies | [CodeGraph](https://github.com/colbymchenry/codegraph) | grep/find |
| Docs: Markdown, ADRs, notes, tickets | [QMD](https://github.com/tobi/qmd) | grep/find |

See [`SKILL.md`](SKILL.md) for the routing logic the agent follows, and `references/` for tool-specific usage and examples.

## Dependencies

This skill needs two MCP servers connected. Without them it still works, just via the grep/find fallback in `references/linux-fallback/usage.md`, which is slower and less accurate. Install both if you'll be using this skill often.

| Tool | Install | Build the index |
|---|---|---|
| QMD | `npm install -g @tobilu/qmd` | `qmd collection add ./docs --name docs && qmd update` |
| CodeGraph | `npm install -g @colbymchenry/codegraph` | `codegraph init` |

Once the CLIs are installed, the simplest way to wire them up is a project-scoped `.mcp.json` at your repository's root:

```json
{
  "mcpServers": {
    "qmd": { "command": "qmd", "args": ["mcp"] },
    "codegraph": { "command": "codegraph", "args": ["serve", "--mcp"] }
  }
}
```

Commit that file and every contributor gets both servers automatically when they open the project.

### QMD, for Markdown search

Hybrid BM25 and vector search with reranking over a repository's Markdown files.

- **Project:** [github.com/tobi/qmd](https://github.com/tobi/qmd)
- **Package:** [`@tobilu/qmd`](https://www.npmjs.com/package/@tobilu/qmd) on npm

```bash
# Install
npm install -g @tobilu/qmd

# Point it at your content and build the index
qmd collection add ./docs --name docs
qmd update

# Optional but recommended: enables semantic (vec/hyde) search
qmd embed

# Wire up as an MCP server for Claude Code (recommended)
claude plugin marketplace add tobi/qmd
claude plugin install qmd@qmd
```

Manual MCP config (Claude Desktop, `claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "qmd": { "command": "qmd", "args": ["mcp"] }
  }
}
```

### CodeGraph, for code search

A pre-indexed knowledge graph of every symbol, call edge, and file in the workspace, kept in sync as files change.

- **Project:** [github.com/colbymchenry/codegraph](https://github.com/colbymchenry/codegraph)
- **Package:** [`@colbymchenry/codegraph`](https://www.npmjs.com/package/@colbymchenry/codegraph) on npm

```bash
# Install
npm install -g @colbymchenry/codegraph

# Build the graph for this project
cd your-project
codegraph init

# Wire up Claude Code, Cursor, Codex, and others automatically
codegraph install
```

Manual MCP config (`~/.claude.json`):

```json
{
  "mcpServers": {
    "codegraph": { "type": "stdio", "command": "codegraph", "args": ["serve", "--mcp"] }
  }
}
```

## Without either tool

The skill falls back to `grep`/`find`. See `references/linux-fallback/usage.md`. It still works, just without ranking, semantic matching, or a call graph.
