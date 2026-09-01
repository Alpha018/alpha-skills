# Layer 6: Hooks and determinism

Hooks run your own commands at fixed points in the agent loop. They give a
probabilistic system a few hard, auditable rules, and they are what make it
reasonable to run the agent with fewer people watching.

## Events

Configured in `.claude/settings.json` under `hooks`:

- `SessionStart`: prepare the environment, print a reminder.
- `UserPromptSubmit`: inspect or annotate the prompt.
- `PreToolUse`: gate a tool call. Allow, deny, or, on recent builds, defer.
- `PostToolUse`: react after a tool ran. Format, lint, log.
- `PermissionDenied`: record what the agent was blocked from doing, on recent
  builds.

## The two to set up first

### PostToolUse formatter

This one is unglamorous and has the best payoff. After every write, run the
formatter so the file is tidy before the next turn reads it and the agent
never has to reason about its own stray indentation.

### PreToolUse gate

Stop or defer the short list of commands that are actually dangerous, most
often a push to the default branch, sometimes a destructive database command.

## Sample config

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          { "type": "command", "command": ".claude/hooks/gate.sh" }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Write|Edit|MultiEdit",
        "hooks": [
          {
            "type": "command",
            "command": "pnpm exec prettier --write \"$CLAUDE_TOOL_FILE_PATH\" >/dev/null 2>&1 || true"
          }
        ]
      }
    ],
    "PermissionDenied": [
      {
        "hooks": [
          { "type": "command", "command": "jq -c . >> .claude/logs/denied.jsonl" }
        ]
      }
    ]
  }
}
```

The exact env var for the written path and the `PermissionDenied` event vary
by version. Check the hooks docs for the installed build and adjust.

## The gate script

`.claude/hooks/gate.sh`:

```bash
#!/usr/bin/env bash
# Defer a push to the default branch and a schema push against anything that
# is not localhost. The session pauses; a person approves out of band and it
# resumes with `claude --resume`.
set -euo pipefail

payload="$(cat)"
cmd="$(printf '%s' "$payload" | jq -r '.tool_input.command // empty')"

case "$cmd" in
  *"git push"*" origin main"*|*"git push"*" main"*)
    jq -nc '{"permissionDecision":"defer","reason":"Push to main needs review."}'
    ;;
  *"drizzle-kit push"*|*"db:push"*)
    jq -nc '{"permissionDecision":"defer","reason":"Schema push outside a migration needs review."}'
    ;;
  *)
    jq -nc '{"permissionDecision":"allow"}'
    ;;
esac
```

## Deferred permissions

Where the build supports a `defer` decision, a `PreToolUse` hook can pause a
headless run partway through instead of either failing or being launched with
`--dangerously-skip-permissions`. A person reads the session log, approves out
of band, and the run picks up from the exact point it stopped. That is what
makes an overnight job that has to touch a protected branch safe. If `defer`
is not available, fall back to `deny` with a clear reason and have the job
open a draft PR without pushing.

## Keep the gate list short

Every gated command is a place a headless run can stall. Gate the few
operations that are irreversible or leave the machine; allow everything else.
