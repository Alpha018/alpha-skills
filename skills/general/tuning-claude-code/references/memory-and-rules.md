# Layers 1-2: Project memory and path-scoped rules

## Where instructions come from

Claude Code assembles its instructions from several files. Roughly from lowest
to highest precedence, all additive:

1. Managed or enterprise policy, if an org deployed one.
2. `~/.claude/CLAUDE.md`, your personal file, applied to every repo.
3. The repo's root `CLAUDE.md`, committed, shared by the team.
4. A nested `CLAUDE.md` in a subdirectory, pulled in when files under it are
   touched.
5. Local uncommitted overrides: `CLAUDE.local.md` where still honored, or an
   untracked nested file.
6. The automatic memory tool, writing session notes as it goes.

Only 2 through 4 are things you sit down and write for a project.

## The size limit is not cosmetic

The root `CLAUDE.md` is prepended at session start and is part of the block
re-sent whenever a turn misses the prompt cache. A heavy standing file has two
costs. It spends tokens on every turn for the life of the session, and it
makes cache behavior worse: a large static preamble means a small change early
in the conversation invalidates more of it, and the cache misses are where
latency and spend jump.

Working number: keep it well under a couple hundred lines of genuinely static
content, and make each line pay for itself with a behavior change. If a line
would not alter what the agent does, cut it.

## What goes in the root file

- One or two lines on what the service is and its stack.
- A directory map: the responsibility of each top-level folder.
- Build, test, lint, and typecheck commands, written out exactly.
- Invariants that cross module boundaries. Example for a double-entry ledger
  service: "every posting balances to zero before it is persisted; the balance
  check lives in `packages/domain/posting.ts` and nowhere else."
- Prohibitions as flat statements: "never run a schema push against a
  non-local database; migrations only, via `pnpm db:migrate`."
- Pointers: "a change under `packages/db/` means reading that folder's rule
  file before planning."
- The pre-PR checklist: run contract tests, update the changelog, invoke the
  release skill.

Keep it imperative. "All exported functions declare an explicit return type."
Not "we care about type safety."

## `@import`

The root file can pull in another file instead of inlining it:

```markdown
Architecture overview: @docs/architecture.md
TypeScript conventions: @.claude/standards/typescript.md
```

The imported content is spliced in when the importing file loads, so it still
costs tokens. Use it only for content that is always relevant, not as a way to
reintroduce a manual you just trimmed.

## Path-scoped rules

A convention that only matters for part of the tree should cost nothing until a
file in that part is in play.

### Option A: nested `CLAUDE.md`, works everywhere

Drop a `CLAUDE.md` into `apps/worker/`. When the agent reads or plans a change
under that directory, the file is merged in. No configuration.

### Option B: rule file with glob frontmatter, newer

```markdown
---
name: db-rules
description: >
  Conventions for packages/db/**. Loaded only when Claude edits or plans a
  change to the schema or a migration.
globs:
  - "packages/db/**"
  - "test/db/**"
---
# Database package rules

## Schema
- The schema is defined once, in `packages/db/schema/`. Do not redefine
  columns inline in a query.
- Money columns are `bigint` holding minor units. Never `numeric`, never a
  float.

## Migrations
- Every schema change ships with a generated migration in
  `packages/db/migrations/` in the same commit.
- Never edit an already-applied migration. Add a new one.
- No data backfill inside a migration file over ~100 rows. Write a separate
  script under `scripts/backfill/` and note it in the PR.

## Tests
- Unit tests in this package use the in-memory driver, never a real
  connection.
- Integration tests live under `test/db/integration/` behind a `pnpm test:db`
  script.
```

### The bug to know about

The documented frontmatter key is `paths:`, and some builds silently ignore
it. If a rule is not loading, switch to `globs:` or a comma-separated string,
then confirm by making a trivial edit inside the scoped directory and checking
the rule text shows up in context.

## How to split

Three or four small scoped files beat one large root file. Sensible seams: one
file per app or package, one for the test layer, one for a high-risk area such
as migrations, generated code, or anything touching money or auth. Each only
costs tokens when that area is being worked on.
