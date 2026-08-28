# tuning-claude-code

### Build the whole Claude Code configuration stack for a repo, not just the memory file

The quality you get out of Claude Code on a project depends less on the prompt
than on the configuration around it: the memory file, the scoped rules, the
subagents, the hooks, the MCP list, the worktree habit. A repo with none of
that set up makes the agent rebuild context every session. A repo with too
much of it pays for that weight on every turn. This skill is the procedure for
tuning it deliberately.

## What happens when this triggers

Ask to "set up Claude Code for this repo" or say "the agent is slow and keeps
grabbing the wrong tools," and the skill first reads what is already there,
then adds layers in order, top-down, because each one is easier to keep small
once the one above it is disciplined.

- **Project memory as a budget question.** The root `CLAUDE.md` rides every
  cache-miss turn and degrades cache hits once it grows past a couple hundred
  lines. The skill keeps it short and imperative and moves file-specific
  detail into path-scoped rules. Drafting the memory content itself is handed
  to `agent-context-generator`.
- **The layers most setups skip:** subagents with narrow tool lists on a
  cheaper model, skills locked down with `allowed-tools`, `PreToolUse` and
  `PostToolUse` hooks for determinism, and an MCP list trimmed to about five
  servers.
- **The automation track:** git worktrees scoped to separate directories, and
  headless `claude -p` runs in CI that defer a push to a protected branch for
  approval instead of failing overnight.
- **A baseline** for teams that will not build the full stack, plus the
  signals that tell you when to add each further layer.

## Why a procedure instead of a template

The worst outcome is a heavy standing context, a long memory file or a dozen
servers, that costs tokens on every turn and pushes the real work out of the
window on long tasks. Pasting a maximal `.claude/` recreates exactly that. The
skill reads the repo first and adds each layer against a named problem:
subagents when a task recurs every session, skills when a workflow has
settled, worktrees when branch-switching gets frequent, headless when there is
work worth running while nobody is watching.

## What's in the folder

| File | Contents |
|---|---|
| [`SKILL.md`](SKILL.md) | The eight layers, the baseline list, the audit procedure, a gotchas section |
| [`references/memory-and-rules.md`](references/memory-and-rules.md) | The memory locations, why the size limit is real, `@import`, and the two scoped-rule mechanisms plus the `paths:` bug |
| [`references/subagents-and-skills.md`](references/subagents-and-skills.md) | Subagent vs. skill, the frontmatter that matters (`tools`, `model`, an active `description`), `allowed-tools` lockdown |
| [`references/hooks-and-determinism.md`](references/hooks-and-determinism.md) | Hook events, the two to set up first, a sample `settings.json`, the gate script, deferred permissions |
| [`references/mcp-server-stack.md`](references/mcp-server-stack.md) | Why the list should be short, the five roles that pull their weight, a sample `.mcp.json`, how to audit an inherited list |
| [`references/worktrees-and-headless.md`](references/worktrees-and-headless.md) | A worktree workflow, a nightly contract-test and draft-PR CI job, how the gate and headless resume connect |
| [`evals/trigger-eval.json`](evals/trigger-eval.json) | Should-trigger and should-not-trigger prompts for the description |

## What it won't do

It won't drop in a maximal `.claude/` and call the job done; that just moves
the weight problem into the repo. It also does not address context rot on long
sessions; compaction and tool-result clearing are a separate concern.
