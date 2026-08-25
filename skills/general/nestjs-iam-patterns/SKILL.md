---
name: nestjs-iam-patterns
description: 'Design and implement authentication and authorization (IAM) in a NestJS backend: JWT access/refresh tokens, session-based auth with Passport and Redis, API keys for machine-to-machine access, RBAC roles, granular permissions, policy-based/ABAC authorization, Google Sign-In, and TOTP/2FA. Use this whenever the user asks to add login, sign-up, or sign-in to a NestJS app; wants JWT access and refresh tokens with rotation; needs session-based auth with Redis; needs API keys for service-to-service or webhook integrations; wants role-based, permission-based, or policy-based authorization; asks to add Google Sign-In or OAuth login; wants to add two-factor authentication or TOTP; or is unsure which authentication or authorization pattern fits their NestJS project and asks for a recommendation.'
metadata:
  author: github.com/alpha018
  version: "1.0"
compatibility: For NestJS backend projects. Session-based auth and refresh-token rotation examples assume Redis is available; JWT-only flows do not require it.
---

## Why this exists

NestJS IAM has several valid authentication mechanisms (JWT, session, API key) and several valid authorization mechanisms (roles, permissions, policies), and they are not interchangeable: picking the wrong one for the situation creates real problems later (unrevocable sessions, over-broad access checks, unnecessary Redis dependency). This skill's job is first to help pick the right pattern for what the user is actually building, then to implement it correctly using the reference material.

## Ground rule: this is pattern reference, not a template to paste verbatim

Every reference file below documents a working pattern with real code, but a NestJS project already has its own module structure, entity shapes, and naming conventions. Before writing code:

- Inspect the existing project: is there already a `users` module, an existing `User` entity, an existing auth module partially built? Extend what exists rather than generating a parallel structure.
- Only implement the pieces the user actually asked for. A request to "add login" does not imply adding TOTP, API keys, and policies unless asked.
- Adapt naming, module boundaries, and error-handling conventions to match the rest of the codebase, not the reference examples.

## Choosing an authentication pattern

Authentication answers "who are you?" NestJS supports three primary mechanisms, and picking between them is a real architectural decision, not a style preference:

| Pattern                        | Use when                                                                                                                                            | Avoid when                                                                                                |
|--------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------|
| **JWT (access + refresh)**     | Stateless clients (SPA, mobile), multiple horizontally-scaled backend instances, server-to-server calls where a shared session store is undesirable | Instant revocation is a hard requirement and adding a token-versioning or blocklist layer is out of scope |
| **Session (Passport + Redis)** | Traditional server-rendered web apps, cookie-based flows, when instant revocation and centrally-controlled logout matter more than statelessness    | Mobile/native clients, multi-region deployments without a shared, low-latency session store               |
| **API key**                    | Machine-to-machine integrations, CLIs, webhooks, third-party service access, not a human user's login session                                       | Any flow where a human is authenticating interactively                                                    |

These are not mutually exclusive: a NestJS app can accept JWT **or** API key on the same route (`@Auth(AuthMethod.Bearer, AuthMethod.ApiKey)`, OR semantics; see `references/jwt-authentication.md`). JWT and session auth are rarely combined for the same client type, since they solve the same problem two different ways.

Read `references/jwt-authentication.md`, `references/session-authentication.md`, or `references/api-key-authentication.md` for the one(s) relevant to the task, not all three by default.

## Choosing an authorization strategy

Authorization answers "what can you do?" and is a separate decision from authentication:

| Pattern | Question it answers | Use when |
|---|---|---|
| **Roles (RBAC)** | What type of user is this? | A small, fixed set of user categories (`admin`, `regular`) with broadly different access levels |
| **Permissions** | What specific actions can this user perform? | Access needs to be granular (`create_invoice`, `delete_invoice`) and doesn't map cleanly onto a handful of roles |
| **Policies (ABAC)** | Does this user satisfy a contextual rule? | The rule depends on runtime context a static role/permission can't express: resource ownership, tenant membership, age, org affiliation |

These commonly layer rather than compete: a role narrows the space, permissions grant specific actions within it, and a policy adds a contextual check on top (e.g. "admin, with `users.delete`, but only within their own organization"). Read `references/authorization-strategies.md` for the guards, decorators, and this layering pattern in detail.

## Supplementary authentication factors

- **Google Sign-In**: an alternative identity source layered onto the existing JWT-issuing flow, not a replacement for it. See `references/supplementary-factors.md`.
- **TOTP / 2FA**: an additional factor checked during sign-in on top of whichever primary mechanism is in use, not a standalone authentication method. See `references/supplementary-factors.md`.

## Implementation checklist

1. Confirm with the user (or infer from the request) which authentication and authorization patterns actually apply, and don't implement all of them by default.
2. Read only the reference file(s) needed for the chosen pattern(s).
3. Check the project's existing `User`/entity shape, module structure, and DTO/validation conventions before adding new ones.
4. Wire guards globally through `AuthenticationGuard` (or the project's existing equivalent) rather than applying them ad hoc per controller, unless the project already does otherwise.
5. Before calling the implementation done, check `references/production-checklist.md` for anything relevant to what was just built (token TTLs, hashing, rate limiting, revocation, logging of secrets) and flag any gaps to the user rather than silently shipping them unaddressed.

## Gotchas

- A refresh-token TTL passed as a plain number to `jsonwebtoken`/`@nestjs/jwt` is interpreted in **seconds**, not milliseconds.
- Storing full `role`/`permissions` claims inside a JWT makes them stale until the token expires: a revoked permission still works until then. Mitigate with short-lived access tokens, session/user versioning, or a lightweight revocation check.
- A TOTP secret cannot be stored as an irreversible hash: the server needs the original secret back to verify future codes. It needs encryption at rest or a secrets manager, not `bcrypt`.
- Activate 2FA only after the user proves they registered the QR code correctly (`generate` → `verify` → `enable`), not immediately on secret generation. Otherwise a failed setup can lock the user out.
- A Redis key scoped only to `userId` for refresh-token storage allows one active session per user; concurrent sessions across devices need a per-session key (e.g. `refresh-token:{userId}:{sessionId}`).
- Roles typically combine with `.some()` (any listed role passes); permissions typically combine with `.every()` (all listed permissions required). Mixing these up silently changes the access model.
- `@JoinTable()` belongs on `ManyToMany` relations, not `OneToMany`/`ManyToOne`.
- `401` means authentication failed (no valid credentials); `403` means authentication succeeded but the user isn't authorized for this action. Don't conflate them.
