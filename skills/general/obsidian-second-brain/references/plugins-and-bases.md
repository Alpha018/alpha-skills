# Plugins, properties, and Bases

## Native first

The base feature set covers more than most editors: wikilinks, backlinks,
graph view, Command Palette, properties, Canvas, daily notes, templates,
search with operators, and Bases on current versions. Learn these before
installing anything. Every community plugin is third-party code running inside
the app with full read and write access to the vault.

Plugin hygiene:

- Install one at a time, against a named need, not speculatively.
- Prefer plugins with many users and recent commits.
- Be wary of anything with no update in over 12 months.
- Review the enabled list quarterly and disable what is unused.

## Properties

Structured YAML metadata at the top of a note. Types: text, number, date,
list, checkbox, link. Once a set of notes shares a schema (for example every
book note has `author`, `rating`, `finished`), that set becomes queryable as a
table.

```yaml
---
title: The Design of Everyday Things
author: "[[Don Norman]]"
year: 2013
status: finished
rating: 5
finished: 2026-03-20
tags: [reading/book]
---
```

## Bases

Native feature, recent. Turns a set of notes into a structured database view
(table, filtered, sorted) with no plugin. Views are defined against
properties. Use it for a reading log, a lightweight CRM, an inventory, a
project tracker: anything where you want to see many notes as rows.

On older Obsidian without Bases, use the Dataview plugin for the same job.

## Dataview

Community plugin. Writes queries inside a note that aggregate data from across
the vault, in its own query language (DQL).

All open tasks in the vault:

```dataview
TASK
WHERE !completed
SORT file.ctime DESC
```

Books rated 4+ finished in 2026:

```dataview
TABLE author, rating, finished
FROM #reading/book
WHERE rating >= 4 AND finished.year = 2026
SORT rating DESC
```

Bases versus Dataview: prefer Bases when the target version has it, since it
is native and needs no plugin. Keep Dataview when you need query features
Bases does not yet cover, or you are on an older version.

## Other plugins worth the risk

Add only if the native path is genuinely missing:

- **Templater**: templates with logic (JavaScript, timestamps, prompts,
  conditionals). Goes beyond the native Templates plugin. See `templates.md`.
- **Calendar / Periodic Notes**: visual date navigation and weekly, monthly,
  yearly note scaffolding for the review loop.
- **A spaced-repetition plugin**: if the vault doubles as study material.

## CSS snippets

Visual tweaks live in `.obsidian/snippets/` as plain CSS files, toggled in
settings. Example, recoloring a callout:

```css
.callout[data-callout="tip"] {
  --callout-color: 76, 175, 80;
  --callout-icon: lucide-lightbulb;
}
```

Snippets touch only appearance and carry none of the vault-access risk of a
plugin.
