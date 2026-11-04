---
name: grill-with-docs
description: >-
  Use when grilling a plan in a repository whose vocabulary matters, or when the owner asks to
  "grill with docs", sharpen the terms, or record the decisions as they are made. Runs
  `grilling` and, alongside it, keeps the glossary current and records the decisions worth
  keeping, the moment each one settles.
---

# Grilling with docs

Adapted from `grill-with-docs` and `domain-modeling` in
[mattpocock/skills](https://github.com/mattpocock/skills) (MIT, copyright 2026 Matt Pocock);
the license notice is in the plugin's `NOTICE.md`.

Run `grilling` exactly as it describes. While the rounds go on, build and sharpen the
project's language as well: challenge terms, invent edge cases, and write the glossary and the
decisions down as they crystallise, not in a batch at the end.

## Where the docs live

The glossary is the file named under **Glossary** in Project facts, `GLOSSARY.md` at the
repository root when none is named. A `GLOSSARY-MAP.md` at the root means the repository has
several contexts: it points to each context's own glossary, and the topic at hand decides
which one applies (ask when it is unclear). Create a glossary only when the first term is
resolved.

## During the rounds

- **Challenge against the glossary.** When the owner uses a term that conflicts with the
  glossary, say so at once: "the glossary defines cancellation as X, but you seem to mean Y.
  Which is it?"
- **Sharpen fuzzy language.** When a term is vague or overloaded, propose one precise
  canonical term.
- **Stress-test with scenarios.** Invent concrete cases that probe the boundaries between
  concepts and make the owner precise about them.
- **Cross-reference the code.** When the owner says how something works, check whether the code
  agrees, and surface any contradiction as a question.

## The glossary

Update it the moment a term is resolved. Each entry is the term in bold, a definition of one or
two sentences saying what it is (not what it does), and an `_Avoid_:` line with the synonyms it
replaces. Be opinionated: one word per concept. Only terms specific to this project belong;
general programming concepts do not. Group terms under subheadings when clusters appear. The
glossary holds no implementation details: it is not a spec or a scratch pad.

## Decisions

Record a decision only when all three hold: it is hard to reverse, it would surprise a future
reader without context, and it was a real trade-off between genuine alternatives. Record it
through `journey-doc`. When the repository already keeps decision records in another form (a
`docs/adr/` folder, or one named under Docs home), add one there in that form instead.

## Definition of done

`grilling` is done, every term resolved during it is in the glossary, and every decision that
met the three tests is recorded.
