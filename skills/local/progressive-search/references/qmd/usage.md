# QMD — Markdown documentation

QMD indexes the repository's Markdown documents with BM25 + vector search + reranking. Prefer it over grep for Markdown discovery — it ranks by relevance instead of just matching substrings, so it surfaces the right document even when your search terms don't appear verbatim in it.

## 1. Check collection health first

```
mcp__qmd__status
```

Confirms which collections exist in this repository, their doc counts, and whether embeddings are active. Collection names and topics vary per project (design docs, ADRs, sprint notes, integration guides, reference material, and so on) — never assume names from a previous project; read them off `status` each time.

## 2. Query

| Goal | Type to use |
|---|---|
| Best overall (first pass) | `lex` + `vec` combined |
| Exact identifier (ticket ID, ADR, endpoint) | `lex` only |
| Meaning-based (terminology may vary) | `vec` |
| Describe what the answer looks like | `hyde` |

Always provide `intent` — it sharpens snippet relevance by telling the reranker what a good match actually looks like, beyond the literal query terms.

See `examples.md` for the full range of query shapes (combined, exact-ID, semantic, `hyde`, filtered, batch retrieval).

## 3. Retrieve full documents

Snippets are starting points — retrieve the full document before making load-bearing claims. A snippet can look conclusive out of context and still misrepresent what the full document says.

## 4. Follow references in documents

For each link, ADR ID, ticket, or service name found:

1. Check the in-session graph (see `../../SKILL.md`) — already covered?
2. `mcp__qmd__query` with `type:'lex'` for exact identifiers, `type:'vec'` for concepts.
3. `mcp__qmd__get` for the full document.
4. Update the inventory before following the next reference.

## Setup

Not installed, or `status` doesn't respond? See the skill's root `README.md` for install and MCP wiring instructions — QMD is a separate project (`tobi/qmd`) this skill depends on but doesn't bundle.

If `status` responds but shows `Vectors: 0`, embeddings haven't been generated yet — run `qmd embed` in a terminal (10–30 min, ~300MB download, offline after that). Semantic (`vec`, `hyde`) queries won't return results until this finishes; `lex` queries still work.
