# Layer 8: Parallel worktrees and headless automation

## Worktrees

A git worktree is a second working directory on the same repo, checked out to
its own branch. Each keeps its own editor state and its own running processes,
so several Claude Code sessions can run at once without colliding.

### Workflow

```bash
# from the main checkout
git worktree add ../ledger-api-worker -b feat/retry-dead-letters
git worktree add ../ledger-api-api    -b feat/webhook-verification

# open a session in each, in its own terminal pane
```

Some builds ship a command that creates the branch, the worktree, and the
session together. Use it if it is there.

### Keeping merges clean

Overlapping tasks produce overlapping edits. Scope each pane to a distinct part
of the tree:

- Pane 1: retry handling for dead-lettered jobs (`apps/worker/`).
- Pane 2: webhook signature verification (`apps/api/src/routes/webhooks/`).
- Pane 3: a new index and migration for the lookup (`packages/db/`).
- Pane 4: draft the PR.

Distinct directories per pane means the merge is usually trivial. When two
panes have to touch the same file, run them in sequence instead.

### Cleanup

```bash
git worktree remove ../ledger-api-worker
git branch -d feat/retry-dead-letters   # after the merge
```

## Headless mode

`claude -p` runs the agent non-interactively, for CI and scheduled jobs.
Whitelist tools explicitly and give a scoped prompt so runs are repeatable.

### Nightly contract-test and draft-PR job (GitHub Actions)

```yaml
name: claude-nightly-contracts
on:
  schedule: [{ cron: "0 6 * * *" }]
  workflow_dispatch:

jobs:
  contracts-and-pr:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      pull-requests: write
    env:
      ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
      GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - name: Install Claude Code
        run: npm i -g @anthropic-ai/claude-code@latest

      - name: Run contract tests, draft a fix if they break
        id: claude
        run: |
          set -o pipefail
          claude -p \
            --output-format stream-json \
            --allowedTools "Bash(pnpm:*),Read,Grep,Glob,Write,Edit,mcp__github__*" \
            --append-system-prompt "You run the nightly contract suite. If a
              contract test fails, make the smallest fix and open a draft PR
              with the failing output attached." \
            "Run: pnpm test:contracts. If anything fails, implement the
              minimal fix and open a draft PR against main via the GitHub
              MCP." \
            | tee run.ndjson

          if grep -q '"permissionDecision":"defer"' run.ndjson; then
            echo "deferred=true" >> "$GITHUB_OUTPUT"
          fi

      - name: Resume if the run deferred on a push
        if: steps.claude.outputs.deferred == 'true'
        run: |
          SESSION_ID="$(jq -r 'select(.type=="deferred") | .session_id' \
            run.ndjson | head -n1)"
          claude --resume "$SESSION_ID" \
            --append-system-prompt "Approved. Continue." \
            --output-format stream-json
```

### How the layers connect here

1. The Layer 6 gate sees the push to `main` and returns `defer`.
2. The run pauses. The job parses `run.ndjson`, sets an output var, and exits
   without failing.
3. A person reads the log and approves.
4. `claude --resume <session-id>` continues that exact session to the end.

Without a `defer` decision this job either runs with
`--dangerously-skip-permissions`, which is unsafe, or dies on the push step,
which is useless. If the build has no `defer`, have it open a draft PR and
never push; a person merges.

### Flags to know

- `--output-format stream-json`: machine-readable event stream to parse for
  results and control flow.
- `--allowedTools`: explicit allowlist. Anything off the list prompts, which in
  headless means it blocks. Be exhaustive.
- `--append-system-prompt`: a scoped role for this run only.
- `--resume <session-id>`: continue a specific earlier session.

Flag names shift between versions. Run `claude --help` on the version CI uses
before depending on any of them.
