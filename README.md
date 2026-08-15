# alpha-skills

Centralized homelab skills, organized by category and ready to publish on
[skills.sh](https://www.skills.sh).

## Structure

```
skills/
  external/   # third-party services/APIs
    nextdns-api/
      SKILL.md
      references/
      scripts/
  local/      # self-hosted homelab infrastructure (UniFi, Proxmox, NAS...)
  general/    # cross-cutting utilities
skills.sh.json
```

Each skill is a folder with a `SKILL.md`
([Agent Skills](https://agentskills.io/specification) format) and,
optionally, `references/`, `scripts/`, `assets/`.

Locally, `.claude/` and `.agents/` (symlinks into `skills/`) are used to work
with Claude Code and other AI agents — those folders are in `.gitignore` and
are not versioned. See [AGENTS.md](./AGENTS.md) for details.

## Available skills

- `external/nextdns-api` — reference and automation for the NextDNS REST API.

## Publishing to skills.sh

The `skills.sh.json` + `skills/<category>/<name>/SKILL.md` layout is already
the one skills.sh expects — no restructuring needed to publish.
