---
name: grilling
description: >-
  Use when a plan, decision or idea needs stress-testing before anything is built: planning an
  epic, "grill me", "poke holes in this", "challenge this plan", or any request whose scope or
  behaviour is still open. Interviews the owner in rounds of numbered questions, each with a
  recommended answer, until every decision is settled.
---

# Grilling a plan

Adapted from `grilling` in [mattpocock/skills](https://github.com/mattpocock/skills) (MIT,
copyright 2026 Matt Pocock); the license notice is in the plugin's `NOTICE.md`.

Interview the owner until you reach a shared understanding. Map it as a **design tree**: every
decision branches into the decisions that hang off it.

## Rounds

Work the tree in **rounds**. The **frontier** is every decision whose prerequisites are
already settled: the questions you can ask now without guessing at answers you have not heard
yet. Ask the whole frontier in one round, number each question and give your recommended
answer. Then wait for the answers before the next round.

Format a round like this:

```
**Q1. <question title>**: <question body, as many paragraphs as it needs, with the choices>

Recommended: <your answer>

**Q2. <question title>**: <question body>

Recommended: <your answer>
```

Word each question so "yes" accepts your recommendation.

Each round of answers reshapes the tree: settled decisions push the frontier outward and
unblock the questions that hung on them. Recompute the frontier and ask the next round. A
question whose answer depends on another question still open in this round belongs to a later
round.

## Facts are yours, decisions are the owner's

Finding facts is your job, never the owner's. When a frontier question needs a fact from the
repository, the issue tracker or a tool, send a subagent with a fresh context to find it rather
than asking. Do not block on it: a running search is an unsettled prerequisite, so only the
questions downstream of it wait; ask the rest of the frontier now. The decisions are the
owner's: put each one to them and wait.

## Definition of done

The frontier is empty: every branch of the design tree visited, nothing silently assumed, and
the owner has confirmed the shared understanding. Nothing is acted on before that confirmation.
