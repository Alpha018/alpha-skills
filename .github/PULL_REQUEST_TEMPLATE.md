<!-- Keep the title in Conventional Commits form, e.g. feat(skills): add proxmox-backup skill -->

## What this changes

<!-- Short description of the change and why it is needed. -->

## Type

- [ ] New published skill
- [ ] Change to an existing skill
- [ ] MCP server change
- [ ] CI, docs, or repo tooling

## Checklist

- [ ] Commits follow Conventional Commits
- [ ] Docs written in English

### For a skill change

- [ ] `SKILL.md` frontmatter has `name` matching the folder and `metadata.author: github.com/alpha018`
- [ ] `description` is trigger-oriented, with should-trigger and should-not-trigger cases in `evals/`
- [ ] Deep detail lives in `references/`, not the body
- [ ] The slug is registered in the matching grouping in `skills.sh.json`
- [ ] The skill is not symlinked into `.claude/` or `.agents/`

### For an MCP server change

- [ ] Request and response shapes stay in sync with the matching skill's reference docs
- [ ] `README.md` for the server reflects the change
