# obsidian-second-brain

### Decide how to structure and run an Obsidian vault, instead of copying someone else's setup

An Obsidian vault is worth only as much as the method and habits around it.
With no structure it becomes a folder of orphan notes nobody reopens;
over-configured on day one it eats weeks of setup before a single real note
gets written. This skill picks the organization method, the plugins, and the
capture loop a specific person needs, and says plainly when another tool is
the better answer.

## What happens when this triggers

Ask to "set up Obsidian as a second brain" or say "my vault is a mess and the
graph is all orphans," and the skill works through the decisions in order:

- **Fit check first.** If the need is live collaboration, a zero learning
  curve, no-code automation, or AI as the primary interface, the skill says so
  before any migration starts.
- **One vault or many, and which method leads.** PARA folders for action and
  delivery, Zettelkasten linking for idea work, a mix as the long-term end
  state, with tags and properties as the support layer on top.
- **A capture loop that is small on purpose:** a daily note and an inbox
  folder, then the weekly graph review to catch orphans and hubs.
- **Plugins one at a time.** Native features first, since every community
  plugin runs with full vault access; Bases versus Dataview for structured
  notes; a quarterly prune.
- **AI as an optional bolt-on:** a vault `CLAUDE.md`, an Obsidian MCP server,
  and a few custom commands, set up only after the vault has real structure.

## Why a procedure instead of a plugin list

The common failure is productivity theater: weeks spent building the perfect
system before writing anything real. The second is plugin overload, a stack of
third-party code with full vault access, half of it unmaintained. The skill
starts from the smallest structure that works and adds to it only against a
problem the user can name.

## What's in the folder

| File | Contents |
|---|---|
| [`SKILL.md`](SKILL.md) | The fit check, the method-choice table, the capture loop, when Obsidian is the wrong tool, a gotchas section |
| [`references/organization-methods.md`](references/organization-methods.md) | The four organizers, PARA folder trees, the three Zettelkasten note types, tags and properties as the support layer |
| [`references/linking-and-graph.md`](references/linking-and-graph.md) | Wikilink syntax variants, backlinks and unlinked mentions, embeds, daily-note structure, reading the graph, Maps of Content |
| [`references/plugins-and-bases.md`](references/plugins-and-bases.md) | Native-first, plugin hygiene, properties, Bases versus Dataview with query examples, CSS snippets |
| [`references/templates.md`](references/templates.md) | Templater and native template bodies for daily, meeting, book, project, and Zettelkasten notes |
| [`references/ai-integration.md`](references/ai-integration.md) | Exposing the vault to an agent over MCP, the vault `CLAUDE.md`, local models, what not to expect |
| [`evals/trigger-eval.json`](evals/trigger-eval.json) | Should-trigger and should-not-trigger prompts for the description |

## What it won't do

It won't hand over a maximal vault template with thirty plugins; that
recreates the exact problem it exists to prevent. It does not cover generic
Markdown syntax, other note apps, or building an Obsidian plugin.
