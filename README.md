# Alpha Skills

### Homelab automation, packaged as Agent Skills

A homelab skills repository with two purposes that stay strictly separate: a growing collection of [Agent Skills](https://agentskills.io) meant for publishing to [skills.sh](https://www.skills.sh), and a set of local MCP servers built on top of those same skills' reference docs, for running homelab automation from this repo.

---

## What's here

| Purpose | Location | What it is |
|---|---|---|
| Published skills | `skills/` | Agent Skills meant to be published to skills.sh, for anyone to install |
| MCP servers | `mcp-servers/` | stdio MCP servers built on top of the published skills' reference docs, published to npm for anyone to run via `npx` |

## Published skills

| Skill | Category | Covers |
|---|---|---|
| [`nextdns-api`](skills/external/nextdns-api) | `external` | Full reference for the [NextDNS](https://nextdns.io) REST API: profiles, security/privacy/parental-control settings, denylist and allowlist management, analytics, and query logs. Includes a quick-reference table, common curl patterns, and a mirrored OpenAPI spec. |
| [`progressive-search`](skills/local/progressive-search) | `local` | A discovery workflow that routes code questions to [CodeGraph](https://github.com/colbymchenry/codegraph) and Markdown/doc questions to [QMD](https://github.com/tobi/qmd), falling back to grep/find when neither is connected. Keeps an in-session graph of what's already been found so later searches build on earlier ones instead of repeating them. |
| [`agent-context-generator`](skills/general/agent-context-generator) | `general` | Generates, refreshes, reviews, or audits a project's `CLAUDE.md`/`AGENTS.md`, grounded in what the repo actually contains (real dependencies, real folder layout, real scripts) instead of a generic template, and keeps both files in sync when a project has both. |
| [`nestjs-iam-patterns`](skills/general/nestjs-iam-patterns) | `general` | Authentication and authorization patterns for NestJS: JWT access/refresh tokens, session auth, API keys, RBAC, permissions, policy-based (ABAC) authorization, Google Sign-In, and TOTP/2FA, led by a decision guide for which pattern fits a given situation. |
| [`nestjs-advanced-patterns`](skills/general/nestjs-advanced-patterns) | `general` | Advanced NestJS internals (DI tokens, dynamic modules, runtime discovery, durable providers, worker threads, circuit breaker), WebSocket gateways, and microservices (transporter selection across TCP/Redis/MQTT/NATS/RabbitMQ/Kafka/gRPC), led by a decision table for which mechanism fits a given problem. |
| [`obsidian-second-brain`](skills/general/obsidian-second-brain) | `general` | A decision guide for running an Obsidian vault as a lasting knowledge system: which of the four organizers leads (PARA folders, Zettelkasten links, or a mix), a small capture-and-review loop, plugin hygiene, Bases vs Dataview, a set of templates, and an optional MCP layer for handing the vault to an agent. Leads with when Obsidian is the wrong tool. |

Each skill is a folder with a required `SKILL.md` (frontmatter plus instructions) and, optionally, `references/`, `scripts/`, and `assets/`. A skill's real identity is the `name` field in its frontmatter, not its folder path, though the two are kept in sync here.

### Installing a skill

Use the [`skills` CLI](https://www.npmjs.com/package/skills) to pull skills straight from this repo, no cloning required. One command per skill:

```bash
npx skills add Alpha018/alpha-skills -s nextdns-api
npx skills add Alpha018/alpha-skills -s progressive-search
npx skills add Alpha018/alpha-skills -s agent-context-generator
npx skills add Alpha018/alpha-skills -s nestjs-iam-patterns
npx skills add Alpha018/alpha-skills -s nestjs-advanced-patterns
npx skills add Alpha018/alpha-skills -s obsidian-second-brain
```

Repeat `-s` to install several at once, and add `-a <agent>` to target a specific agent (e.g. `claude-code`) instead of letting the CLI ask:

```bash
npx skills add Alpha018/alpha-skills -s nextdns-api -s progressive-search -a claude-code
```

`-y` skips confirmation prompts, and `--copy` copies the skill files instead of symlinking them. `npx skills add Alpha018/alpha-skills -l` lists every skill in the repo without installing anything.

## MCP servers

| Server | Package | Transport | Exposes |
|---|---|---|---|
| [`nextdns`](mcp-servers/nextdns) | [`@alpha018/nextdns-mcp`](https://www.npmjs.com/package/@alpha018/nextdns-mcp) | stdio | Getting/updating a NextDNS profile's settings, managing list entries, pulling analytics, reading logs |

Each server runs as a local subprocess via `npx`, not a hosted service, and its request/response shapes are kept in sync with the matching skill's reference docs (`skills/external/nextdns-api/references/api-reference.md` for `nextdns`). Versioning is automated: [semantic-release](https://semantic-release.gitbook.io) cuts a release and publishes to npm on every merge to `main` that touches the server's directory, based on its Conventional Commits. See each server's own `README.md` for setup and its full tool list.

## Repository structure

```
skills/
  external/       # third-party services/APIs
    nextdns-api/
  local/          # self-hosted homelab infra, local developer workflows
    progressive-search/
  general/        # cross-cutting utilities not tied to a specific service
    agent-context-generator/
    nestjs-iam-patterns/
    nestjs-advanced-patterns/
    obsidian-second-brain/
skills.sh.json    # groupings shown on the skills.sh listing page
mcp-servers/
  nextdns/        # stdio MCP server built on the nextdns-api skill's reference docs, published as @alpha018/nextdns-mcp
.github/
  workflows/      # shared PR-test and build-publish CI covering every mcp-servers/* package
AGENTS.md         # conventions this repo follows, gitignored, not part of the published content
CLAUDE.md         # symlink to AGENTS.md
```

## Publishing to skills.sh

The `skills.sh.json` groupings plus `skills/<category>/<name>/SKILL.md` layout is already what skills.sh expects. No restructuring needed when a skill is ready to publish, just register its slug in the matching grouping in `skills.sh.json`.
