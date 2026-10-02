# agent-base

Shared agent skills, rules and workflows for every cnotv repository. One copy, read by both
Claude Code and Codex, so a procedure improved here improves everywhere.

| Path                                        | What it is                                                                          |
| ------------------------------------------- | ----------------------------------------------------------------------------------- |
| `plugins/workflow/skills/`                  | The shared skills, in the open Agent Skills format (`SKILL.md`)                     |
| `plugins/workflow/hooks/hooks.json`         | Claude Code hooks that report session status to Dashi, the agent dashboard                 |
| `plugins/workflow/scripts/report-status.sh` | The reporter, shared with Codex's `notify`                                          |
| `AGENTS.base.md`                            | The shared agreements, copied into each repository's `AGENTS.md` as a managed block |
| `templates/`                                | Project facts, pull request and issue templates for a new repository                |
| `.github/workflows/pr-preview.yml`          | Reusable workflow: a screenshot, a video and a before screenshot per pull request   |

## Skills

| Skill            | Use when                                                              |
| ---------------- | --------------------------------------------------------------------- |
| `start`          | first, on every new request: picks the workflow and lists its steps   |
| `start-issue`    | before any code: the issue, main synced, the branch named             |
| `open-pr`        | at the first commit, and again when validated                         |
| `verify`         | confirming a change works or looks right in the running app           |
| `finish-change`  | before claiming work is complete                                      |
| `journey-doc`    | a finding is worth recording                                          |
| `security-audit` | a security question, an alert, or a change to auth, input, deps or CI |

Plugin skills are namespaced by the plugin: `/workflow:start`, `/workflow:open-pr`.

## Using it in a repository

### Claude Code

Add to the repository's `.claude/settings.json`, so every session, local or cloud, installs it:

```json
{
  "extraKnownMarketplaces": {
    "cnotv": { "source": { "source": "github", "repo": "cnotv/agent-base" } }
  },
  "enabledPlugins": {
    "workflow@cnotv": true
  }
}
```

### Codex

```sh
codex plugin marketplace add cnotv/agent-base
codex plugin add workflow@cnotv
```

For session status, point Codex's `notify` at the same reporter in `~/.codex/config.toml`:

```toml
notify = ["sh", "/path/to/agent-base/plugins/workflow/scripts/report-status.sh", "codex"]
```

### AGENTS.md

Copy `AGENTS.base.md` between these markers in the repository's `AGENTS.md`, and add a
**Project facts** section from `templates/project-facts.md` below it. The workflow skills read
their commands, ports and paths from Project facts.

```markdown
<!-- agent-base:start -->

...contents of AGENTS.base.md...

<!-- agent-base:end -->
```

Dashi compares the block with `AGENTS.base.md` and opens a pull request when it
drifts. Never edit the block in the repository.

### Pull request preview

```yaml
# .github/workflows/pr-preview.yml in the repository
name: PR preview
on:
  pull_request:
jobs:
  preview:
    uses: cnotv/agent-base/.github/workflows/pr-preview.yml@main
    with:
      start-command: pnpm dev --port 5317 --strictPort
      port: 5317
```

A `Preview route: /some/route` line in the pull request body records that route instead of
the default. When the feature is folded away or below the fold, `Preview click: <selector>`
lines (up to five, clicked in order) unfold it and one `Preview show: <selector>` line scrolls
it to the top before the screenshot. A selector that matches nothing fails the recording.

The workflow then stops the app, starts the base branch the same way, and takes `before.png`
of the same route with the same clicks, so Dashi can show the change as before and after. On
the base branch a selector that matches nothing is skipped, since the feature may not exist
yet. Nothing on the base branch can fail the preview: if it doesn't install, start or record,
the artifact just has no `before.png`. `compare-with-base: false` turns it off.

### Session status

The hooks do nothing unless `DASHI_URL` is set. With it (and `DASHI_TOKEN`), every session start, prompt, notification, stop and end is posted
to [Dashi](https://github.com/cnotv/dashi), with the branch and remote, so it can link sessions
to issues and pull requests. `AGENT_DASHBOARD_URL` and `AGENT_DASHBOARD_TOKEN`, the names from
before the rename to Dashi, still work when the new ones are unset.

## Developing

```sh
npm install
npm run typecheck
npm test
claude plugin validate .
```
