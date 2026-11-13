---
name: review-pr
description: >-
  Use when a session is started to review a pull request, or when asked to "review PR 12",
  "review this branch against its ticket" or "give a second opinion on this change". Reviews the
  diff on two independent axes, the repository's standards and the ticket it closes, in parallel
  subagents, changes nothing, and comments the findings on the pull request.
---

# Reviewing a pull request

Adapted from `code-review` in [mattpocock/skills](https://github.com/mattpocock/skills) (MIT,
copyright 2026 Matt Pocock), renamed so it does not collide with Claude Code's built-in
`/code-review`; the license notice is in the plugin's `NOTICE.md`.

Two axes, reported side by side:

- **Standards**: does the change follow this repository's documented rules?
- **Spec**: does the change do what its ticket asked for?

A change can pass one and fail the other: code that follows every rule but builds the wrong
thing, or code that does exactly what was asked while breaking the conventions. Keeping the
axes apart stops one from masking the other.

The review changes nothing: no commits, no pushes, no edits to the pull request's body, and no
approval or request for changes. Its only output is one comment on the pull request.

The `gh` commands here are porcelain. Where it is refused (a GraphQL 403, or `gh auth status`
calling the token invalid), run the REST form of each from the `github-api` skill; a refused
command never skips a step.

## 1. Pin the pull request

```sh
gh pr view <number> --json number,title,body,baseRefName,headRefOid,closingIssuesReferences
gh pr diff <number>
git log --oneline origin/<base>..<head-sha>
```

Stop here when the pull request does not resolve or its diff is empty, before any subagent
starts.

## 2. Find the spec

In this order: the issues the pull request closes (`closingIssuesReferences`, or the
`Closes #n` line in its body), read with `gh issue view <n> --comments`, together with the
epic that issue is a sub-issue of when it has one; a spec the request names; otherwise ask
where it is. When there is none, the Spec axis is skipped and the report says so.

## 3. Find the standards

Every file that says how code is written here: `AGENTS.md` (with its shared agreements),
`CLAUDE.md`, `CONTRIBUTING.md` or `CODING_STANDARDS.md` when present, the scoped rules and the
done checklist named in Project facts, and the pull request template.

On top of these, the Standards axis always carries the **smell baseline** below, a fixed set of
code smells from Fowler's _Refactoring_. The repository's own rules override it: where they
endorse something the baseline would flag, drop the smell. Each smell is a judgement call
("possible Feature Envy"), never a hard violation, and nothing a linter already enforces is
reported.

- **Mysterious Name**: a name that does not reveal what the thing does or holds. Fix: rename;
  if no honest name comes, the design is murky.
- **Duplicated Code**: the same logic shape in more than one hunk or file. Fix: extract it and
  call it from both.
- **Feature Envy**: a function that reaches into another module's data more than its own. Fix:
  move it next to that data.
- **Data Clumps**: the same few fields or parameters travelling together. Fix: one type for
  them.
- **Primitive Obsession**: a primitive or string standing in for a domain concept. Fix: a
  small type of its own.
- **Repeated Switches**: the same branching on the same type in several places. Fix: one map
  both places share.
- **Shotgun Surgery**: one logical change forcing scattered edits across many files. Fix:
  gather what changes together into one module.
- **Divergent Change**: one module edited for several unrelated reasons. Fix: split it so each
  part changes for one reason.
- **Speculative Generality**: parameters, hooks or abstractions the spec does not need. Fix:
  delete and inline until a real need appears.
- **Message Chains**: long navigation through objects the caller should not depend on. Fix:
  hide the walk behind one function.
- **Middle Man**: a function or module that mostly delegates onward. Fix: call the real target.
- **Refused Bequest**: an implementer that ignores most of what it inherits. Fix: compose
  instead of inheriting.

## 4. Run both axes in parallel

Start two subagents in the same message, each with a fresh context, and wait for both.

**Standards** gets the diff commands, the commit list, the standards files from step 3 and the
smell baseline pasted in full. Its brief: "Report, per file and hunk, (a) every place the diff
breaks a documented rule, citing the file and the rule, and (b) any baseline smell, named and
with the hunk quoted. Mark documented breaches as hard and smells as judgement calls. Skip what
tooling enforces. Under 400 words."

**Spec** gets the diff commands, the commit list and the spec's text. Its brief: "Report (a)
requirements the spec asks for that are missing or partial, (b) behaviour in the diff nobody
asked for, and (c) requirements that look implemented but wrongly. Quote the spec line for each
finding. Under 400 words."

## 5. Comment on the pull request

Write the two reports under `## Standards` and `## Spec`, as returned or lightly cleaned. Do
not merge or rerank findings across the axes. End with one line: the number of findings per
axis and the worst one within each. Name the commit reviewed (`headRefOid`) so a later push is
visibly not covered. Check the comment for session links before posting, as `open-pr`
describes, then post it:

```sh
gh pr comment <number> --body-file <file>
```

## Definition of done

One comment on the pull request carries both axes (or says why Spec was skipped) for a named
commit, and the repository and the pull request are otherwise exactly as the review found them.
