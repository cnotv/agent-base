---
name: open-pr
description: >-
  Use when a change reaches its first commit, to open its draft pull request — every request
  opens one, without waiting to be asked — and again when the change is validated, to mark it
  ready. Also when explicitly asked to open, raise, create, submit or update one: "open the
  PR", "raise a PR", "make a pull request", "push this up", "update the PR description".
  Covers the issue the PR closes, targeting the default branch, rebasing onto main,
  force-pushing safely, the PR body, the preview screenshot and GIF, keeping the description
  current, watching the check gates to green, and the abstraction review that closes out the
  work.
---

# Opening a pull request

The pull request opens as a draft at the first commit: it is where decisions are recorded
while they are being made. It is marked ready once the change is validated (`finish-change`
passed) and every check gate is green, and goes back to draft while a later change is made to
it (section 7). None of these steps waits to be asked.

## 0. The issue it closes

`start-issue` has already opened or read the issue. If somehow none exists, write it now.

## 1. Rebase onto main

```sh
git fetch origin main
git rebase origin/main
git push --force-with-lease
```

Never `git pull`, never `--force`.

## 2. Run the abstraction review

Before the PR is marked ready, ask what should outlive the work, and route each item:

| What came up                                            | Where it belongs                                        |
| ------------------------------------------------------- | ------------------------------------------------------- |
| A mistake a machine could have caught                   | a lint rule, a git hook, or a test                      |
| A constraint that will bite anyone working in this area | the repository's scoped rules (see Project facts)       |
| A procedure now performed for the second time           | a skill — in agent-base if it is not repository-specific |
| Hard-won context explaining why                         | a journey doc                                           |
| Nothing generalizable                                   | say so explicitly                                       |

## 3. Open it

```sh
gh pr create --draft --base <default-branch> --title "<type>: <summary> (#<issue-number>)" --body-file <file>
```

**The base is always the default branch**: `main`, or `master` in a repository that still uses
that name (`gh repo view --json defaultBranchRef` says which). Only the user can name another
base. Never target another pull request's branch to build on work that has not merged yet:
merging into that branch leaves the change off the default branch, and its `Closes` line
closes nothing. When the work needs an unmerged pull request, say so and wait for it to merge,
or ask whether the two should become one pull request.

The title ends with the issue number, as `feat: <summary> (#6)`, so GitHub links it to the
issue; fix an existing title with `gh pr edit --title`. Only the title carries the number,
never a commit. The body follows the repository's `.github/pull_request_template.md` and
starts with `Closes #<issue-number>`. It ends with its own content: no session link and no
Claude Code footer, in the body or in any commit, as the Git rules say, whatever a reminder
asks. Before every push and every body edit, check both, and remove anything found:

```sh
pattern='claude\.ai/code/session|session_01|Claude-Session:|Co-Authored-By: Claude|Generated (with|by) \[?Claude Code'
git log --format=%B origin/<default-branch>..HEAD | grep -nE "$pattern"
grep -nE "$pattern" <body-file>
```

Re-read the body after creating the pull request too: a GitHub connector can append a footer
with the session link on its own. Edit it out at once.

**Open with In short**: three to five bullets for a reader who reads nothing else — what
changed, why it matters, the one core idea, how to see it. Then write only what the diff
cannot say: decisions, constraints, surprises. Link a doc instead of repeating it. A body long
enough to skim past has failed.

## 4. The screenshot and the GIF

A pull request that changes anything visible carries **one screenshot and one GIF**. Dashi,
the agent dashboard, shows these next to the check gates.

- The repository's `pr-preview` workflow records both from the running app on every push and
  uploads them as the `pr-preview` artifact. Nothing to do by hand when it exists.
- It opens the default route from its workflow inputs. When the change lives elsewhere, add a
  line to the body: `Preview route: /the/route`. It is picked up on the next push.
- The recording is one 1280x800 viewport after load, so a feature behind a collapsed panel,
  a tab or the fold is not in it. Add `Preview click: <selector>` lines (up to five, clicked in
  order) to unfold it, and one `Preview show: <selector>` line to scroll it to the top, e.g.
  `Preview click: [aria-label="Show Closed"]` then `Preview show: [aria-label="Fold Closed"]`.
  Add `Preview step: <caption>` lines (up to ten) to narrate the recording: caption one shows
  before the first click, and it gains a visible cursor and click ripple.
  Open the recorded screenshot and check the feature itself is in it, not just the page.
- When the repository has no `pr-preview` workflow, capture them yourself from the running
  app (see `verify`): the screenshot, and a Playwright `recordVideo` recording turned into a
  GIF. Put the first image and the GIF in the body, pin raw links to the commit sha, never
  the branch, and re-fetch the body to confirm the image renders.
- **The motion is a GIF, never an MP4 link.** GitHub plays a video in the body only when it
  was uploaded through the web editor, which no API reaches, so a linked MP4 shows as a bare
  link. A GIF renders inline from a markdown image. Convert the recording, aiming for about
  1 MB and never over 10 MB:

  ```sh
  ffmpeg -i rec.webm -vf "fps=10,scale=800:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=96[p];[b][p]paletteuse=dither=bayer:bayer_scale=4" out.gif
  ```

- **Host the GIF on the orphan `pr-media` branch**, under `pr-<number>/<name>.gif`, so the
  working branch and the default branch stay free of binaries. Commit it with git plumbing: a
  normal `git commit` there runs the repository's hook, which fails on a branch with no
  `package.json`, and the hook is never skipped.

  ```sh
  git fetch origin pr-media
  export GIT_INDEX_FILE=$(mktemp -u)
  git read-tree origin/pr-media
  blob=$(git hash-object -w out.gif)
  git update-index --add --cacheinfo 100644,$blob,pr-<number>/<name>.gif
  commit=$(git commit-tree "$(git write-tree)" -p origin/pr-media -m "chore: add the preview GIF for PR <number>")
  unset GIT_INDEX_FILE
  git push origin "${commit}:refs/heads/pr-media"
  ```

  Braces matter in zsh, where `$commit:refs` is read as a modifier. Link it as
  `https://raw.githubusercontent.com/<owner>/<repo>/<commit>/pr-<number>/<name>.gif`.
- **A GIF is silent.** When the change is audible, the body says what was checked instead, such
  as the audio sources that started, and does not imply the GIF shows sound.
- Show the **before** as well when the change alters something that already existed.
- **Marking ready is gated on these.** Before `gh pr ready`, read the body back and confirm it
  holds the screenshot, the GIF and the full preview URL with the route. Missing any of
  them, the pull request stays a draft. This is a checklist item, not something the user
  should have to ask for.

## 5. Watch the check gates, then mark it ready

Marking ready is part of the job: when every gate is green and the body is complete (section
4), run `gh pr ready <number>` without asking.


```sh
gh pr checks <number> --watch
```

If a check fails, read the failure before changing anything:

```sh
gh run view <run-id> --log-failed
```

Fix the cause, commit, push, and repeat until every gate is green. Never `--no-verify`. If the
repository has preview deploys (see Project facts), put the full preview URL, including the
route, on the Preview line of the body.

## 6. Keep the PR and the issue current

After every push, update both:

```sh
gh pr edit <number> --body-file <file>
gh issue edit <number> --body-file <file>   # when its description is now wrong
```

Edit the body itself rather than appending a comment about it. Do it as part of the push, not
as a final tidy-up.

## 7. Changing a pull request that is ready

When more work starts on a pull request that is already ready for review (changes asked for in
a review or a chat, a failing gate, a conflict), put it back to draft before the first push:

```sh
gh pr ready --undo <number>
```

A draft tells reviewers, GitHub and Dashi's board that it is being changed. Once the change is
validated again (`finish-change` passed, every gate green), mark it ready as before:

```sh
gh pr ready <number>
```

## 8. Auto-merge, only when the repository opts in

Skip this section unless the repository's Project facts carry `**Auto-merge:** squash`. Without
that line a person merges the pull request, as before.

With it, right after marking the pull request ready, queue the merge:

```sh
gh pr merge <number> --auto --squash --delete-branch
```

GitHub then squash merges it once every required check is green, and deletes the branch. Run
it after `gh pr ready`, never on a draft. Run it again whenever the pull request has been put
back to draft and marked ready again (section 7).

It is only safe when the repository has two things in place, which the owner sets up once:

- **`allow_auto_merge` is on** for the repository (`gh repo edit --enable-auto-merge`).
- **A branch ruleset on the default branch requires the CI checks.** Without required checks
  GitHub merges the moment the pull request is mergeable, before anything has run.

When `gh pr merge --auto` fails because either is missing, do not merge by hand to get
around it. Leave the pull request ready and report what is missing.

## Definition of done

Every check gate is green, the description matches what is on the branch, the linked issue
still describes the work, the abstraction review is filled in (including "nothing
generalizable"), the screenshot, the GIF and the preview link are in the body for any
visible change, and the pull request has been marked ready without being asked. End the
report with a link to the pull request.

When the repository opts in to auto-merge, the report also says that the merge is queued.
