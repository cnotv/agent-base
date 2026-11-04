---
name: to-tickets
description: >-
  Use after a spec is written, to break it into tickets before anything is published: "break
  this into tickets", "slice the epic", "what are the tickets". Drafts tracer-bullet vertical
  slices, each small enough for one fresh session, with the tickets that block it, and iterates
  with the owner until the breakdown is approved. Publishing is `split`.
---

# Drafting the tickets

Adapted from `to-tickets` in [mattpocock/skills](https://github.com/mattpocock/skills) (MIT,
copyright 2026 Matt Pocock); the license notice is in the plugin's `NOTICE.md`.

Break a spec, a plan or the conversation into **tickets**: tracer-bullet vertical slices, each
declaring the tickets that **block** it. This skill drafts and agrees the breakdown; `split`
publishes it as sub-issues of the epic.

## 1. Gather context

Work from the conversation. When given an issue number or URL, read its body and comments with
`gh issue view <number> --comments`.

## 2. Read the code

If you have not explored the repository yet, do so. Ticket titles and descriptions use the
glossary's vocabulary and respect the decisions recorded in the area. Look for prefactoring
that makes the work easier: make the change easy, then make the easy change.

## 3. Draft vertical slices

- Each slice cuts a narrow but complete path through every layer it touches (schema, API, UI,
  tests): vertical, never one layer on its own.
- A finished slice is demoable or verifiable on its own.
- Each slice fits in one fresh session's context, and lands as one pull request against the
  default branch.
- Prefactoring comes first.

Give each ticket its **blocking edges**: the tickets that must be closed before it can start.
A ticket with no blockers can start at once. Block only on what genuinely gates the work, so
as many tickets as possible can run in parallel.

**A wide refactor is the exception.** One mechanical change whose blast radius fans across the
whole codebase (renaming a column, retyping a shared symbol) cannot land green as a vertical
slice. Sequence it as expand and contract instead: first a ticket that adds the new form beside
the old, so nothing breaks; then one ticket per batch of call sites (per package or folder,
sized by blast radius), each blocked by the expand, each green because the old form still
exists; last, a ticket blocked by every batch that deletes the old form. Only when even the
batches cannot stay green alone do they share an integration branch, all blocking a final
integrate-and-verify ticket, which is the only one promised green.

## 4. Agree it with the owner

Present the breakdown as a numbered list. For each ticket show:

- **Title**: a short descriptive name
- **Blocked by**: the tickets that must close first, or none
- **What it delivers**: the end-to-end behaviour it makes work
- **Kind**: feature, fix, chore, docs, tests, design or security, which `split` turns into the
  ticket's `Agent:` line

Ask whether the granularity is right (too coarse or too fine), whether each blocking edge is
real, and whether any tickets should merge or split further. Iterate until the owner approves.

## Definition of done

The owner has approved a numbered breakdown in which every ticket has a title, its blockers,
what it delivers and its kind. Hand it to `split`.
