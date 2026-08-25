# agent-context-generator

### Generate, refresh, review, or audit a project's CLAUDE.md / AGENTS.md

A skill for producing an onboarding file for Claude Code (or an
AGENTS.md-style equivalent) that's grounded in what a repo actually looks
like: real dependencies, real folder layout, real scripts, instead of
generic boilerplate. It also handles refreshing a stale one after a
refactor, reviewing an existing one, and keeping CLAUDE.md and AGENTS.md in
sync when a project has both.

---

## Why

A vague CLAUDE.md ("we value clean code") gives Claude nothing to act on,
so it falls back to guessing: wrong libraries, wrong folder placement,
style drift. This skill's ground rule is *derive, don't invent*: every
section it writes comes from something actually observed in the repo
(`package.json`/lockfiles, folder structure, existing config, git remote),
not from a template. When something can't be confirmed, it's flagged as
TBD or asked about directly rather than filled in with a plausible guess.

See [`SKILL.md`](SKILL.md) for the full inspection checklist and the
10-section structure it follows, and
[`references/claude-md-best-practices.md`](references/claude-md-best-practices.md)
for the worked good/bad examples behind each section.

## What it produces

- A new `CLAUDE.md` for a repo that doesn't have one yet, scaled to how
  much there actually is to document (a near-empty scaffold gets a short
  file, not a padded one).
- An updated `CLAUDE.md` after the project has drifted from what's
  documented (new module, migrated framework, etc.).
- A review/audit of an existing `CLAUDE.md` against current repo state.
- Coordination with an existing `AGENTS.md`: merging or flagging
  conflicts instead of silently duplicating or contradicting it.

## Files in this skill

| File | What it has |
|---|---|
| `SKILL.md` | The inspection checklist, the 10-section structure, and output rules |
| `references/claude-md-best-practices.md` | Section-by-section breakdown with good/bad examples |
| `evals/evals.json` | Eval cases (self-contained sample projects under `evals/files/`) |
| `evals/trigger-eval.json` | Should-trigger / should-not-trigger prompts for the skill description |
