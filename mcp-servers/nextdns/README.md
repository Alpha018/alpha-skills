# nextdns-mcp

Local stdio MCP server exposing the NextDNS REST API as tools. Claude Code
(or any MCP-compatible client) launches this as a subprocess — there is no
hosting, no deployment, no persistent service. It runs only while your
session is open.

Shapes are kept in sync with
[`skills/external/nextdns-api/references/api-reference.md`](../../skills/external/nextdns-api/references/api-reference.md)
in this repo — check that file if a tool call fails validation after
NextDNS changes their API.

## Tools

| Tool                                               | Covers                                                                                                                        |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `get_profile` / `update_profile`                   | `/profiles/:profile`                                                                                                          |
| `get_security` / `update_security`                 | `/profiles/:profile/security`                                                                                                 |
| `get_privacy` / `update_privacy`                   | `/profiles/:profile/privacy`                                                                                                  |
| `get_parental_control` / `update_parental_control` | `/profiles/:profile/parentalControl`                                                                                          |
| `get_settings` / `update_settings`                 | `/profiles/:profile/settings`                                                                                                 |
| `manage_list_entries`                              | denylist, allowlist, security.tlds, privacy.blocklists, privacy.natives, parentalControl.services, parentalControl.categories |
| `get_analytics`                                    | all 11 analytics dimensions, with optional time series                                                                        |
| `list_logs` / `clear_logs`                         | `/profiles/:profile/logs`                                                                                                     |

Not included (v1): `logs/stream` (Server-Sent Events, doesn't fit a
request/response tool call) and `logs/download` (redirects to a signed file
URL — better handled outside an MCP tool for now).

## Setup

1. Get your NextDNS API key from https://my.nextdns.io/account.
2. Build:
   ```bash
   cd mcp-servers/nextdns
   npm install
   npm run build
   ```
3. Register with Claude Code (project-scoped example):

   ```bash
   claude mcp add nextdns \
     --env NEXTDNS_API_KEY=your-api-key-here \
     -- node "$(pwd)/dist/index.js"
   ```

   Or add directly to `.mcp.json`:

   ```json
   {
     "mcpServers": {
       "nextdns": {
         "command": "node",
         "args": ["/absolute/path/to/mcp-servers/nextdns/dist/index.js"],
         "env": { "NEXTDNS_API_KEY": "your-api-key-here" }
       }
     }
   }
   ```

   Environment variables for local MCP servers are stored unencrypted in
   Claude's local config, readable only by your user account — fine for a
   personal homelab key, but don't reuse a high-value secret here.

4. Verify: run `/mcp` in Claude Code and confirm `nextdns` is listed, then
   try asking it to fetch a profile.

## Development

```bash
npm run dev         # run directly with tsx, no build step
npm run typecheck    # tsc --noEmit
npm run build         # compile to dist/
```
