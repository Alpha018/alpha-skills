# QMD — example queries

Terms below (`widget setup flow`, `ADR-0001`, `design-docs`) are placeholders — swap in the real terms, IDs, and collection names for whatever you're searching.

## Combined lex + vec (default first pass)

Best overall quality — run both, let QMD's reranker sort it out.

```
mcp__qmd__query(
  searches=[{type:'lex', query:'widget setup flow'}, {type:'vec', query:'steps to configure a new widget'}],
  intent='stages of the widget setup flow and their validations',
  collection='design-docs'     # optional — omit to search all collections
)
```

## Exact identifier

Use `lex` alone when you have a precise ID and don't want semantic drift.

```
mcp__qmd__query(
  searches=[{type:'lex', query:'ADR-0001'}],
  intent='details of ADR-0001'
)
```

## Semantic-only, terminology unknown

Use `vec` alone when you know the concept but not the exact wording the docs use.

```
mcp__qmd__query(
  searches=[{type:'vec', query:'why we chose our current background job system'}],
  intent='rationale for the background job system choice'
)
```

## `hyde` — describe the answer, not the question

Useful when a direct query underperforms because the doc's phrasing is very different from how you'd naturally ask.

```
mcp__qmd__query(
  searches=[{type:'hyde', query:'This document explains the retry and backoff policy for failed widget jobs, including max attempts and delay curve.'}],
  intent='retry and backoff policy for failed widget jobs'
)
```

## Filtering noise with `minScore`

When a broad query returns too many marginal hits.

```
mcp__qmd__query(
  searches=[{type:'lex', query:'widget'}, {type:'vec', query:'widget lifecycle'}],
  intent='widget lifecycle overview',
  minScore=0.5
)
```

## Retrieving full documents

```
mcp__qmd__get(path='widget-setup-flow.md')     # by path (relative to collection)
mcp__qmd__get(path='#abc123')                  # by doc ID from search results
mcp__qmd__get(path='widget-teardown.md:120')   # from a specific line
```

## Batch retrieval

Grab a whole set of related documents in one call instead of looping `get`.

```
mcp__qmd__multi_get(paths='notes/2024-*.md')          # glob
mcp__qmd__multi_get(paths='adrs/ADR-0001.md,adrs/ADR-0002.md')   # comma-separated
```

## Combined example: a code question that leads to a doc

**Request:** "Where is WidgetGateway called and what does it validate?"

```
Looking for code behavior → CodeGraph path (../codegraph/usage.md).

mcp__codegraph__codegraph_explore("WidgetGateway callers and what it validates")
→ Returns: WidgetGateway source, called from WidgetController,
  validates request size + rate limits, returns WidgetResult

Re-index graph: question answered.

But the source references ADR-0001 about the widget storage backend → QMD path.
mcp__qmd__query(searches=[{type:'lex', query:'ADR-0001'}], intent='decision behind the widget storage backend')
mcp__qmd__get(path='adrs/ADR-0001-widget-storage.md')
→ Found: rationale for the storage backend selection, constraints considered

Re-index: graph now covers code + decision context. Respond.
```
