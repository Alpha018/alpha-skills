# Organization methods

Obsidian has four organizers that run in parallel without conflict. A single
note can sit in a folder, carry several tags, hold properties, and link to a
dozen other notes. Nothing competes.

- **Folders** give one physical location per note. Good for coarse buckets and
  for anything with a clear lifecycle.
- **Tags** (`#project/website`, `#reading/book`) are labels that cut across
  folders. A note can have as many as needed. Best for status and context.
- **Links** (`[[note name]]`) build the knowledge network. Bidirectional: the
  target note records the reference automatically.
- **Properties** are YAML key-value metadata at the top of a note. They feed
  Bases and Dataview queries.

Pick one organizer to lead. The other three support it.

## PARA

PARA stands for Projects, Areas, Resources, Archive: four top-level folders,
ordered by how soon they demand action.

- **Projects**: active, with a defined end (`Launch website Q3`).
- **Areas**: ongoing responsibility, no end date (`Health`, `Finances`,
  `Team`).
- **Resources**: reference material by topic of interest (`Machine
  Learning`, `Stoicism`).
- **Archive**: inactive items from the three above.

```
Vault/
  01-Projects/
    website-redesign/
    masters-thesis/
  02-Areas/
    health/
    finances/
    work/
  03-Resources/
    machine-learning/
    creative-writing/
  04-Archive/
    completed-projects/
    discontinued-areas/
```

Strength: actionability. Projects need work now, Areas need maintenance,
Resources wait, Archive is cold storage. A note moves between folders as its
status changes. Best for managers, freelancers, and product work.

## Zettelkasten

A note method that prioritizes small interconnected notes over folders. Three
note types:

- **Fleeting notes**: quick captures, processed then discarded.
- **Literature notes**: notes about something you read, in context.
- **Permanent notes**: one idea, in your own words, ready to be cited.

Central discipline: every permanent note links to at least one other note. A
note that connects to nothing probably should not be its own note.

Folders are minimal here. Structure emerges from links and from Maps of
Content (see `linking-and-graph.md`). Best for researchers, essayists, and
long-form writers.

## Combined

The usual end state for a vault kept over years:

- PARA folders for operational work with a lifecycle (client projects,
  recurring areas).
- Zettelkasten linking for durable ideas that outlive any one project, often
  kept in a single `Resources` or `Notes` subtree and organized purely by
  links.

Do not start here. Start with whichever single method matches the dominant
use, and add the other side once the need is concrete.

## Tags and properties as the support layer

Neither is a method on its own. Use them to slice across whatever method
leads.

Tags work well for:

- Status: `#status/active`, `#status/waiting`, `#status/done`.
- Context: `#work`, `#personal`, `#errand`.
- Type: `#daily`, `#meeting`, `#reading/book`.

Properties work well for structured, filterable fields:

```yaml
---
title: Meeting with Client X
date: 2026-05-10
tags: [meeting, client-x]
status: pending
priority: high
participants:
  - "[[Alice]]"
  - "[[Bob]]"
project: "[[Website Redesign]]"
completed: false
---
```

Property types include text, number, date, list, checkbox, and link. Once
notes share a property schema, Bases or Dataview can query them as a table.
See `plugins-and-bases.md`.
