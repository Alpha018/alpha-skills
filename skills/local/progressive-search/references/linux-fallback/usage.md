# grep/find — fallback when QMD/CodeGraph are unavailable

Use this path only when `mcp__qmd__status` or `mcp__codegraph__codegraph_explore` don't respond. It's strictly worse for large repos — no ranking, no call graph, no semantic matching — but works with nothing installed.

## Markdown

```bash
grep -rn "term" . --include="*.md" -l             # list matching files
grep -rn "term" . --include="*.md"                # with line numbers
find . -name "*.md" -path "*keyword*" -not -path "*/node_modules/*"
grep -rn "term1\|term2\|term3" path/ --include="*.md"   # multiple terms, one pass
```

## Code

Match the file extensions to the language(s) actually used in the repository — `.ts`/`.tsx` for TypeScript, `.py` for Python, `.go` for Go, and so on.

```bash
grep -rn "SymbolName\|functionName\|/endpoint" . --include="*.ts" -l
grep -rn "import.*ServiceName" . --include="*.ts"
find . -name "*.ts" -path "*module-name*" -not -path "*/node_modules/*"
```

## Read by section only

Use the grep output to jump directly to the relevant part instead of reading whole files:

```
Read <file> offset:<grep_line - 10> limit:350
```

Max 350–400 lines per block. If the relevant section isn't in the first block, run a more specific grep — don't just read further. Stop as soon as you have the target content and at least one reference to follow.

## Move off this path

If grep is standing in only because QMD/CodeGraph aren't installed yet, install them — see the skill's root `README.md`. Once installed, re-check availability and switch to `../qmd/usage.md` / `../codegraph/usage.md` for the rest of the session.
