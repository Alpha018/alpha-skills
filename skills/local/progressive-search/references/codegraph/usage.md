# CodeGraph — code, symbols, dependencies

CodeGraph is a pre-built knowledge graph of every symbol, call edge, and file in the workspace. One call returns verbatim line-numbered source, the call path among relevant symbols, and a blast-radius summary of what depends on them. It's faster and more accurate than grep + read for code, because it answers structural questions grep can't — call graphs, dependency direction, blast radius — in the same call that returns the source.

## The only tool: `mcp__codegraph__codegraph_explore`

Pass either a natural-language question or a bag of symbol/file names. Returns the verbatim source (same `<n>\t<line>` format as `Read`) plus call graph and impact summary.

See `examples.md` for varied query shapes.

## When to use which input style

- **Natural language** when you don't know exact symbol names yet, or the question spans multiple files ("how does X work", "what handles Y").
- **Symbol/file list** once you know the names — it narrows the graph traversal and returns tighter, more relevant results than a broad question would.

## Usage notes

- One call usually answers the whole question. Use CodeGraph **before** reading files for code — it returns verbatim source anyway, and adds the call graph for free.
- After getting results: check the in-session graph (see `../../SKILL.md`) for whether these symbols are already covered, then follow any cross-module references before concluding.
- Always check blast radius before editing a shared symbol — a change that looks local can ripple through call sites CodeGraph would have surfaced in one call.
- If `codegraph_explore` doesn't respond at all, treat CodeGraph as unavailable and fall back to `../linux-fallback/usage.md`.

## Setup

Not installed, or the tool doesn't respond? See the skill's root `README.md` for install and MCP wiring instructions — CodeGraph is a separate project (`colbymchenry/codegraph`) this skill depends on but doesn't bundle.
