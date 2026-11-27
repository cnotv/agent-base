---
name: designo-template
description: >-
  Use when an artist or designer asks for a template to start from in Designo: a picture book,
  zine, card, postcard, letterhead or stationery set, poster series or any paged layout with art
  areas, briefs and a palette ready to paint or compose into. Routes to the skill Designo serves.
---

# Designo Template

A router, kept thin on purpose. Designo owns the knowledge of its own tools and serves it from its
MCP server, so it matches the version you are connected to and works for someone who uses Designo
without this skill pack. Nothing about Designo's operations, limits or print specs lives here.

## Steps

1. Check that the Designo MCP server is connected (tools such as `list_files` and `apply_ops`).
   If it is not, say so and stop; do not build the template by hand in another tool.
2. Call `get_skill` with no arguments, then again with the name of the matching skill
   (`designo-template` for artist and stationery templates), and follow it, loading its reference
   files as it directs.
3. If `get_skill` does not exist, the connected Designo is older than the skills. Tell the owner to
   update it; do not rebuild the procedure from memory.
4. If the look is not decided yet, run `visual-design-craft` first for style direction, then pass
   its palette, type and mood to the Designo skill.

## Boundary

This skill points at Designo's skills and never the reverse: Designo's skills do not name this
repository. Anything true of Designo only belongs in Designo's skill; anything true of any design
tool (style, workflow, review) belongs in a skill here.
