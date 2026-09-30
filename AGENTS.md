# agent-base

The shared skills and rules that every cnotv repository installs. A change here reaches every
repository, so keep each skill repository-neutral: anything specific to one repository is
read from that repository's **Project facts**, never written into a skill.

The shared agreements in `AGENTS.base.md` apply here too. This repository is their source,
so it does not carry a copy of the managed block.

## Rules for this repository

- A skill states what to do; the repository it runs in says with which commands. If a skill
  needs a command, a port or a path, add a line to `templates/project-facts.md` and read it
  from Project facts.
- `plugins/workflow/.claude-plugin/plugin.json` and `plugins/workflow/.codex-plugin/plugin.json` carry
  the same name, version and description. Bump the version in both on every release.
- The status reporter must never block or fail a session: no output, a two-second timeout,
  and exit 0 on every path.
- `AGENTS.base.md` is copied into other repositories verbatim, so it never refers to files in
  this repository.

## Project facts

- **Install:** `npm install`
- **Checks:** `npm run typecheck`, `npm test`, `claude plugin validate .`,
  `claude plugin validate ./plugins/workflow`, `shellcheck plugins/workflow/scripts/*.sh`
- **Docs home:** `README.md`
- **Preview deploys:** none

### Done checklist

- [ ] A new skill is listed in the README's Skills table
- [ ] Both plugin manifests agree on name, version and description
