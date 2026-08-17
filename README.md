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

Each skill is a folder with a required `SKILL.md` (frontmatter plus instructions) and, optionally, `references/`, `scripts/`, and `assets/`. A skill's real identity is the `name` field in its frontmatter, not its folder path, though the two are kept in sync here.

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
