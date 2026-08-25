# CLAUDE.md Best Practices

`CLAUDE.md` is a critical file for providing project-specific context to Claude Code. It serves an onboarding guide for AI to your project requirements and codebase. Whenever Claude's AI model writes new or modifies existing code in your project, the first thing it will do is check the CLAUDE.md file.

## File location, file format and how Claude AI uses it

`CLAUDE.md` file is typically placed in the root of the project repository. The file itself is structured in markdown format (.md stands for markdown).

Anthropic's docs say CLAUDE.md is part of Claude Code's project memory, loaded at the start of each conversation, and that Claude treats it as context rather than hard enforcement.

## 10 Sections to Include in your CLAUDE.md

### 1. Project overview

The highest-value section that creates context for Claude. Explain in plain language:
- What the product is
- Who it is for
- What the app is trying to optimize for
- Most important business or UX constraints

**Best practices:** Keep this to a few paragraphs. Claude does better with a crisp mental model than with a long brand story.

❌ Bad: long origin story, generic statements ("we value innovation"), marketing copy with no implementation relevance.

✅ Good: "This is a B2B analytics dashboard for operations managers." / "Primary goal: reduce time-to-insight."

```md
## Project Overview
This project is a web app for product designers to generate and refine landing pages with AI.
Primary users are startup founders and marketers who want high-quality output fast.

The product optimizes for:
- visual polish
- speed of iteration
- clean responsive code
- easy handoff to engineering

Avoid over-engineering. Prefer clarity over cleverness.
```

💡 Pro tip: Write this section so Claude can answer "What kind of product is this, and what should it optimize for?"

### 2. Tech stack

Prevents bad assumptions. Without this section, Claude may introduce libraries that are technically valid but wrong for your project. State the actual framework, programming language, styling system, component library, state management, testing framework, build tooling, backend/data layer.

**Best practices:** Be explicit. Don't write "React stack" when you mean "Next.js App Router + TypeScript + Tailwind + shadcn/ui + Supabase". Also include what NOT to use.

```md
## Tech Stack
- Next.js 15 with App Router
- TypeScript
- Tailwind CSS
- shadcn/ui
- React Hook Form + Zod for forms
- Supabase for auth and data
- Vitest for unit tests

Do not introduce:
- Redux
- styled-components
- Material UI
unless explicitly requested.
```

### 3. Architecture

Teach Claude how the repo is organized: major directories, responsibilities of each area, data flow, separation of concerns, where new code should go.

**Best practices:** Focus on decision rules, not just folder names.

❌ Bad: `src/components contains components`
✅ Good: `Use src/components/ui for reusable presentational components. Use src/features/* for domain-specific UI and logic. Keep API calls out of presentational components.`

```md
## Architecture
- `app/` contains routes and server components
- `components/ui/` contains reusable design-system components
- `components/marketing/` contains landing-page sections
- `lib/` contains utilities, API helpers, and shared config
- `features/` contains feature-specific business logic
- `types/` contains shared TypeScript types

Rules:
- Keep page-level composition in route files
- Move repeated UI into reusable components
- Keep side effects out of UI components when possible
- Prefer server-side data fetching unless client interactivity is required
```

💡 Pro tip: Add a short "where new things go" subsection.

⚠️ Important: If you use API calls to 3rd party services and need to store API keys, keep them in `.env` at the project root, and tell Claude explicitly: `API keys are stored in '.env'`. This prevents Claude from storing keys in random places and minimizes exposure risk.

### 4. Coding conventions

Second most important section: it directly impacts code output quality. Include naming conventions, component patterns, typing standards, file size preferences, import conventions, error handling, comments, async patterns.

**Best practices:** Use clear rules, not vague preferences.

❌ Weak: "Write clean code"
✅ Strong: "Use named exports except for route files" / "Avoid `any`; prefer inferred types or explicit interfaces" / "Keep components under 200 lines unless justified"

```md
## Coding Conventions
- Use TypeScript strictly; avoid `any`
- Prefer functional components
- Prefer named exports for shared modules
- Use async/await instead of chained promises
- Keep components focused and composable
- Extract repeated logic into hooks or helpers
- Prefer descriptive variable names over abbreviations
- Add comments only when intent is non-obvious
- Do not leave dead code or commented-out blocks
```

💡 Pro tip: Make rules actionable enough that Claude can follow them automatically.

### 5. UI and design system rules

For frontend projects, this section is gold. Define visual style, spacing philosophy, typography approach, interaction patterns, responsiveness, accessibility expectations, component usage rules.

```md
## UI and Design Rules
- Use shadcn/ui primitives as the default foundation
- Prefer spacious layouts and strong visual hierarchy
- Use restrained color usage; rely on typography, spacing, and contrast
- Prefer 8px spacing rhythm
- Buttons should have clear primary/secondary hierarchy
- Forms should be short, scannable, and mobile-friendly
- Every interactive element must have visible hover, focus, and disabled states
- Meet accessibility expectations for contrast, labels, and keyboard navigation
```

💡 Pro tip: Don't just say "make it modern"; always translate style into implementation guidance.

### 6. Content and copy guidance

Underrated, especially for landing pages and product work. State how copy should sound: concise or detailed, technical or plain language, aspirational or practical, sentence length, headline style, forbidden patterns.

**Best practices:** Include examples of good copy for your product; link to existing brand guidelines.

```md
## Content Guidelines
- Use concise, confident language
- Avoid hype and empty marketing phrases
- Headlines should be clear before clever
- Body copy should focus on user outcomes
- Prefer short paragraphs and scannable structure
- Avoid jargon unless the audience clearly expects it
```

### 7. Testing and quality bar

Claude should know how finished work is validated: what tests to add, when tests are required, lint/typecheck expectations, what "done" means.

```md
## Testing and Quality
Before considering a task complete:
- run typecheck
- run lint
- run relevant tests for modified logic

Testing rules:
- add unit tests for reusable logic
- do not add heavy test scaffolding for simple presentational sections
- ensure responsive behavior for UI changes
- verify empty, loading, and error states where relevant
```

💡 Pro tip: You can test not only functional, but business logic too.

### 8. File and component placement rules

Stops repo drift, especially useful in mature repos where duplicate components become a problem fast. Define where to create new files, when to edit existing files, when to create abstractions, naming patterns.

```md
## File Placement Rules
- Add new landing-page sections to `components/marketing/sections`
- Add reusable primitives to `components/ui`
- Put shared helpers in `lib`
- Do not create a new abstraction for one-off usage
- Prefer editing existing components over creating near-duplicates
```

### 9. Safe-change rules

Very valuable for real projects. Tell Claude what it should avoid changing casually. This reduces "technically smart but operationally risky" edits that lead to costly refactoring.

```md
## Safety Rules
- Do not rename public API routes unless explicitly requested
- Do not change database schema without calling it out clearly
- Do not modify auth flows unless the task requires it
- Preserve backward compatibility for shared components
- Flag major architectural changes before implementing them
```

### 10. Specific commands

Anthropic recommends giving Claude concrete project context; commands are part of that operational context. Add the actual commands Claude should use (install, dev, build, lint, test, format, storybook, safe SQL commands). Only include commands that are real and current.

```md
## Commands
- Install: `pnpm install`
- Dev: `pnpm dev`
- Build: `pnpm build`
- Lint: `pnpm lint`
- Typecheck: `pnpm typecheck`
- Test: `pnpm test`
```
