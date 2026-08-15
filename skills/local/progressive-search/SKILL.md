---
name: progressive-search
description: Progressive search for this repository using QMD (Markdown docs) and CodeGraph (code), with grep/find as fallback, and an in-session memory graph with re-indexing. Use whenever you need to find information in Markdown docs (design docs, ADRs, meeting notes, tickets, wikis) or in the codebase (symbols, call graphs, dependencies) — whether QMD and CodeGraph are installed or not. Triggers on "search the docs for X", "find X in the repo", "what does the ADR say about X", "how does X work in the code", "where is X defined", "what calls this service", "what did the meeting notes say about X", or any discovery task in this codebase.
metadata:
  author: github.com/alpha018
compatibility: Benefits from the `qmd` and `codegraph` MCP servers if connected; falls back to grep/find when either is unavailable.
---

# progressive-search

Reading whole files is the last resort, not the first move. This skill keeps an in-session graph of what's already known, searches surgically, and re-indexes that graph before going back to disk — so later searches build on earlier ones instead of repeating them.

## Route by what you're looking for

| Looking for | Path |
|---|---|
| Code behavior, symbols, call graphs, dependencies | `references/codegraph/usage.md` (examples: `references/codegraph/examples.md`) |
| Markdown docs — ADRs, design docs, meeting notes, tickets | `references/qmd/usage.md` (examples: `references/qmd/examples.md`) |
| Both | CodeGraph first, then QMD |
| Neither tool responds | `references/linux-fallback/usage.md` |

Setup for QMD and CodeGraph (they're separate projects this skill depends on, not bundled with it) is in the skill's `README.md`.

Check availability once, up front: `mcp__codegraph__codegraph_explore` responds → CodeGraph OK. `mcp__qmd__status` responds → QMD OK. Both tools work on whatever repository you're in — code language and doc topics don't matter to the process. Adapt the vocabulary in the reference files' examples to the actual project, not the other way around.

## In-session graph (applies to every path)

Keep a running inventory as you search:

```
Sources read: [file/docid → section covered]
Concepts confirmed: [term → source]
Symbols found: [symbol → file:line]
References pending: [not yet followed]
Contradictions: [source A says X, source B says Y]
```

Check it before every new search — never repeat a lookup already done. After updating it, re-index: does the graph answer the original question yet?

- **Yes** → respond now.
- **No** → name the one missing node and search for exactly that, nothing broader.

Information from separate sources often combines into an answer that none of them gave alone — that's why re-indexing happens before, not after, deciding to search again. If 3–4 full cycles still haven't converged, stop and report what was searched, what was found, and what's still missing.

## Example

`references/qmd/examples.md` walks through a combined lookup end to end: a code question routed to CodeGraph, which surfaces a doc reference that then gets chased down in QMD.
