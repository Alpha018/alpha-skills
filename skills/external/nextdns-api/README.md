# nextdns-api

### Reference skill for the NextDNS REST API

A skill for working with the [NextDNS](https://nextdns.io) REST API. NextDNS has no official SDK, everything is plain HTTPS and JSON, so this skill exists to save an agent from guessing field names, enums, and defaults while writing a curl call, a script, or a full integration against it.

---

## Quick facts

| | |
|---|---|
| Base URL | `https://api.nextdns.io` |
| Auth | `X-Api-Key` header, key from [my.nextdns.io/account](https://my.nextdns.io/account) |
| Format | JSON over HTTPS, no official SDK |

See [`SKILL.md`](SKILL.md) for the quick-reference table and common curl patterns, and `references/api-reference.md` for the full parameter tables, JSON schemas, and example responses.

## What's covered

Everything the NextDNS dashboard exposes: profile management, security/privacy/parental-control toggles, denylist and allowlist entries, settings, analytics, and query logs. The reference docs also cover pagination and the time-series (`;series`) query parameters used by the analytics and logs endpoints.

## Auth

```bash
curl -sH "X-Api-Key: $NEXTDNS_API_KEY" \
  "https://api.nextdns.io/profiles/$PROFILE_ID/denylist"
```

## Files in this skill

| File | What it has |
|---|---|
| `SKILL.md` | Overview, quick-reference table, common curl patterns, and the procedure for keeping the reference current |
| `references/api-reference.md` | The full reference: every endpoint, parameter, schema, and example response |
| `references/openapi.yaml` | The same API as an OpenAPI 3.0 spec, useful for codegen or a structured diff |
| `references/openapi.html` | A static Redoc build of the spec, easier to browse than raw YAML |
| `scripts/render-docs.sh` | Lints `openapi.yaml` and regenerates `openapi.html`. Run after any edit to the YAML and commit both together |

## A local MCP server built on this reference

This repository also has [`mcp-servers/nextdns`](../../../mcp-servers/nextdns), a local MCP server that wraps the NextDNS API as MCP tools, using this skill's reference docs as its source of truth for request and response shapes. It's published as [`@alpha018/nextdns-mcp`](https://www.npmjs.com/package/@alpha018/nextdns-mcp) and runs via `npx`, no clone required. If you're building automation against NextDNS in an MCP-aware client rather than writing raw HTTP calls, that's the more direct route.

## Keeping this current

NextDNS's own docs at [nextdns.github.io/api](https://nextdns.github.io/api/) are hand-written HTML, so there's no upstream spec to diff against automatically. Before relying on this skill for something high-stakes, or if asked to check for API changes, compare that page against `references/api-reference.md` and `references/openapi.yaml`, and update both together if anything has drifted. New analytics dimensions and new settings/security/privacy toggles are the fields that have changed historically. The full procedure is in the "Keeping this up to date" section at the bottom of `references/api-reference.md`.
