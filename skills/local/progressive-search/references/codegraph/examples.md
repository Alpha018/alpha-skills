# CodeGraph — example queries

Names below (`WidgetService`, `WidgetStore`, `WidgetGateway`, `WidgetController`) are placeholders — substitute the actual symbol, service, or file names relevant to whatever question you're answering.

## Natural-language question

Use when you don't yet know the exact symbol names.

```
mcp__codegraph__codegraph_explore("how does WidgetService validate an incoming request")
```

## Symbol / file names

Use once you know the names — it's the fastest, most precise form.

```
mcp__codegraph__codegraph_explore("WidgetService validateRequest WidgetStore")
```

## Architectural / cross-module question

Good for "who talks to what" questions that span multiple files.

```
mcp__codegraph__codegraph_explore("what modules call WidgetService and what do they return")
```

## Blast-radius check before a change

Run this before editing anything shared — it tells you what breaks.

```
mcp__codegraph__codegraph_explore("what depends on WidgetStore and what would break if I change its schema")
```

## Tracing a call chain end to end

Useful when a bug report names a symptom, not a symbol.

```
mcp__codegraph__codegraph_explore("trace the call path from the WidgetGateway HTTP handler down to the database write")
```

## Comparing two implementations

Works well when refactoring or deduplicating similar code.

```
mcp__codegraph__codegraph_explore("compare WidgetController and LegacyWidgetController — what do they share and where do they diverge")
```

## Following up after a QMD doc mentions a symbol

If a Markdown doc (ADR, design doc) names a class or function, jump straight to its source instead of grepping for it:

```
mcp__codegraph__codegraph_explore("WidgetCache — where is it defined and what evicts entries from it")
```
