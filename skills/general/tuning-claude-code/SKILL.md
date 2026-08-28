---
name: tuning-claude-code
description: >
  Design the full Claude Code configuration stack for a repo: a lean project
  memory file, path-scoped rules, plan mode, custom subagents, packaged skills,
  deterministic hooks, a pruned MCP server list, and parallel worktrees plus
  headless CI runs, so the agent ships more with fewer tokens and less
  babysitting. Use when the user wants to set up, tune, optimize, audit, or
  clean up their `.claude/` directory or `.mcp.json`; complains that Claude
  Code is slow, expensive, forgetful on long tasks, or "confused" by too many
  tools; asks how to structure subagents, hooks, skills, or MCP servers; wants
  to cut context or token usage or improve prompt-cache hit rate; asks about
  plan mode, git worktrees for parallel agents, or running Claude Code
  non-interactively in CI. For writing the CLAUDE.md prose itself, use
  agent-context-generator; this skill decides the architecture and budget
  around it.
metadata:
  author: github.com/alpha018
  version: "1.0"
compatibility: >
  Targets Claude Code (CLI, IDE, and headless `-p` mode). Some layers depend
  on the installed version. Hooks with a `defer` decision, rule files with
  glob frontmatter, and named plan tiers are recent additions, and the skill
  marks which parts are version-dependent. No external services are required
  beyond whatever MCP servers the user chooses to keep.
---

## What this skill is for

The output quality of Claude Code on a repo is set less by the prompt than by
what surrounds it: the memory file, the rules, the subagents, the hooks, the
MCP list, the worktree habit. A repo with none of that configured makes the
agent re-derive context every session. A repo with too much of it makes every
turn expensive. This skill walks the configuration in order and adds only the
pieces a given project needs.

Order matters. Each layer gets easier to keep small once the layer above it is
disciplined, so work from the top. The costliest single mistake is a heavy
standing context, a long `CLAUDE.md` or a dozen MCP servers, because that
weight is re-sent on turns that miss the cache and it crowds out the actual
work on long tasks.

Treat what follows as a checklist to apply against a real repo. It is not a
bundle to copy in wholesale.

## Procedure

1. **Look at what exists.** `ls -R .claude`, read the current `CLAUDE.md`,
   enumerate MCP servers from `.mcp.json` and the user config. Write down the
   heavy items: memory-file length, server count, any always-loaded subagents
   or skills.
2. **Agree on how far to go.** Small repos are fine with the short list under
   "Baseline". Add layers past that only against pain the user can name, like
   "the reviewer keeps missing migration bugs" or "nightly runs die on the
   push step".
3. **Work top-down and check each layer** before starting the next. Where
   behavior is version-dependent, test it in the installed version instead of
   trusting this doc.
4. **Record what changed.** A line in the PR description or a comment saying
   which layers were added and why, so whoever reads the repo next knows the
   stack is deliberate.

## Baseline

The short list, for a team that will not build the whole thing:

- A brief, imperative `CLAUDE.md` at the repo root.
- Path-scoped rules for the two directories that get edited most.
- One `PostToolUse` hook that runs the formatter after writes.
- Three MCP servers at most: code intelligence, VCS or filesystem, library docs.
- A team habit of entering plan mode before any change that could be wrong.

Then, as the signals appear: a subagent once a task recurs every session; a
skill once a workflow has stopped changing; worktrees once people switch
branches several times an hour; headless mode once there is work worth running
overnight.

## The eight layers

### Layer 1: Project memory

`CLAUDE.md` at the repo root is read at session start and travels with every
turn that misses the cache. Keep it short and phrased as instructions. A line
earns its place only by changing what the agent does. "Money values are
integer minor units, never floats" changes behavior; "prioritize code
quality" does not. Cover what each top-level directory owns, the exact
build, test, and lint commands, and the hard rules: invariants between
modules, files that must not be edited.

Hand the actual drafting to the `agent-context-generator` skill. This skill
owns the budget question: when the file is already long, the answer is to
push the file-specific parts down into Layer 2, not to add more headings.

See `references/memory-and-rules.md` for why the size limit is real, the full
list of memory locations, and how `@import` behaves.

### Layer 2: Path-scoped rules

A convention that only applies to one part of the tree should not sit in the
root file where it is loaded constantly. Move it to a scoped rule so it costs
nothing until a matching file is in play. Two ways, depending on version:

- A nested `CLAUDE.md` inside the directory, loaded when the agent reads or
  edits files in that subtree. Works everywhere.
- A rule file under `.claude/rules/` with a `globs:` frontmatter list. Newer,
  and the documented `paths:` key is dropped by a bug in some builds, so use
  `globs:` and confirm the rule actually loads.

Several small scoped files beat one large root file. Details and a full
frontmatter example are in `references/memory-and-rules.md`.

### Layer 3: Plan mode

Plan mode keeps exploration out of the working context and produces a written
plan you approve before anything is edited. Use it for any change spanning
more than one file or carrying real risk. Keep the exploration step
read-only: it should trace dependencies and list the edits it intends, with
the edits happening only after you accept the plan. If the build exposes named
tiers, pick the tier by blast radius. If not, plain plan mode covers it.

### Layer 4: Custom subagents

A subagent runs in its own context with its own prompt and tool list, and only
its result comes back. Write one when a task recurs, when a role needs a
deliberately narrow tool set, or when a role's instructions would clash with
the main config.

Frontmatter that carries weight:

- `tools:` is a tight allowlist. Scoped `Bash(...)` entries keep a reviewer
  read-only.
- `model:` drops reviewers and runners to a cheaper model; the main loop keeps
  the stronger one for the hard reasoning.
- `description:` states the trigger, such as "run before any PR that touches
  `packages/db/`". A passive description never fires on its own.

Give a reviewer a numbered checklist and a fixed output shape. See
`references/subagents-and-skills.md`.

### Layer 5: Packaged skills

A skill wraps a stable workflow behind a name and loads in stages: the name
and description at startup, the body on trigger, bundled files only when the
body asks for them. Package a workflow once it has settled. Lock it down with
`allowed-tools` so it can do its job and nothing with side effects outside its
scope. Chain to the next skill rather than growing one that does everything.
See `references/subagents-and-skills.md`.

### Layer 6: Hooks and determinism

Hooks run your commands at fixed points in the loop, configured in
`.claude/settings.json`. The two worth setting up first:

- A `PostToolUse` formatter after `Write` and `Edit`, so the file is clean
  before the next turn reads it back.
- A `PreToolUse` gate on the few genuinely risky commands, usually a push to
  the default branch.

If the build supports a `defer` decision, the gate can pause a headless run
for out-of-band approval and resume with `claude --resume`. That is what lets
an unattended job touch a protected branch safely. Full config and the gate
script are in `references/hooks-and-determinism.md`.

### Layer 7: MCP server stack

Each server adds tool schemas that ride along on every turn. Trimming the list
beats relying on lazy loading. A serious setup needs about five: code
intelligence with cross-session memory, VCS for branches and PRs, filesystem
for directories outside the repo, live web search, and version-pinned library
docs. Add a sixth only for a concrete need. Shortlist and a sample `.mcp.json`
are in `references/mcp-server-stack.md`.

### Layer 8: Parallel worktrees and headless

- Worktrees: one branch, one working copy, one session per task, in parallel
  panes. Scope each pane to a separate directory so merges stay clean.
- Headless: `claude -p` in CI with an explicit `--allowedTools` list and a
  scoped prompt, for nightly checks or fix-and-PR jobs. Pair it with the
  Layer 6 gate so a push to a protected branch defers instead of failing
  unattended.

Workflow and a sample CI job are in `references/worktrees-and-headless.md`.

## Gotchas

- **A long `CLAUDE.md` is the expensive mistake.** It rides every cache-miss
  turn and widens what a small upstream change invalidates. The fix is nearly
  always to move detail into Layer 2.
- **A rule that never loads** usually means the `paths:` bug. Switch to
  `globs:` and verify with a throwaway edit inside the scoped directory.
- **A bloated server list** shows up as wrong tool picks and tokens spent
  before any real work. Cut to five and watch what changes.
- **A subagent with a passive `description`** just sits there. It needs an
  explicit "run before X".
- **A skill that can push** wastes its `allowed-tools`. Keep side-effectful
  steps in a separate, tightly scoped skill.
- **Version drift.** `defer` hooks, `globs:` rule files, and named plan tiers
  are recent. If a layer behaves unlike this doc, check the version and adapt
  rather than fighting it.
- **Context rot is out of scope.** Long sessions still fill up with stale tool
  output; compaction and result-clearing are a separate problem.
