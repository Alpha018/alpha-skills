---
name: agent-context-generator
description: 'Generate, refresh, review, or audit a project CLAUDE.md file (or an AGENTS.md-style equivalent, including keeping the two in sync) so Claude Code gets real, project-specific onboarding context instead of guessing. Use this whenever the user asks to create, write, scaffold, update, improve, review, or audit a CLAUDE.md/AGENTS.md file; asks "what should go in CLAUDE.md"; says a CLAUDE.md is stale or out of date after a refactor or new feature; asks to document project rules, conventions, or guidelines "for the AI" or "for Claude" even without naming the file explicitly; or is setting up a new repo for Claude Code with no project instructions yet. Also trigger when the user complains that Claude keeps making wrong assumptions about their stack, conventions, or folder structure, or keeps repeating the same corrections every session — a well-built CLAUDE.md is the fix.'
metadata:
  author: github.com/alpha018
  version: "1.0"
compatibility: Works with any coding agent that can read the project's filesystem (package manifests, folder structure, existing config). No MCP servers or external services required.
---

## Why this exists

`CLAUDE.md` is the first thing Claude Code reads before touching a project's code. A vague or generic one (marketing copy, "we value clean code") gives Claude nothing to act on, and it falls back to guessing. That's where wrong libraries, wrong folder placement, and style drift come from. A good one reads like operational rules a new hire could follow on day one.

Full source material and worked examples: `references/claude-md-best-practices.md` (10-section breakdown, good/bad examples, pro tips). Skim it before writing: don't rely on the section list below alone, the reference has the nuance.

## Ground rule: derive, don't invent

Never write a CLAUDE.md from generic assumptions. Every section should come from something you actually observed in the repo. Before drafting, inspect the project:

- `package.json` (or `pyproject.toml`, `Cargo.toml`, `go.mod`, etc.): real dependencies, scripts/commands, package manager in use (check for `pnpm-lock.yaml` / `yarn.lock` / `package-lock.json` to know which one).
- Folder structure (`ls`, or a quick tree of `src/`, `app/`, `components/`, etc.): actual architecture, not a template.
- A handful of existing files: naming conventions, export style, component patterns, whether TypeScript is strict, whether comments are used.
- Existing config: linter/formatter config, test framework config, `.env.example`, CI files.
- Version control: is there a `.git` directory, and if so what host/remote (`git remote -v`: GitHub, GitLab, Bitbucket, self-hosted, or none yet), what's the default branch, and is there a CI config tied to it (`.github/workflows/`, `.gitlab-ci.yml`, `Jenkinsfile`, etc.)? This shapes real workflow facts (PR vs. MR terminology, which CI actually runs, whether there's a remote to push to at all). Note it in Project overview or Architecture rather than assuming GitHub by default.
- If there's an existing README, design system docs, or a CLAUDE.md/AGENTS.md already, read it: don't contradict or duplicate it silently; merge or flag conflicts.
- If the project is empty or a fresh scaffold (nothing to observe yet), say so and ask the user directly for the missing specifics (target users, tech choices) rather than filling gaps with boilerplate.

If you can't determine something confidently (e.g. there's no clear "where new things go" pattern yet), leave it out or note it as TBD rather than inventing a plausible-sounding rule. A shorter, accurate CLAUDE.md beats a complete, fabricated one.

**When missing info blocks a real decision, ask instead of leaving a silent TBD.** A TBD note is fine for something genuinely undecided and low-stakes. But when the gap is something that will actually steer how code gets written (which framework, which error-handling standard, what the project is even for beyond "a template"), stop and ask the user directly instead of shipping a CLAUDE.md that quietly punts on it. One clear question beats a vague placeholder nobody follows up on.

**Pin versions, not just names.** When you name a dependency in Tech Stack or elsewhere, include its version from `package.json`/`pyproject.toml`/etc. (e.g. "NestJS 10", not just "NestJS"). Recommendations and code generated against the wrong major version are a common source of wrong output; the version is what makes a tech-stack entry actionable.

**Write CLAUDE.md in English, always.** This file is read by Claude, not end users: write it in English regardless of what language the user's request came in (a Spanish request still gets an English CLAUDE.md). This is separate from what language the *project's* user-facing copy should be in. If the project targets Spanish-speaking users, say so in Project Overview / Content Guidance in English, the same way you'd describe any other fact about the project.

**Write for an AI reader, not a human skimmer.** No emojis, no decorative callouts: plain `##` headers, bullet lists, and code fences are the whole toolkit. Keep prose tight; prefer a bullet over a sentence, a sentence over a paragraph. This file gets read at the start of every session, so every extra word is a recurring cost.

## The 10 sections

Use these as the default structure, and skip any section that has nothing real to say for this project rather than padding it out. For a small project, 4-5 tight sections beat 10 thin ones.

1. **Project overview**: what the product is, who it's for, what it optimizes for. A few sentences, not brand history.
2. **Tech stack**: explicit framework/language/styling/state/testing/backend choices **with their versions** (from the lockfile/manifest), plus what NOT to use if that matters here. Identify the actual build/transpile tool in use (`tsc`, `swc`, `webpack`, `esbuild`, `vite`, …). Don't leave it implicit.
3. **Architecture**: directories, their responsibilities, and *decision rules* for where new code goes (not just "components contains components"). Look for an underlying design pattern already in use (hexagonal/ports-and-adapters, clean architecture, MVC, feature-sliced, layered, etc.) and name it if the folder/code layout implies one, inferring this from evidence and only asking the user if the layout is genuinely ambiguous. Call out where secrets live (e.g. `.env`) and tell Claude explicitly so it doesn't scatter keys elsewhere.
4. **Coding conventions**: naming, component patterns, typing standards, import/async patterns, and doc-comment style (JSDoc/TSDoc, docstrings, etc.) if the codebase already uses one. For REST/API backends specifically, check whether an error-handling and error-response format convention already exists (a base exception class, a consistent error envelope, a global exception filter actually wired up and applied, not just defined). Then:
   - **A real, applied convention exists**: document it as authoritative, don't override it. If it doesn't already align with a recognized standard like RFC 9457 ("Problem Details for HTTP APIs"), you can still add one line noting that as a possible future improvement, framed as an idea to raise with the user, not a change to make unprompted.
   - **No convention, or only partially wired** (e.g. exception classes exist but nothing ever calls them / no filter is registered): call out the gap explicitly, and default to proposing RFC 9457 as the target shape, but phrase it as a suggestion to confirm with the user before adopting, not a decision already made on their behalf.
5. **UI and design system rules** (frontend projects only): visual style, spacing, component usage, accessibility expectations. Translate any stated "look and feel" into implementation guidance, not adjectives.
6. **Content and copy guidance** (when copy quality matters, e.g. landing pages, product UI): tone, sentence length, forbidden patterns.
7. **Testing and quality bar**: what "done" means, expressed as an ordered flow rather than a loose command list (e.g. "before considering a task complete, run: lint → format → typecheck → test", in the order the project's own pre-commit hook or CI actually runs them if one exists), plus what needs coverage vs. what doesn't.
8. **File and component placement rules**: where new files of each kind go, when to avoid creating a new abstraction.
9. **Safe-change rules**: two parts. (a) What Claude should not change casually (public APIs, DB schema, auth flows) without flagging it first. (b) Forward-looking considerations worth recording for both the user and future Claude sessions, such as security-sensitive spots, likely bypass points, or improvements worth making later. This section is a place to leave notes, not just prohibitions.
10. **Specific commands**: only real, current commands (install/dev/build/lint/typecheck/test), taken from `package.json` scripts or equivalent, never guessed. Keep this proportional to the project: a one-line quick-start (e.g. `docker compose up`) beats reproducing an entire multi-stage Dockerfile or build pipeline verbatim; link to the file instead of inlining all of it.

## Output format

Write directly to `CLAUDE.md` in the project root (ask before overwriting if one already exists with real content: diff mentally against what you're proposing and preserve anything still accurate). Use `##` headers matching the section names above. Follow the good/bad example patterns in the reference file: short, imperative, concrete rules over prose paragraphs. Include fenced code blocks for commands.

After writing, tell the user which sections you included, which you skipped and why, and flag anything you couldn't verify confidently (so they can fill it in or correct it).
