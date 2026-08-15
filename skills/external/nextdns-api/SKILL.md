---
name: nextdns-api
description: Reference for the NextDNS REST API (https://api.nextdns.io) — profiles, security/privacy/parentalControl settings, denylist/allowlist, analytics, and DNS query logs. Use this whenever the user wants to script, curl, or automate against NextDNS — reading or changing blocklists/denylist/allowlist entries, toggling security or parental-control settings, pulling analytics or log data, streaming/downloading query logs, or building any tooling (scripts, cron jobs, dashboards, config-management, chat/CLI bots) around a NextDNS profile. Also use it to check whether the bundled OpenAPI reference is stale against the live docs. Trigger on mentions of NextDNS, DNS filtering/blocklists at the account level, or the api.nextdns.io host, even without the word "API".
license: MIT
metadata:
  author: github.com/alpha018
  version: "1.0"
---

# NextDNS API

## Overview

NextDNS exposes a REST API for everything configurable in its dashboard:
per-profile security/privacy/parental-control toggles, deny/allow lists,
logging settings, analytics, and raw DNS query logs. There is no official
SDK — everything is plain HTTPS + JSON, so this is naturally curl/script/
HTTP-client territory in whatever language or tool the caller is using.

- Base URL: `https://api.nextdns.io`
- Auth: header `X-Api-Key: <key>` (key at https://my.nextdns.io/account)
- All resources are scoped under a profile: `/profiles/:profile/...`
- Success: `{"data": ..., "meta": {...}}`. Errors: `{"errors": [{"code", "detail", "source"}]}`

## What you can build with this API

Everything the NextDNS dashboard can do is reachable here, which opens up a
few recurring categories of task:

- **Provisioning/config-as-code** — create a profile and push its full
  security/privacy/parentalControl/settings config from a JSON/YAML file,
  so a DNS profile can be version-controlled and reproduced instead of
  clicked together by hand.
- **Bulk list management** — sync a denylist or allowlist from an external
  source (a maintained blocklist, a CSV, another system's export) via the
  `PUT` full-replace or per-entry `POST`/`PATCH`/`DELETE` endpoints.
- **Scheduled/conditional toggles** — flip settings on a schedule or
  trigger, e.g. enable stricter `parentalControl` categories during certain
  hours, or toggle `settings.web3`/`security.*` flags based on external
  events.
- **Monitoring and alerting** — poll `analytics/*` (status, top blocked
  domains/devices, reasons) to build dashboards or alerts, e.g. notify when
  blocked-query volume spikes or a new device starts generating traffic.
  `;series` time-series variants make this graph-friendly.
- **Log tailing and export** — use `/logs/stream` (SSE) for a live query
  tail in a terminal or log pipeline, or `/logs/download` to pull a full
  export for offline analysis/archival.
- **Auditing/compliance checks** — periodically GET a profile's full
  config and diff it against an expected baseline to catch drift (e.g. a
  security toggle someone flipped off in the dashboard).
- **Multi-profile fleets** — the same operations against many `:profile`
  IDs, for anyone managing NextDNS for several networks/households/sites
  from one place.

## When to use

- Reading or writing denylist/allowlist entries, security/privacy toggles,
  parental-control services/categories, or profile-wide settings.
- Pulling analytics (top domains, devices, protocols, block reasons, geo) or
  raw/streamed query logs, including time-series breakdowns.
- Building or debugging any script/automation that talks to
  `api.nextdns.io` — curl, a config-management tool, a cron job, a
  dashboard, a chat/CLI bot.
- Verifying this skill's bundled reference is still accurate against the
  live docs before relying on it for something important.

## Quick reference

| Area | Base path | Key ops |
|---|---|---|
| Profile | `/profiles/:profile` | GET, PATCH (partial), DELETE; POST `/profiles` to create |
| Security | `/profiles/:profile/security` | toggles + `tlds` list |
| Privacy | `/profiles/:profile/privacy` | `blocklists`, `natives`, toggles |
| Parental Control | `/profiles/:profile/parentalControl` | `services`, `categories` (support PUT full-replace), safe-search toggles |
| Denylist / Allowlist | `/profiles/:profile/denylist` \| `/allowlist` | GET/PUT/POST/PATCH/DELETE, entries `{id, active}` |
| Settings | `/profiles/:profile/settings` | `logs`, `blockPage`, `performance`, `web3` |
| Analytics | `/profiles/:profile/analytics/<dim>` | status, domains, reasons, ips, devices, protocols, queryTypes, ipVersions, dnssec, encryption, destinations; append `;series` for time buckets |
| Logs | `/profiles/:profile/logs` | list, `/stream` (SSE), `/download`, DELETE to clear |

Full parameter tables, every JSON schema, and every example response are in
`references/api-reference.md` — read it before writing any non-trivial call
(anything beyond a single GET) so you get field names, enums, and defaults
right on the first try rather than guessing and round-tripping against the
live API.

A machine-readable `references/openapi.yaml` (OpenAPI 3.0, with response
examples ported from `api-reference.md`) mirrors the same endpoints — use it
if you're generating a client, feeding it to a codegen tool, or want a
structured diff surface. For a human-browsable version, open
`references/openapi.html` (a static Redoc page pre-rendered from the spec —
grouped by tag, searchable, with the examples inline) instead of reading the
raw YAML.

## Common patterns

**curl example (list denylist):**
```bash
curl -sH "X-Api-Key: $NEXTDNS_API_KEY" \
  "https://api.nextdns.io/profiles/$PROFILE_ID/denylist"
```

**Add a domain to the denylist:**
```bash
curl -sH "X-Api-Key: $NEXTDNS_API_KEY" -H "Content-Type: application/json" \
  -X POST "https://api.nextdns.io/profiles/$PROFILE_ID/denylist" \
  -d '{"id": "badsite.com", "active": true}'
```

**Toggle a security setting:**
```bash
curl -sH "X-Api-Key: $NEXTDNS_API_KEY" -H "Content-Type: application/json" \
  -X PATCH "https://api.nextdns.io/profiles/$PROFILE_ID/security" \
  -d '{"cryptojacking": true}'
```

Prefer PATCH on a scoped sub-resource (e.g. `/security`, `/settings/logs`)
over PATCH on the whole profile when only one area is changing — it's
harder to accidentally clobber unrelated fields.

For pagination (`analytics/*`, `logs`), pull `meta.pagination.cursor` from
the response and pass it back as `?cursor=...` on the next request; a
`null`/absent cursor means the last page. Full date-format and time-series
(`;series`, `interval`, `alignment`, `timezone`) rules are in
`references/api-reference.md#time-series`.

## Keeping the reference current

There is no upstream OpenAPI file to diff against — NextDNS's docs at
https://nextdns.github.io/api/ are hand-written HTML. If asked to check for
API updates, or before depending on this skill for something high-stakes,
fetch that page and compare it against `references/api-reference.md` and
`references/openapi.yaml`; update both together if anything drifted (new
analytics dimensions and new settings/security/privacy toggles are the
fields that have changed historically). See the "Keeping this up to date"
section at the bottom of `references/api-reference.md` for the full
procedure.

After editing `references/openapi.yaml`, run `scripts/render-docs.sh` — it
lints the spec (catches YAML/schema mistakes before they reach the reader)
and regenerates `references/openapi.html` from it. Commit the regenerated
HTML together with the YAML edit so the two never drift apart.
