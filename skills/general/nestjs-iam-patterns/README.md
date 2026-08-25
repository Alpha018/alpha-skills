# nestjs-iam-patterns

### Pick the right auth pattern for a NestJS backend, then implement it correctly

NestJS doesn't force one way to handle identity and access. You can authenticate with JWT, sessions, or API keys, and authorize with roles, permissions, or policies, and each of those choices is legitimate in the right situation and a real liability in the wrong one. This skill exists so an agent (or a developer skimming it directly) doesn't default to "whatever the last tutorial used" when a project asks for login, access control, or service-to-service credentials in NestJS.

## What you get when this triggers

Say "add login to this NestJS API" and a lot of implementations reach straight for JWT because that's the most common example online, even when the project is a traditional server-rendered app that would be better served by sessions, or a machine-to-machine service that needs API keys instead of a user login at all. This skill flips that order: it asks what's actually being built first, points at the decision tables in [`SKILL.md`](SKILL.md), and only then implements the chosen pattern using the matching reference file.

Concretely, this means:

- **A recommendation before code.** For "should I use JWT or sessions here," or "roles or permissions for this," the skill gives a direct answer grounded in the specifics of the request, not a survey of all the options.
- **Working NestJS code for exactly what's needed.** Guards, decorators, DTOs, and service methods for the chosen pattern(s), adapted to the project's existing entities and module layout rather than dropped in as a parallel structure.
- **The pieces most tutorials skip.** Refresh token rotation and its Redis storage, hashing API keys instead of storing them as plain text, verifying a TOTP secret before turning on 2FA (instead of enabling it immediately and risking a lockout), and checking a Google token's `audience` explicitly.
- **A production checklist at the end**, scoped to whatever was actually built, so gaps get flagged instead of silently shipped.

## Why a decision guide instead of just documentation

Authentication and authorization are each three-way decisions, not one canonical answer:

| Layer | Options | The wrong pick usually shows up as |
|---|---|---|
| Authentication | JWT, session, API key | Sessions with no shared store once you scale out; JWTs with no way to revoke a compromised token; API keys where a human should have logged in |
| Authorization | Roles, permissions, policies | A role system too coarse for what the product actually needs; a permissions system built for two user types that never needed that much granularity |

`SKILL.md` leads with both decisions before touching implementation, because getting either one wrong tends to surface weeks later as a rewrite, not as an immediate error.

## What's in the box

| File | What it has |
|---|---|
| [`SKILL.md`](SKILL.md) | The authentication and authorization decision tables, an implementation checklist, and a list of gotchas worth knowing before shipping |
| [`references/jwt-authentication.md`](references/jwt-authentication.md) | Access + refresh tokens, rotation and revocation via Redis, the global auth-method guard, and the `@ActiveUser()` decorator |
| [`references/session-authentication.md`](references/session-authentication.md) | Passport + Redis session auth: the serializer, the session guard, and how it shares plumbing with the JWT setup |
| [`references/api-key-authentication.md`](references/api-key-authentication.md) | API key entity, hashing, the guard, and per-key scopes |
| [`references/authorization-strategies.md`](references/authorization-strategies.md) | Roles (RBAC), permissions, and policy-based (ABAC) authorization, plus how the three typically layer together |
| [`references/supplementary-factors.md`](references/supplementary-factors.md) | Google Sign-In and TOTP/2FA, both of which sit on top of a primary authentication mechanism rather than replacing one |
| [`references/production-checklist.md`](references/production-checklist.md) | A checklist spanning every pattern above, for whatever combination actually got built |
| [`evals/evals.json`](evals/evals.json) | Eval cases with self-contained sample projects (`evals/files/`) checking that the skill picks the right pattern for the scenario, not just implements whatever's asked |
| [`evals/trigger-eval.json`](evals/trigger-eval.json) | Should-trigger / should-not-trigger prompts used to validate the skill's description |

## What this skill won't do

It won't implement every mechanism at once because a project has a `users` table. It reads the actual request, checks what the project already has, and builds only that. If a request is genuinely ambiguous (a role model that could plausibly need permissions instead), it says so and asks rather than guessing.
