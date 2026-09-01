# Layers 4-5: Custom subagents and packaged skills

## Subagents

A subagent runs a task in a separate context window with its own system prompt
and its own tool allowlist. Its intermediate steps never reach the main
context; only the final result does. That separation is the reason to use one.
Keep exploration, review, and repeated narrow jobs out of the working context
so the main loop stays on the task.

### When one is worth writing

- A job you run most sessions: contract-test runs, dependency audits, schema
  reviews.
- A role that should have a deliberately small tool set, like a read-only
  reviewer.
- A role whose instructions would contradict the main config if you inlined
  them.

### The file

`.claude/agents/migration-reviewer.md`:

```markdown
---
name: migration-reviewer
description: >
  Reviews any diff under packages/db/ for schema and migration mistakes.
  Read-only. Run before opening a PR that changes the schema or adds a
  migration.
tools: Read, Grep, Glob, Bash(git diff:*), Bash(pnpm test:db:*)
model: sonnet
---
You review database changes for the ledger-api repo.

Scope:
- Only files under packages/db/** and test/db/**.
- Ignore unrelated files even when they show up in the diff.

Checklist, in order:
1. Schema change has a matching generated migration in the same commit.
2. No already-applied migration was edited. New change means a new file.
3. Money columns stay bigint minor units. Flag any numeric or float.
4. No inline backfill over ~100 rows inside a migration file.
5. Down-migration is present and actually reverses the up.
6. Integration tests under test/db/integration/ cover the new column or table.

Output:
- One-word verdict: pass / needs-changes / blocker.
- Bulleted findings, each with a file path and a one-line fix.
- No unrelated refactor suggestions.
```

### The frontmatter that does the work

- `tools:` is a tight allowlist. Scoped `Bash(...)` patterns stop a reviewer
  from doing anything but read and run named commands.
- `model:` sends reviewers, runners, and formatters to a cheaper model. The
  main loop keeps the stronger model for reasoning that needs it.
- `description:` must state when to invoke, such as "run before a PR that
  changes the schema". Without that, the subagent is never called on its own.

### Notes

A reviewer needs a numbered checklist and a fixed output shape. Free-form
review output is hard to act on; "verdict plus findings with paths" is not.

## Skills

A skill packages a settled workflow behind a name. It loads in stages, which
is why a large library of them stays cheap:

1. Name and description at startup, around a hundred tokens.
2. The body only once the skill triggers.
3. Bundled `scripts/` and `references/` only when the body points at them.

### When to package

Package a workflow after it has stopped changing. An unstable one in a skill
just means editing the skill on every run. A checklist in a scoped rule file
holds you over until then.

### The file

`.claude/skills/new-endpoint/SKILL.md`:

```markdown
---
name: new-endpoint
description: >
  Scaffold a new HTTP endpoint in apps/api from the project's route template:
  handler, schema, service call, and a route test. Use when the user says
  "add an endpoint for ..." or "expose ... over the API."
allowed-tools: Read, Write, Edit, Bash(pnpm test:*), Bash(pnpm lint:*)
---
# new-endpoint

## When to use
The user wants a new route added under apps/api/src/routes/.

## Gather first
1. Method and path.
2. Request and response shape.
3. Which service method it calls, or whether one needs to be added.
4. Auth: public, authenticated, or service-to-service.

## Steps
1. Read apps/api/src/routes/_template/ for the route layout.
2. Create the route folder, slug is kebab-case from the path.
3. Write the request/response schema with the shared validator.
4. Wire the handler to the service method. If the method is missing, stop and
   ask before inventing one.
5. Add a route test alongside, following an existing test in the folder.
6. Run `pnpm lint` and `pnpm test` for the new route only.

## Do not
- Do not edit the _template folder.
- Do not add a new top-level dependency.
- Do not open a PR. That flow is the release-checklist skill.
```

### Notes

- `allowed-tools` is what makes the skill deterministic. Grant what the
  workflow needs and nothing that reaches outside its scope. A skill that can
  push to a remote has given that up.
- Chain instead of merging. Point at the next skill, such as "the PR flow is
  in X", rather than one skill that scaffolds, tests, and releases.
- Keep `SKILL.md` short; long templates and tables go in `references/`.
