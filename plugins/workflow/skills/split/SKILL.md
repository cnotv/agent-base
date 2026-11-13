---
name: split
description: >-
  Use after `to-tickets` has an approved breakdown, to publish it: "split the epic", "create the
  tickets", "publish the tickets". Creates each ticket as a GitHub sub-issue of the epic with
  native blocked-by links and an `Agent:` line naming the agent, target and model that runs it,
  then stops for the owner to review.
---

# Splitting an epic into tickets

The epic is a GitHub issue whose body is the spec (`to-spec`). Its tickets are its native
sub-issues, ordered by native "blocked by" links. A ticket is **ready** when it is open and
every ticket blocking it is closed. Dashi, the agent dashboard, reads this graph and starts one
fresh session per ready ticket, so everything a session needs is in its ticket.

The `gh` commands here are porcelain. Where it is refused (a GraphQL 403, or `gh auth status`
calling the token invalid), run the REST form of each from the `github-api` skill; a refused
command never skips a step.

## 1. Have an approved breakdown

Run `to-tickets` first when there is no breakdown the owner has approved in this conversation.
Never publish an unapproved one.

## 2. Write each ticket

```markdown
## What to build

The end-to-end behaviour this ticket makes work, from the user's point of view, not a list of
layers. Name the part of the epic's spec it delivers.

## Acceptance criteria

- [ ] Each criterion, checkable once the ticket's pull request lands

Agent: <agent> <target> [model]
```

The title is a plain summary, with no type prefix or number. Leave out a "Blocked by" section
and a parent reference: the native links carry both. No file paths or code snippets, which go
stale.

## 3. Choose the Agent line

`Agent: <agent> <target> [model]` sits on its own line. `<agent>` is `claude` or `opencode`;
`<target>` is one of Dashi's start targets: `laptop-remote-control` (a laptop session the owner
steers from the phone), `laptop-headless` (a laptop session nobody watches), `laptop-cloud` or
`cloud-routine`. Leave the model out to take the agent's default. When the owner named an agent
for a ticket, use theirs; otherwise take the default for the ticket's kind:

| Ticket kind                          | Agent line                              | Why                                                      |
| ------------------------------------ | --------------------------------------- | -------------------------------------------------------- |
| Feature or fix across several files  | `Agent: claude laptop-headless sonnet`  | The reliable default                                     |
| Small chore, docs or tests           | `Agent: opencode laptop-headless`       | A free model, nearly no cost                             |
| Design or UI                         | `Agent: claude laptop-remote-control`   | Screenshots need the owner's eye                         |
| Security, auth or secrets            | `Agent: claude laptop-headless opus`    | Never a free model where credentials are involved        |

A ticket that itself plans a further epic takes `Agent: claude laptop-remote-control opus`,
because grilling needs the owner's answers. A pull request's review is not a ticket: Dashi
starts it on a different model from the one that wrote the change.

## 4. Publish in dependency order

Create the blockers first, so every edge points at a real issue. A ticket lives in the
repository its pull request will land in, which may differ from the epic's.

```sh
gh issue create --repo <owner>/<repo> --title "<title>" --body-file <file>
```

Then link each ticket to the epic, and each blocked ticket to its blockers, through GraphQL with
the issues' node ids (`gh issue view <number> --repo <owner>/<repo> --json id --jq .id`):

```sh
gh api graphql -f query='mutation($epic: ID!, $ticket: ID!) {
  addSubIssue(input: {issueId: $epic, subIssueId: $ticket}) { issue { number } } }' \
  -f epic=<epic-node-id> -f ticket=<ticket-node-id>

gh api graphql -f query='mutation($ticket: ID!, $blocker: ID!) {
  addBlockedBy(input: {issueId: $ticket, blockingIssueId: $blocker}) { issue { number } } }' \
  -f ticket=<blocked-ticket-node-id> -f blocker=<blocking-ticket-node-id>
```

Do not close the epic or rewrite its spec.

## 5. Check the graph, then stop

Read the graph back and compare it with the approved breakdown:

```sh
gh api graphql -f query='query($epic: ID!) { node(id: $epic) { ... on Issue {
  subIssues(first: 50) { nodes { number title repository { nameWithOwner }
    blockedBy(first: 20) { nodes { number } } } } } } }' -f epic=<epic-node-id>
```

Every ticket is a sub-issue, every edge is present, and every body has an `Agent:` line. Then
stop: list the tickets with their links, blockers and agents, and say which are ready now. The
owner reviews the split and starts the tickets; this session writes no code, branch or pull
request.

## Definition of done

Every approved ticket exists as a sub-issue of the epic with an `Agent:` line, every blocking
edge is a native link, the read-back matches the breakdown, and the owner has the list.
