# Linking, backlinks, and the graph

## Wikilinks

Base syntax is `[[Note Name]]`. Useful variants:

- `[[Note Name|display text]]`: link with alternate visible text.
- `[[Note Name#Heading]]`: link straight to a section.
- `[[Note Name#^block-id]]`: link to a specific block.
- `[[incomplete name]]` on a note that does not exist yet: an unresolved
  link, shown in a distinct color, acting as a to-write reminder.

The rule while writing: whenever a note mentions a concept that deserves its
own note, link it, even if the target does not exist. Example:

```
The retry logic here depends on [[idempotency keys]], which only work if the
client also handles [[at-least-once delivery]]. See the tradeoff in
[[exactly-once is a myth]].
```

Three links created in one sentence. The target notes can be written later and
already arrive with one connection.

## Backlinks and unlinked mentions

Every note shows, automatically, which notes point to it. This is the point of
bidirectionality: the network keeps its own integrity, with no need to edit
both ends of a relationship when an idea is renamed or refined.

The backlinks panel also lists **unlinked mentions**: notes that contain the
current note's name as plain text but have not linked it. One click promotes a
mention to a formal link. Good for discovering connections made implicitly.

## Embeds

`![[Note Name]]` embeds another note's full content inside the current one.
`![[Note Name#Section]]` embeds only that section. Keep atomic notes as the
source of truth and build composite documents (reports, chapters) as
aggregator notes that embed them. Edit the source, the aggregator updates.

## Daily notes

A note per day, named by date (`2026-05-10.md`). The most reliable way to keep
the vault growing: write chronologically, link liberally, and the network
builds itself with no separate organizing step.

Typical structure:

```
# 2026-05-10

## Today's goals
- [ ] Finish the draft of section 3
- [ ] 1:1 with [[Dana]] at 2pm

## Meetings
### 2pm - [[Dana]]
- Reviewed the [[Q3 roadmap]] scope cut
- Next: write up [[migration plan v2]]

## Ideas
- Possible link between [[caching strategy]] and [[read latency budget]]

## Readings
- [[The Pragmatic Programmer]], chapter on orthogonality
```

## Graph view

Visualizes the vault as nodes and links. Three modes:

- **Global graph**: the whole vault, filterable by tag, folder, or search
  query.
- **Local graph**: the neighborhood of the open note, 1 to 3 hops out.
- **Filtered graph**: for example highlighting recently created notes.

Use it as a diagnostic, once a week:

- **Orphans** (no links): integrate, update, or delete.
- **Hubs** (many links): usually central concepts, candidates for a Map of
  Content.
- **Dense clusters**: mature areas of knowledge.
- **Sparse clusters**: areas that deserve more attention.

Visual settings (color by group, node size by connection count, link force)
are cosmetic. The value is in reading the structure, not styling it.

## Maps of Content

A Map of Content (MOC) is a note whose body is a curated list of links into
one theme. It replaces a folder as the entry point to an area, but unlike a
folder a note can belong to several MOCs. Create one when a hub note in the
graph has accumulated many backlinks and needs a human-ordered index.
