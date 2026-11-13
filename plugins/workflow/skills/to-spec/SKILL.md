---
name: to-spec
description: >-
  Use after a plan has been grilled and settled, to write it up as a spec in the epic issue's
  body: "write the spec", "turn this into a spec", "write up the epic". No interview: it
  synthesises what the conversation and the codebase already say.
---

# Writing the spec

Adapted from `to-spec` in [mattpocock/skills](https://github.com/mattpocock/skills) (MIT,
copyright 2026 Matt Pocock); the license notice is in the plugin's `NOTICE.md`.

Take what the conversation settled and what the codebase shows, and write the spec. Do not
interview the owner again; that was `grilling`. GitHub is the tracker: the spec is the body of
the epic issue.

The `gh` commands here are porcelain. Where it is refused (a GraphQL 403, or `gh auth status`
calling the token invalid), run the REST form of each from the `github-api` skill; a refused
command never skips a step.

## 1. Read the current state

Explore the repository if you have not already. Use the glossary's vocabulary throughout (see
`grill-with-docs` for where it lives) and respect the decisions recorded in the area.

## 2. Sketch the test seams

Name the seams at which the feature will be tested. Prefer existing seams to new ones, and the
highest seam possible; when a new one is needed, propose it as high as it can go. The fewer
seams, the better: the ideal is one. Check with the owner that the seams match what they
expect.

## 3. Write it into the epic

Write the spec with the template below. When the epic issue exists, replace its body with
`gh issue edit <number> --body-file <file>`; otherwise create it with
`gh issue create --title "Epic: <summary>" --body-file <file>`. Keep any text the owner wrote
in the body that the spec does not replace, such as an `Agent:` line.

```markdown
## Problem

The problem the user faces, from the user's point of view.

## Solution

The solution, from the user's point of view.

## User stories

A long, numbered list covering every aspect of the feature, each as:

1. As a <actor>, I want <feature>, so that <benefit>

## Implementation decisions

The decisions made: modules built or changed and their interfaces, architectural choices,
schema changes, API contracts, specific interactions, the developer's technical
clarifications. No file paths or code snippets, which go stale fast. The exception is a
snippet from a prototype that states a decision more precisely than prose (a state machine,
a schema, a type shape): inline only its decision-rich part and say it came from a prototype.

## Testing decisions

What makes a good test here (external behaviour, not implementation details), which modules
are tested, the seams from step 2, and the existing tests to follow.

## Out of scope

What this spec deliberately leaves out.

## Further notes

Anything else a ticket's session needs to know.
```

## Definition of done

The epic issue's body is the spec, every section filled or explicitly marked as having
nothing, and the owner has agreed the test seams.
