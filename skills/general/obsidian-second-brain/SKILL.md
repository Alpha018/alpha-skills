---
name: obsidian-second-brain
description: >
  Decide how to structure and run an Obsidian vault as a long-lived knowledge
  system: one vault or many, PARA versus Zettelkasten versus a mix, when to
  reach for folders, tags, links, or properties, a daily-note capture loop,
  which community plugins are worth the risk, Bases versus Dataview for
  structured notes, a small set of templates, and how to expose the vault to
  an AI agent over MCP. Use when the user is setting up Obsidian, migrating
  notes into it, or asking why their vault feels messy, why the graph is full
  of orphans, which organization method to pick, which plugins to install,
  how to run a second-brain or Zettelkasten workflow, or whether Obsidian is
  even the right tool versus Notion. Not for generic Markdown syntax, other
  note apps, or building an Obsidian plugin.
metadata:
  author: github.com/alpha018
  version: "1.0"
compatibility: >
  Targets Obsidian 1.9+ on desktop and mobile. Properties, Canvas, and the
  Command Palette are native. Bases is a recent native feature; on older
  versions its role is filled by the Dataview community plugin. Sync, Publish,
  and any AI or MCP integration are optional and are called out where they
  appear. No account is required for the core workflow.
---

## What this skill is for

An Obsidian vault is only worth as much as the structure and habits around it.
With no method it turns into a folder of orphan notes nobody reopens;
over-configured on day one it eats weeks of setup before a single real note
gets written. This skill picks the method, the plugins, and the capture loop
that a specific person needs, and says plainly when another tool is the better
answer.

Two rules run through all of it. Start with the smallest structure that works
and add to it only against a problem the user can name. And keep the notes as
plain Markdown that would still read fine if Obsidian disappeared, since that
durability is the main reason to choose it over the alternatives.

## Procedure

1. **Check the fit first.** Run through "When Obsidian is the wrong tool"
   below before anything else. If the user needs live multi-person editing, a
   zero learning curve, or native AI as the main interface, say so now.
2. **Decide vault count.** One vault for everything is the default. Splitting
   into personal, work, and study vaults is a decision to revisit after
   months of use, not at the start, because links and search do not cross a
   vault boundary.
3. **Pick an organization method.** Use the table below. Do not blend all four
   organizers before there is a reason to.
4. **Set up the capture loop.** A daily note plus an inbox folder is enough to
   start. Everything else is added when a concrete need shows up.
5. **Add plugins one at a time.** Start on the native feature set. Each
   community plugin is third-party code with full vault access, so add one
   only when a native path is genuinely missing and review the list quarterly.
6. **Wire in AI only if asked.** If the user wants an agent to read or write
   the vault, see `references/ai-integration.md`. It is a bolt-on layer, not
   part of the base setup.

## Choosing an organization method

Obsidian offers four organizers that coexist without conflict: folders, tags,
links, and properties. The question is which one leads.

| Situation | Lead with | Notes |
| --- | --- | --- |
| Action and delivery: projects with deadlines, ongoing areas of responsibility | Folders, PARA layout | Projects / Areas / Resources / Archive. Best for managers, freelancers, product work. |
| Idea generation and long-form writing | Links, Zettelkasten style | Atomic notes, one idea each, every permanent note linked to at least one other. Best for researchers, writers, essayists. |
| A system that has to do both | PARA folders for operational work, Zettelkasten links for durable knowledge | The common end state for a vault kept over years. |
| Status and context that cuts across folders (`#urgent`, `status: in-progress`) | Tags and properties | These layer on top of either method above; they are not a method on their own. |
| Structured, queryable notes (reading log, CRM, inventory) | Properties plus Bases | On older Obsidian, use the Dataview plugin instead. See `references/plugins-and-bases.md`. |

Full folder trees, the three note types in Zettelkasten, and how tags and
properties differ from folders are in `references/organization-methods.md`.

## The capture and review loop

The workflow is a cycle: capture, organize, connect, visualize, reflect.
Most people who drop Obsidian in the first month fail by trying to run all
five stages at full strength from day one.

- **Capture without judgment.** New notes land in an inbox folder or the day's
  daily note. Categorizing every idea at the moment it appears is its own kind
  of overload. Process the inbox later, on a schedule.
- **Connect while writing.** When a note mentions a concept that deserves its
  own note, link it with `[[double brackets]]` even if the target does not
  exist yet. Obsidian keeps the unresolved link as a reminder. Backlinks on
  the other side update on their own.
- **Visualize to find gaps.** Open the graph view once a week and read it for
  problems: orphan notes with no links, hubs with many links that should
  become a Map of Content, sparse clusters that need investment.
- **Reflect on a cadence.** Weekly and monthly reviews are where old notes get
  reopened, updated, and re-linked. That is what makes an old vault worth more
  than a new one.

Daily-note structure, wikilink syntax variants, embeds, and Maps of Content
are in `references/linking-and-graph.md`. Template bodies for daily notes,
meetings, book notes, projects, and Zettelkasten notes are in
`references/templates.md`.

## When Obsidian is the wrong tool

Say this early rather than after a migration.

- **Live simultaneous collaboration** on the same document: use a shared docs
  tool. Obsidian sync is single-user by design.
- **Zero learning curve wanted:** a plain notes app is a better fit.
- **No-code automation** across services: a database tool with an automation
  layer will do more with less setup.
- **AI as the primary interface**, not an add-on: pick a tool built that way.
- **Mobile-first, capture-heavy, little structure:** a lightweight mobile
  notes app has less friction.

Obsidian is the right call when data ownership matters, the knowledge base is
meant to last years, the user works in plain text, and real privacy is a
requirement rather than a preference.

## Gotchas

- **Productivity theater.** Weeks spent building the perfect system before
  writing real notes. The fix is to start with a daily note and an inbox and
  nothing else.
- **Multi-vault too early.** Links and search stop at the vault boundary.
  Split only when a real need appears, usually after months.
- **Plugin overload.** Every community plugin runs with full vault access. A
  stale, unmaintained plugin is a real risk. Keep the list short, prefer
  well-maintained plugins, and prune quarterly.
- **Syncing into iCloud or Google Drive folders.** Those services produce sync
  conflicts in directories with many small files. Use a plain local folder, or
  a sync service built for the vault, and keep the two separate.
- **Orphan sprawl.** A note that cannot be linked to anything usually should
  not exist as its own note. Fold it into a related note or the daily note.
- **Treating the graph as a goal.** A dense graph is a side effect of linking
  while writing, not a target to optimize directly.
- **Losing the plain-text property.** Heavy reliance on a single plugin's
  custom syntax makes the vault hard to read without that plugin. Keep the
  core content in standard Markdown.
