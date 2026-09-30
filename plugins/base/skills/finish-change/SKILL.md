---
name: finish-change
description: >-
  Use before claiming work is complete, done, finished, ready or working, and before
  committing or opening a pull request — "is this done", "wrap it up", "finish this off",
  "ready to commit". Runs the repository's checks and walks its done-checklist: the
  registrations, docs and follow-up procedures that are easy to omit and hard to notice
  missing.
---

# Finishing a change

The point of this sweep is the things nobody notices are missing. A forgotten lint fix
surfaces in seconds; a forgotten registration surfaces in months, if ever.

## Run the checks

Run every command listed under **Checks** in the repository's Project facts. Read the output.
"It should pass" is not evidence — if you did not see it pass, it did not pass. If any fail,
the work is not finished, and reporting it as finished with a note about the failure is still
reporting it wrong.

## Walk the done-checklist

Walk every line of the **Done checklist** under Project facts. Each is there because it is
invisible when missing.

Then the lines that hold everywhere:

- **Changed a public API** — the reference docs match the new exports.
- **Changed a file a guide documents** — the guide's snippets, option names and paths still
  match.
- **Non-obvious finding along the way** — run `journey-doc`.
- **Visible change** — `verify` was run and the result looked at.
- **Security-sensitive change** — the diff touches authentication, sessions, input handling,
  file or network access, secrets, dependencies, CI workflows or containers: `security-audit`
  was run in `change` mode and its report is in the pull request.
- **Lint config** — it turns on `eslint-plugin-jsdoc` for exported functions, as the shared
  agreements require. If it does not, adding it is part of this change or its own follow-up
  issue, never left unsaid.
- **Local skills** — any repository skill whose description covers what you touched (a
  performance check, a docs sync) was run.

## Definition of done

Every check was run and its output seen, and every applicable checklist line is done or
explicitly not applicable. State what was verified and how; if something was skipped, say
which and why.
