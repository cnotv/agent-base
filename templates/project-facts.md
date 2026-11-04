## Project facts

The base skills read this section instead of hardcoding commands. Keep every line current.

- **Install:** `pnpm install`
- **Dev server:** `pnpm dev --port <port> --strictPort`, served at `http://localhost:<port>`
- **Routes:** how a file maps to a URL, with one example
- **Verify notes:** the page that says what driving this app needs — selectors, load waits,
  harmless console noise — or "none"
- **Checks:** `pnpm lint`, `pnpm test:unit`
- **Docs home:** `documentation/docs/` — guides in `guides/`, findings in `journey/`
- **Docs build:** `pnpm docs:build`
- **Preview deploys:** where the preview URL comes from, or "none"
- **Auto-merge:** `squash` makes `open-pr` queue a squash merge once the pull request is ready (optional, omit the line to merge by hand). Needs `allow_auto_merge` on and a ruleset on the default branch requiring the CI checks
- **Security:** the audit commands this repository runs (for example `pnpm audit --prod`), and
  where its threat model lives, or "none"
- **Sound export:** the command that renders a Strudel pattern to WAV or MIDI, or "none"
- **Glossary:** the file that defines this repository's terms, `GLOSSARY.md` by default, or "none"
- **Deploy:** for `deploy-cloud`: the app name, the port it listens on in the container, the
  health route, the data directory, the SQLite file (or "none"), and the port published on the
  server; or "none" when the repository is not deployed to the Hetzner server
- **Scoped rules:** `.claude/rules/`
- **Local skills:** skills that exist only in this repository

### Done checklist

- [ ] Registration steps that are invisible when missing, one per line
