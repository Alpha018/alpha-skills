# Exposing the vault to an AI agent

This is an optional layer. It only makes sense once the vault already has a
real structure worth reading. Do not set this up during initial vault setup.

## Why do it

Instead of re-explaining context in every conversation with a model, give the
agent direct access to the vault. It reads existing notes, reasons over the
connections, and writes new notes in the same structure. The vault holds the
content; the agent is just one way to read and write it.

A concrete example: point the agent at every note missing a required
property and have it fill the gap in one pass, or ask it to surface pairs of
notes that discuss the same idea without linking each other.

## Typical setup

1. **A `CLAUDE.md` (or equivalent) at the vault root** describing the folder
   layout, the property schema, the naming conventions, and the organization
   method in use. This is what lets the agent write notes that match.
2. **An Obsidian MCP server** exposing the vault to the agent: read a note,
   search, list by tag, create a note, run a Dataview or Bases query.
3. **A few custom commands** for the operations that recur (new permanent
   note, process the inbox, weekly review scaffold).

Keep write access deliberate. An agent that can create and edit notes can also
create mess at scale. Start with read plus search, add targeted write
operations once the read side is trusted.

## Local models

For a privacy-first vault, a local LLM runner (Ollama and similar) keeps the
local-first property intact: the vault never leaves the machine. Trade-off is
model quality versus a hosted model. Reasonable for summarization, tagging,
and link suggestions; weaker for long-form synthesis.

## What not to expect

- The agent does not replace the linking discipline. It suggests connections;
  a person still decides which notes should exist.
- MCP integration is a bolt-on via plugins and external servers, not a native
  Obsidian feature. Treat it as infrastructure that can change.
- Keep note content in standard Markdown so it stays readable regardless of
  which agent or interface is pointed at it next.
