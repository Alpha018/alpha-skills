# Layer 7: The MCP server stack

## Why the list should be short

Every configured server contributes tool schemas to the context, and those
schemas ride along on every turn. A large list, a dozen servers with dozens of
tools, spends thousands of tokens per turn before the agent has done anything,
and it makes tool selection worse: the agent reaches for the wrong tool or
cycles between several.

Lazy loading, where a tool's full schema loads only when it is needed, cuts
the per-turn cost a lot. It is still a mitigation. A short, chosen list wins on
every axis: less to load, fewer wrong picks, easier to reason about.

## The five that pull their weight

For a real engineering setup:

1. **Code intelligence with cross-session memory.** A server that indexes
   symbols, call graphs, and dependencies and keeps that index between
   sessions. The biggest token saver on longer work, because it replaces the
   grep-then-read loop with one query.
2. **VCS.** A GitHub or GitLab server for branches, commits, PRs, and CI
   status.
3. **Filesystem.** For directories outside the current repo, such as a sibling
   package or a shared config folder.
4. **Live web search.** For documentation and release notes newer than the
   model's training.
5. **Version-pinned library docs.** A server that fetches docs for the exact
   version in `package.json`, so generated code matches the installed API.

Add a sixth only for a concrete need. Two that earn it often enough to name:

- **A local knowledge-base indexer** (QMD or similar) when the repo carries a
  real docs, ADR, or runbook corpus. It gives the agent one search over that
  Markdown instead of a `grep` sweep, the same way code intelligence does for
  source. Skip it when the docs are a single short README.
- **A database server** for someone who inspects production data shapes
  directly.

Stop there.

## Sample `.mcp.json`

```json
{
  "mcpServers": {
    "codegraph": {
      "command": "npx",
      "args": ["-y", "<code-graph-server>@latest"],
      "env": { "PROJECT": "ledger-api", "MEMORY_DIR": ".codegraph" }
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": { "GITHUB_PERSONAL_ACCESS_TOKEN": "${GITHUB_TOKEN}" }
    },
    "filesystem": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "${HOME}/code/ledger-api",
        "${HOME}/code/ledger-shared"
      ]
    },
    "web-search": {
      "command": "npx",
      "args": ["-y", "<search-server>"],
      "env": { "API_KEY": "${SEARCH_API_KEY}" }
    },
    "library-docs": {
      "command": "npx",
      "args": ["-y", "<library-docs-server>@latest"]
    },
    "qmd": {
      "command": "qmd",
      "args": ["mcp"]
    }
  }
}
```

The `qmd` entry is the optional sixth from above; drop it on a repo with no
real docs corpus. Server package names move around, so read the
entries as roles, not exact picks, and pin versions wherever the server allows
it.

## Auditing a list you inherited

- Count servers and tools. Past roughly 30 tools, something has to go.
- Per server, ask whether the agent has used it in the last week. If not, drop
  it; re-adding takes seconds.
- Look for overlap, such as two servers that both fetch web pages. Keep one.
- For large doc pulls, prefer a server that returns results inline over one
  that forces a file write the agent then reads back.

## Project vs. personal scope

Project servers go in the repo's `.mcp.json`, committed, so the whole team
gets them. Personal servers, such as your own search key or an editor bridge,
go in the user-level config so they do not leak into the repo.
