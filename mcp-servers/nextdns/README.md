# nextdns-mcp

### Local MCP server for the NextDNS API

Local stdio MCP server exposing the NextDNS REST API as tools. Claude Code (or any MCP-compatible client) launches this as a subprocess. There's no hosting, no deployment, no persistent service; it runs only while your session is open.

---

## Quick facts

| | |
|---|---|
| Package | [`@alpha018/nextdns-mcp`](https://www.npmjs.com/package/@alpha018/nextdns-mcp) on npm, run via `npx` |
| Transport | stdio, launched as a subprocess |
| Language | TypeScript |
| Auth | `NEXTDNS_API_KEY` environment variable |
| Versioning | [Semantic Versioning](https://semver.org) via [semantic-release](https://semantic-release.gitbook.io), driven by Conventional Commits |
| Source of truth | [`skills/external/nextdns-api/references/api-reference.md`](../../skills/external/nextdns-api/references/api-reference.md) |

Shapes are kept in sync with that reference doc in this repo. Check it if a tool call fails validation after NextDNS changes their API.

## Tools

| Tool | Covers |
|---|---|
| `get_profile` / `update_profile` | `/profiles/:profile` |
| `get_security` / `update_security` | `/profiles/:profile/security` |
| `get_privacy` / `update_privacy` | `/profiles/:profile/privacy` |
| `get_parental_control` / `update_parental_control` | `/profiles/:profile/parentalControl` |
| `get_settings` / `update_settings` | `/profiles/:profile/settings` |
| `manage_list_entries` | denylist, allowlist, security.tlds, privacy.blocklists, privacy.natives, parentalControl.services, parentalControl.categories |
| `get_analytics` | all 11 analytics dimensions, with optional time series |
| `list_logs` / `clear_logs` | `/profiles/:profile/logs` |

Not included (v1): `logs/stream` (Server-Sent Events, doesn't fit a request/response tool call) and `logs/download` (redirects to a signed file URL, better handled outside an MCP tool for now).

## Setup

1. Get your NextDNS API key from https://my.nextdns.io/account.
2. Register with Claude Code (runs the published package via `npx`, no clone or build needed):

   ```bash
   claude mcp add nextdns \
     --env NEXTDNS_API_KEY=your-api-key-here \
     -- npx -y @alpha018/nextdns-mcp
   ```

   Or add directly to `.mcp.json`:

   ```json
   {
     "mcpServers": {
       "nextdns": {
         "command": "npx",
         "args": ["-y", "@alpha018/nextdns-mcp"],
         "env": { "NEXTDNS_API_KEY": "your-api-key-here" }
       }
     }
   }
   ```

   Environment variables for local MCP servers are stored unencrypted in Claude's local config, readable only by your user account. Fine for a personal homelab key, but don't reuse a high-value secret here.

3. Verify: run `/mcp` in Claude Code and confirm `nextdns` is listed, then try asking it to fetch a profile.

## Development

Working against a local checkout instead of the published package:

```bash
cd mcp-servers/nextdns
npm install
npm run dev          # run directly with tsx, no build step
npm run typecheck    # tsc --noEmit
npm run build        # compile to dist/
```

## Releasing

Two workflows split versioning from publishing, because `@semantic-release/npm` only knows how to authenticate with a classic `NPM_TOKEN`, not npm's OIDC trusted publishing:

1. Every push to `main` that touches this directory triggers [`.github/workflows/release-nextdns-mcp.yml`](../../.github/workflows/release-nextdns-mcp.yml): it builds, tests, then runs [semantic-release](https://semantic-release.gitbook.io) (scoped to this package via `semantic-release-monorepo`, so commits touching other parts of the repo don't trigger a release) with `npmPublish` disabled. It bumps `package.json`, writes `CHANGELOG.md`, and cuts a GitHub release and matching `nextdns-mcp-v*` tag from the Conventional Commit types on the merged commits (`fix` → patch, `feat` → minor, `BREAKING CHANGE` → major).
2. That tag push triggers [`.github/workflows/publish-nextdns-mcp.yml`](../../.github/workflows/publish-nextdns-mcp.yml), which checks out the tagged commit and runs `npm publish` directly. No `NPM_TOKEN` secret: the npm CLI (≥ 11.5.1, hence the explicit upgrade step) detects the GitHub Actions OIDC context from `id-token: write` and exchanges it for a short-lived publish token.

For step 2 to work, `@alpha018/nextdns-mcp` needs a one-time [Trusted Publisher](https://docs.npmjs.com/trusted-publishers) link on npmjs.com (package Settings page) pointing at this repo and the `publish-nextdns-mcp.yml` workflow.
