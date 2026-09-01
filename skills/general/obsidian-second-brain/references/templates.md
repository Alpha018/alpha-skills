# Templates

Templates save time and keep note structure consistent. The native Templates
plugin does static substitution. Templater adds logic (`<% ... %>` for values,
`<%* ... %>` for control flow). The bodies below assume Templater; drop the
logic blocks if using the native plugin.

## Minimal

```
---
title: <% tp.file.title %>
date: <% tp.date.now("YYYY-MM-DD") %>
tags: []
---

# <% tp.file.title %>

## Notes

## Links
- [[ ]]
```

## Daily note

```
---
date: <% tp.date.now("YYYY-MM-DD") %>
weekday: <% tp.date.now("dddd") %>
tags: [daily]
---

# <% tp.date.now("dddd, D MMMM") %>

## 3 goals
- [ ]
- [ ]
- [ ]

## Meetings

## Ideas

## Habits
- [ ] Exercise
- [ ] Reading (30 min)

## Reflection
**How did the day go?**

**What did I learn?**

---
**Yesterday:** [[<% tp.date.now("YYYY-MM-DD", -1) %>]]
**Tomorrow:** [[<% tp.date.now("YYYY-MM-DD", 1) %>]]
```

## Meeting note

```
---
title: <% tp.file.title %>
date: <% tp.date.now("YYYY-MM-DD") %>
type: meeting
participants:
project:
tags: [meeting]
---

# <% tp.file.title %>

**Date:** <% tp.date.now("YYYY-MM-DD HH:mm") %>
**Participants:**
**Project:**

## Objective

## Agenda

## Notes

## Decisions

## Action items
- [ ] owner - action

## Links
- [[ ]]
```

## Book note

```
---
title: <% tp.file.title %>
author:
year:
status: reading
rating:
started: <% tp.date.now("YYYY-MM-DD") %>
finished:
tags: [reading/book]
---

# <% tp.file.title %>

**Author:** [[ ]]

## Summary in one sentence

## Why am I reading this?

## Main ideas
1.
2.
3.

## Notable quotes
>

## Connections
- [[ ]]

## Rating: /5
```

## Project planner

```
---
title: <% tp.file.title %>
status: active
start_date: <% tp.date.now("YYYY-MM-DD") %>
deadline:
priority:
tags: [project]
---

# <% tp.file.title %>

## Objective

## Why?

## Done when
> This project is complete when...

## Milestones
- [ ]

## Next actions
- [ ]

## Resources
- [[ ]]
```

## Zettelkasten note

```
---
id: <% tp.date.now("YYYYMMDDHHmm") %>
created: <% tp.date.now("YYYY-MM-DD HH:mm") %>
type: permanent
tags:
---

# <% tp.file.title %>

> One idea, in my own words.

## Context

## Connections
- Related to [[ ]]
- Contrasts with [[ ]]
- Supports [[ ]]

## References
- [[ ]]
```
