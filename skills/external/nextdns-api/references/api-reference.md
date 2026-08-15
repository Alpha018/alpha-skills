# NextDNS API — Deep Reference

Source of truth: https://nextdns.github.io/api/ (no machine-readable spec is
published upstream — this file and `openapi.yaml` are hand-transcribed and
must be re-diffed against that page when the API changes; see
[Keeping this up to date](#keeping-this-up-to-date)).

- Base URL: `https://api.nextdns.io`
- Auth header: `X-Api-Key: <key>` (key from https://my.nextdns.io/account)
- Envelope: success responses are `{"data": ..., "meta": {...}}`; errors are
  `{"errors": [{"code", "detail", "source": {"parameter"}}]}`
- The API is in beta; no documented rate limits.

## Table of contents

- [Profiles](#profiles)
- [Security](#security)
- [Privacy](#privacy)
- [Parental Control](#parental-control)
- [Denylist / Allowlist](#denylist--allowlist)
- [Settings](#settings)
- [Analytics](#analytics)
- [Time series](#time-series)
- [Logs](#logs)
- [Pagination](#pagination)
- [Date & timezone formats](#date--timezone-formats)
- [Keeping this up to date](#keeping-this-up-to-date)

---

## Profiles

A **profile** (`:profile` in every path below) is the root object holding a
device's/network's full DNS configuration — security, privacy, parental
control, allow/deny lists, and settings all nest under it.

| Method | Path | Notes |
|---|---|---|
| POST | `/profiles` | Body: full profile JSON. Response: `{"data": {"id": "abc123"}}` |
| GET | `/profiles/:profile` | Returns the complete profile, all nested objects included |
| PATCH | `/profiles/:profile` | Body: partial profile JSON — only send fields to change |
| DELETE | `/profiles/:profile` | Also clears the profile's logs |

Full profile schema (nesting shown; each sub-object also has its own
dedicated endpoints below for scoped reads/writes):

```json
{
  "name": "string",
  "security": { "...": "see Security" },
  "privacy": { "...": "see Privacy" },
  "parentalControl": { "...": "see Parental Control" },
  "denylist": [{ "id": "string", "active": true }],
  "allowlist": [{ "id": "string", "active": true }],
  "settings": { "...": "see Settings" }
}
```

Prefer PATCH on `/profiles/:profile` for a batch of unrelated changes, and
the scoped sub-resource endpoints (below) when only touching one area — the
scoped endpoints are what most automation or scripting should use since
they avoid clobbering unrelated fields.

## Security

`GET|PATCH /profiles/:profile/security`

```json
{
  "threatIntelligenceFeeds": true,
  "aiThreatDetection": true,
  "googleSafeBrowsing": true,
  "cryptojacking": true,
  "dnsRebinding": true,
  "idnHomographs": true,
  "typosquatting": true,
  "dga": true,
  "nrd": true,
  "ddns": true,
  "parking": true,
  "csam": true,
  "tlds": [{ "id": "ru" }, { "id": "cn" }, { "id": "cf" }]
}
```

All top-level fields are booleans toggling a threat-detection category
(NRD = newly registered domains, DGA = domain generation algorithms, DDNS =
dynamic DNS, CSAM = child sexual abuse material blocklist). `tlds` is a list
of TLD strings to block wholesale (e.g. `"ru"`, `"cn"`, `"accountants"`).

Sub-resource CRUD for `tlds` (same list-management shape reused across the
API — see [Denylist / Allowlist](#denylist--allowlist) for the general
pattern):

| Method | Path |
|---|---|
| GET | `/profiles/:profile/security/tlds` |
| POST | `/profiles/:profile/security/tlds` |
| PATCH | `/profiles/:profile/security/tlds/:id` |
| DELETE | `/profiles/:profile/security/tlds/:id` |

## Privacy

`GET|PATCH /profiles/:profile/privacy`

```json
{
  "blocklists": [{ "id": "nextdns-recommended" }, { "id": "oisd" }],
  "natives": [{ "id": "huawei" }, { "id": "samsung" }],
  "disguisedTrackers": true,
  "allowAffiliate": false
}
```

- `blocklists` — third-party/curated tracker+ad blocklists by ID.
- `natives` — OS/vendor-native telemetry blockers by ID (e.g. `apple`,
  `huawei`, `samsung`, `windows`, `roku`...).
- `disguisedTrackers` — blocks trackers that disguise themselves as
  first-party (CNAME cloaking).
- `allowAffiliate` — allow affiliate/tracking links to resolve normally.

Sub-resource CRUD, same shape for both:

| Method | Path |
|---|---|
| GET / POST | `/profiles/:profile/privacy/blocklists` |
| PATCH / DELETE | `/profiles/:profile/privacy/blocklists/:id` |
| GET / POST | `/profiles/:profile/privacy/natives` |
| PATCH / DELETE | `/profiles/:profile/privacy/natives/:id` |

## Parental Control

`GET|PATCH /profiles/:profile/parentalControl`

```json
{
  "services": [{ "id": "tiktok", "active": true }],
  "categories": [{ "id": "porn", "active": true }],
  "safeSearch": true,
  "youtubeRestrictedMode": true,
  "blockBypass": false
}
```

- `services` — named apps/platforms to block (e.g. `tiktok`, `facebook`,
  `netflix`) with per-entry `active` toggle.
- `categories` — content categories (e.g. `porn`, `social-networks`,
  `gambling`) with per-entry `active` toggle.
- `safeSearch` / `youtubeRestrictedMode` — force safe-search / restricted
  mode at the DNS level for major search/video engines.
- `blockBypass` — prevent bypassing blocks via known bypass techniques
  (e.g. DNS-over-HTTPS to a different resolver).

Sub-resource CRUD, both support `PUT` for a full replace (the only two
list-type resources in the API that do — everywhere else, `POST`/`PATCH`/
`DELETE` per item is the only way to mutate):

| Method | Path |
|---|---|
| GET | `/profiles/:profile/parentalControl/services` |
| PUT | `/profiles/:profile/parentalControl/services` (replace all) |
| POST | `/profiles/:profile/parentalControl/services` (add one) |
| PATCH / DELETE | `/profiles/:profile/parentalControl/services/:id` |
| GET | `/profiles/:profile/parentalControl/categories` |
| PUT | `/profiles/:profile/parentalControl/categories` (replace all) |
| POST | `/profiles/:profile/parentalControl/categories` (add one) |
| PATCH / DELETE | `/profiles/:profile/parentalControl/categories/:id` |

## Denylist / Allowlist

Two independent, symmetric domain lists at profile scope. Entry shape:
`{"id": "<domain>", "active": true}` — `id` is the domain string itself,
`active` lets you keep an entry without enforcing it.

| Method | Path | Notes |
|---|---|---|
| GET | `/profiles/:profile/denylist` \| `/allowlist` | Supports `limit`/`cursor` pagination |
| PUT | `/profiles/:profile/denylist` \| `/allowlist` | Replace the entire list |
| POST | `/profiles/:profile/denylist` \| `/allowlist` | Add one entry, body `{"id", "active"}` |
| PATCH | `/profiles/:profile/denylist/:id` \| `/allowlist/:id` | Usually to toggle `active` |
| DELETE | `/profiles/:profile/denylist/:id` \| `/allowlist/:id` | Remove one entry |
| DELETE | `/profiles/:profile/denylist` \| `/allowlist` | Clear the whole list |

## Settings

`GET|PATCH /profiles/:profile/settings` reads/writes all of the below at
once; each also has its own scoped endpoint.

```json
{
  "logs": {
    "enabled": true,
    "drop": { "ip": false, "domain": false },
    "retention": 7776000,
    "location": "eu"
  },
  "blockPage": { "enabled": true },
  "performance": { "ecs": true, "cacheBoost": false, "cnameFlattening": true },
  "web3": false
}
```

- `settings.logs.retention` — seconds logs are kept (e.g. `7776000` = 90
  days).
- `settings.logs.drop.ip` / `drop.domain` — anonymize by omitting client IP
  or domain from stored logs, for privacy-sensitive deployments.
- `settings.logs.location` — storage region string. NextDNS's own docs only
  list `"us"`/`"eu"`, but the live API accepts more (e.g. `"ch"` observed in
  practice) — don't validate this as a strict two-value enum.
- `settings.blockPage.enabled` — show a block page instead of NXDOMAIN.
- `settings.performance.ecs` — EDNS Client Subnet (better CDN geo-routing,
  less client-IP privacy).
- `settings.performance.cacheBoost` — pre-warm/extend DNS cache.
- `settings.performance.cnameFlattening` — resolve CNAME chains server-side.
- `settings.web3` — resolve blockchain-based domains (ENS, etc.).

| Method | Path |
|---|---|
| GET / PATCH | `/profiles/:profile/settings` |
| GET / PATCH | `/profiles/:profile/settings/logs` |
| GET / PATCH | `/profiles/:profile/settings/blockPage` |
| GET / PATCH | `/profiles/:profile/settings/performance` |
| GET / PATCH | `/profiles/:profile/settings/web3` |

## Analytics

All analytics endpoints are `GET /profiles/:profile/analytics/<dimension>`
and return `{"data": [...]}`, each row shaped by dimension plus a `queries`
count. Shared query params: `from`, `to`, `limit` (default 10, 1-500),
`cursor`, `device`.

| Dimension | Path | Row shape / notes |
|---|---|---|
| Status | `.../analytics/status` | `{status: default\|blocked\|allowed, queries}` |
| Domains | `.../analytics/domains` | `{domain, root?, queries}`; extra params `status` (filter), `root` (bool, group by root domain) |
| Reasons | `.../analytics/reasons` | `{id, name, queries}` — block/allow reason, e.g. `blocklist:nextdns-recommended`, `native:apple` |
| IPs | `.../analytics/ips` | `{ip, network:{cellular,vpn,isp,asn}, geo:{latitude,longitude,countryCode,country,city}, queries}` |
| Devices | `.../analytics/devices` | `{id, name?, model?, localIp?, queries}`; unidentified traffic reported under `id: "__UNIDENTIFIED__"` |
| Protocols | `.../analytics/protocols` | `{protocol, queries}` e.g. `DNS-over-HTTPS`, `DNS-over-TLS`, `UDP` |
| Query types | `.../analytics/queryTypes` | `{type (DNS RR number), name, queries}` |
| IP versions | `.../analytics/ipVersions` | `{version: 4\|6, queries}` |
| DNSSEC | `.../analytics/dnssec` | `{validated: bool, queries}` |
| Encryption | `.../analytics/encryption` | `{encrypted: bool, queries}` |
| Destinations | `.../analytics/destinations?type=countries\|gafam` | countries: `{code, domains[], queries}`; gafam: `{company, queries}` (`apple`, `google`, `others`, ...) |

Example (`status`):

```json
{ "data": [
  {"status": "default", "queries": 819491},
  {"status": "blocked", "queries": 132513},
  {"status": "allowed", "queries": 6923}
] }
```

## Time series

Append `;series` to any analytics path (e.g.
`/profiles/:profile/analytics/queryTypes;series`) to get the same dimension
broken into time buckets instead of a single total.

Extra query params:

| Param | Default | Notes |
|---|---|---|
| `interval` | — | Tumbling window size, seconds or duration string |
| `alignment` | `end` | `start` \| `end` \| `clock` — where each bucket boundary sits |
| `timezone` | `GMT` | IANA name, used to align buckets to local clock/day boundaries |
| `partials` | `none` | `none` \| `start` \| `end` \| `all` — whether to include partially-filled edge buckets |

```json
{
  "data": [{
    "type": 28, "name": "AAAA",
    "queries": [4019, 5801, 2667, 2817, 3314, 3128, 3810]
  }],
  "meta": {
    "series": {
      "times": ["2021-03-08T16:51:36.623Z", "2021-03-09T16:51:36.623Z"],
      "interval": 86400
    },
    "pagination": { "cursor": "jS8sl16m" }
  }
}
```

`data[].queries` becomes a parallel array aligned to `meta.series.times`.

## Logs

| Method | Path | Notes |
|---|---|---|
| GET | `/profiles/:profile/logs` | List logs, see params below |
| GET | `/profiles/:profile/logs/stream` | Server-Sent Events, real-time tail |
| GET | `/profiles/:profile/logs/download` | Redirects (302) to a signed file URL by default |
| DELETE | `/profiles/:profile/logs` | Clear all logs for the profile |

### List (`GET /logs`) params

| Param | Type | Default | Notes |
|---|---|---|---|
| `from` | Date | — | inclusive |
| `to` | Date | — | exclusive |
| `sort` | `asc`\|`desc` | `desc` | |
| `limit` | int | 100 | 10-1000 |
| `cursor` | string | — | pagination |
| `device` | string | — | device ID or `__UNIDENTIFIED__` |
| `status` | `default`\|`error`\|`blocked`\|`allowed` | — | |
| `search` | string | — | partial domain match |
| `raw` | bool | `false` | `true` = every DNS query; `false` = deduplicated navigational queries only |

Entry shape:

```json
{
  "timestamp": "2021-03-18T03:00:10.338Z",
  "domain": "21-courier.push.apple.com",
  "root": "apple.com",
  "tracker": "apple",
  "encrypted": true,
  "protocol": "DNS-over-HTTPS",
  "clientIp": "2a01:e0a:2cd:87a0:1b23:2832:57cd:aa1d",
  "client": "apple-profile",
  "device": {"id": "8TD1G", "name": "Romain's iPhone", "model": "iPhone 12 Pro Max"},
  "status": "default",
  "reasons": []
}
```

When blocked/allowed, `reasons` is populated: `[{"id": "blocklist:nextdns-recommended", "name": "NextDNS Ads & Trackers Blocklist"}]`.

### Stream (`GET /logs/stream`)

Same filters minus `from`/`to`/`sort`/`limit`/`cursor` (it's a live tail, not
a page), plus `id` to resume from a previous event ID after a disconnect.
Standard SSE framing:

```
id: 64v32d9r6rwkcctg6cu38e9g60
data: {"timestamp":"2021-03-16T04:40:30.344Z","domain":"g.whatsapp.net",...}
```

### Download (`GET /logs/download`)

`redirect` (default `true`) — `true` issues an HTTP redirect straight to the
file; pass `false`/`0` to instead get `{"data": {"url": "https://..."}}` and
fetch it yourself (useful for scripting where automatic redirects are
awkward, e.g. `curl` without `-L`, or when you need the URL string itself).

### Clear (`DELETE /logs`)

Wipes the profile's log history. Also happens automatically when the
profile itself is deleted.

## Pagination

Cursor-based, consistent across analytics and logs:

- Request `limit` (page size) and optionally `cursor` (from a prior
  response).
- Response includes `meta.pagination.cursor` — pass it as the next request's
  `cursor` query param. `null`/absent means no further pages.

## Date & timezone formats

`from`/`to` accept any of:

- ISO 8601: `2021-03-15T16:34:05.203Z`
- Unix timestamp, seconds: `1615826071`
- Unix timestamp, milliseconds: `1615826071284`
- Relative offsets: `-6h`, `-1d`, `-3M`, `now`
- Plain date: `2021-03-15`

`timezone` (time-series only) takes IANA Time Zone Database names, e.g.
`Europe/Paris`.

## Keeping this up to date

There is no published OpenAPI/Swagger file for this API — `openapi.yaml` in
this skill was hand-authored from the prose docs. To check for drift:

1. Fetch `https://nextdns.github.io/api/` and diff its endpoint list,
   parameters, and JSON examples against this file and `openapi.yaml`.
2. Look specifically for: new analytics dimensions, new settings fields, new
   security/privacy/parental-control toggles, and changes to pagination or
   date-format rules — these are the areas that have changed historically.
3. Update both `api-reference.md` (narrative/tables) and `openapi.yaml`
   (machine-readable) together so they stay in sync, and bump the `version`
   field in `openapi.yaml`'s `info` block.
4. Run `../scripts/render-docs.sh` — it lints `openapi.yaml` and regenerates
   `openapi.html`, the readable static-page version of the same spec.
