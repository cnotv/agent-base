---
name: github-api
description: >-
  Use before deciding GitHub is unreachable, and whenever a `gh` command fails with "GitHub
  GraphQL is not available", HTTP 403 from a proxy, or "The token in GH_TOKEN is invalid".
  Also before running `gh issue create`, `gh issue view`, `gh pr create`, `gh pr ready`,
  `gh pr merge --auto` or `gh api graphql` in a cloud or sandboxed agent session. Gives the
  REST call for each, so the issue, branch and draft pull request still happen.
---

# GitHub through `gh api`

Some agent sessions reach GitHub through a proxy that adds the credentials to each request on
its way out. There, `gh` behaves in three ways an agent must not misread:

- **`gh auth status` says the token is invalid.** The token in the environment is a placeholder;
  the proxy signs the real request. It says nothing about whether GitHub works.
- **GraphQL is refused** with HTTP 403. Most porcelain commands use it: `gh issue create`,
  `gh issue view`, `gh issue list`, `gh pr create`, `gh pr view --json`, `gh pr checks`,
  `gh pr ready`, `gh pr merge`, `gh api graphql`.
- **The REST API works**: `gh api repos/<owner>/<repo>/...`, and porcelain built on REST, such
  as `gh run list`, `gh run view --log-failed` and `gh pr diff`.

## Is GitHub reachable?

Never decide from `gh auth status`. Make one real read:

```sh
gh api repos/<owner>/<repo> --jq .full_name
```

If it prints the repository, GitHub works: open the issue, the branch and the draft pull request
as the shared agreements require, with the calls below. Only a failure of this call, retried
once, means GitHub is out of reach. Then say so, and ask before pushing anywhere but a branch.

## REST for each command

Write bodies to a file and pass them with `-F body=@<file>`, which keeps quoting out of the way.

| Porcelain                                   | REST through `gh api`                                                                                         |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `gh issue create`                           | `gh api repos/<o>/<r>/issues -f title='<title>' -F body=@<file> --jq .number`                                 |
| `gh issue view <n> --comments`              | `gh api repos/<o>/<r>/issues/<n>` and `gh api repos/<o>/<r>/issues/<n>/comments`                              |
| `gh issue edit <n> --body-file <file>`      | `gh api -X PATCH repos/<o>/<r>/issues/<n> -F body=@<file>`                                                    |
| `gh issue list`                             | `gh api 'repos/<o>/<r>/issues?state=open' --jq '.[] \| select(.pull_request \| not) \| "\(.number) \(.title)"'` |
| `gh pr create --draft`                      | `gh api repos/<o>/<r>/pulls -f title='<title>' -f head=<branch> -f base=main -F draft=true -F body=@<file> --jq .number` |
| `gh pr view <n> --json ...`                 | `gh api repos/<o>/<r>/pulls/<n>`; the issues it closes are the `Closes #` lines in its `body`                  |
| `gh pr edit <n> --title / --body-file`      | `gh api -X PATCH repos/<o>/<r>/pulls/<n> -f title='<title>'` or `-F body=@<file>`                              |
| `gh pr comment <n> --body-file <file>`      | `gh api repos/<o>/<r>/issues/<n>/comments -F body=@<file>`                                                    |
| `gh pr checks <n> --watch`                  | `gh api repos/<o>/<r>/commits/<head-sha>/check-runs --jq '.check_runs[] \| "\(.name): \(.status) \(.conclusion)"'`, plus `.../commits/<head-sha>/statuses` for status contexts such as deploy previews; repeat until nothing is pending |
| `gh pr ready <n>`                           | `gh api -X POST repos/<o>/<r>/pulls/<n>/ccr/ready_for_review`                                                 |
| `gh pr ready --undo <n>`                    | `gh api -X POST repos/<o>/<r>/pulls/<n>/ccr/convert_to_draft`                                                 |
| `gh pr merge <n> --auto`                    | `gh api -X PUT repos/<o>/<r>/pulls/<n>/ccr/auto_merge` (`-X DELETE` turns it off)                             |
| review threads (GraphQL)                    | `gh api repos/<o>/<r>/pulls/<n>/ccr/review_threads`; resolve with `-X POST repos/<o>/<r>/pulls/<n>/ccr/comments/<comment-id>/resolve` |
| sub-issue link                              | `gh api -X POST repos/<o>/<r>/issues/<parent>/sub_issues -F sub_issue_id=<child-id>`, the child's `.id` from its issue |
| blocked-by link (`gh api graphql`)          | `gh api -X POST repos/<o>/<r>/issues/<n>/dependencies/blocked_by -F issue_id=<blocker-id>`, the blocker's `.id` |

The `ccr/` routes are the proxy's own, for what GitHub offers only through GraphQL. When a call
is refused, read the error: the proxy names the route to use instead.

## Rules

- **Try the call before reporting a limit.** A failed porcelain command is a reason to use its
  REST form, never a reason to skip the issue, branch or pull request.
- **Never push to the default branch** because opening a pull request seemed impossible.
- **`git push` is separate from `gh`.** Pushing goes through git's own credentials; a working
  push says nothing about `gh`, and a failing `gh` says nothing about pushing.
