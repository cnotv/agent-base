---
name: deploy-cloud
description: >-
  Use when a repository must be deployed to the owner's Hetzner server behind its existing
  reverse proxy, or its deployment changed: "deploy this to the server", "add a cloud
  deployment", "ship it to Hetzner", "add a deploy workflow", "back up the SQLite database".
  Adds the cloud compose file, the deploy workflow that runs CI first, the health check and
  smoke test, and the nightly SQLite backup, then lists what the owner must do by hand.
---

# Deploying to the Hetzner server

Generalised from Dashi (`.github/workflows/deploy.yml` and `docker-compose.cloud.yml`) and
generative-art. Every repository deploys the same way: GitHub Actions copies the sources to
the server over SSH, the server builds the image itself (no registry holds a copy), and the
reverse proxy already running there serves the domain over HTTPS.

Read **Deploy** under the repository's Project facts first. It gives the app name, the port
the app listens on in the container, the health route, the data directory and the SQLite file.
If a value is missing from Project facts and from the ticket, write a clearly marked
placeholder (`TODO_SET_ME`) and list it in the pull request. Never invent a host name, a
port the owner did not give, a domain, a secret or a key.

## What is already on the server

Do not install or change any of it:

- Docker with the compose plugin.
- A reverse proxy with a certificate per domain. It forwards a domain to a port on the host
  and passes the `Host` header through unchanged. Ports 80 and 443 belong to it; a deployment
  never publishes either.
- An SSH user who can run `docker`.

## 1. The Dockerfile

Use the repository's own. It must build with nothing but the paths the workflow copies (step
3), run as a non-root user, and keep data outside the image: `mkdir -p <data directory> &&
chown <uid>:<gid> <data directory>` so a new named volume inherits that owner. If the image
has no `curl`, the health check below uses `node` instead.

## 2. `docker-compose.cloud.yml`

```yaml
# The cloud deployment. HTTPS for <APP>_DOMAIN comes from the reverse proxy already running on
# the server, which forwards the domain to the port published here. Every setting comes from
# .env, which the deploy workflow writes.
# The project name fixes the data volume's name: Compose derives the volume from it, so a
# renamed folder or project would start an empty database.
name: <app>
services:
  app:
    build: .
    image: <app>:cloud
    env_file: .env
    environment:
      NODE_ENV: production
    # A private address only: the proxy reaches it, the internet does not.
    ports:
      - "${<APP>_PUBLISH_ADDRESS:-127.0.0.1}:${<APP>_PUBLISH_PORT:?set <APP>_PUBLISH_PORT in .env}:<container port>"
    volumes:
      - app-data:/<data directory>
    healthcheck:
      test: ["CMD", "node", "-e", "fetch('http://127.0.0.1:<container port>/<health route>').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"]
      interval: 10s
      timeout: 5s
      start_period: 20s
      retries: 3
    restart: unless-stopped

volumes:
  app-data:
```

Rules this file keeps:

- **One published port, on a private address.** `127.0.0.1` when the proxy runs on the host
  itself. A proxy running in Docker cannot see the host's `127.0.0.1`, so then the owner sets
  `<APP>_PUBLISH_ADDRESS` to the Docker bridge address (usually `172.17.0.1`, from
  `ip -4 addr show docker0`) and the proxy forwards to it. Either way the port is not reachable
  from the internet.
- **A port nothing else uses.** Each app on the server needs its own. The port is a repository
  variable, not a guess: ask for it, or leave the placeholder (`ss -tlnp` on the server shows
  what is taken).
- **Data in a named volume**, never in the copied directory. `rm: true` in step 3 wipes that
  directory on every deploy.
- **Healthcheck**, so `--wait` can tell a started container from a working one. Use the app's
  health route; if the app has none, adding a route that answers 200 is part of this change.
- No `ports` entry for a database and no `network_mode: host`.

## 3. `.github/workflows/deploy.yml`

```yaml
name: Deploy

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read

# A second push waits for the running deploy instead of cancelling it half way through.
concurrency:
  group: deploy
  cancel-in-progress: false

jobs:
  checks:
    uses: ./.github/workflows/ci.yml

  deploy:
    needs: checks
    # Nothing to deploy to until the domain is set; see the owner's steps in the README.
    if: vars.<APP>_DOMAIN != ''
    runs-on: ubuntu-latest
    env:
      DEPLOY_DIRECTORY: ${{ vars.DEPLOY_DIRECTORY || '<app>' }}
    steps:
      - uses: actions/checkout@<sha> # <tag>
        with:
          persist-credentials: false

      # Written on the runner and copied with the sources, readable by the SSH user only.
      # Every value comes from the repository settings.
      - name: Write the server settings
        env:
          <APP>_DOMAIN: ${{ vars.<APP>_DOMAIN }}
          <APP>_PUBLISH_ADDRESS: ${{ vars.<APP>_PUBLISH_ADDRESS || '127.0.0.1' }}
          <APP>_PUBLISH_PORT: ${{ vars.<APP>_PUBLISH_PORT }}
          <APP>_SECRET: ${{ secrets.<APP>_SECRET }}
        run: |
          umask 077
          cat > .env <<EOF
          <APP>_DOMAIN=$<APP>_DOMAIN
          <APP>_PUBLISH_ADDRESS=$<APP>_PUBLISH_ADDRESS
          <APP>_PUBLISH_PORT=$<APP>_PUBLISH_PORT
          <APP>_SECRET=$<APP>_SECRET
          EOF

      # Both SSH actions hold the server key, so they are pinned to the exact commit of a
      # release rather than a tag that could be moved. rm clears the directory first: copying
      # on top of the previous copy leaves files deleted from the repository behind, and a
      # stale source file breaks the image build.
      - name: Copy the sources and settings to the server
        uses: appleboy/scp-action@ff85246acaad7bdce478db94a363cd2bf7c90345 # v1.0.0
        with:
          rm: true
          host: ${{ secrets.HETZNER_HOST }}
          username: ${{ secrets.HETZNER_USERNAME }}
          key: ${{ secrets.HETZNER_SSH_KEY }}
          port: ${{ secrets.HETZNER_PORT || '22' }}
          source: .env,Dockerfile,.dockerignore,docker-compose.cloud.yml,<the paths the build reads>
          target: ${{ env.DEPLOY_DIRECTORY }}

      # The server builds the image itself. --wait fails the deploy if the new version never
      # becomes healthy.
      - name: Start the new version
        uses: appleboy/ssh-action@0ff4204d59e8e51228ff73bce53f80d53301dee2 # v1.2.5
        with:
          host: ${{ secrets.HETZNER_HOST }}
          username: ${{ secrets.HETZNER_USERNAME }}
          key: ${{ secrets.HETZNER_SSH_KEY }}
          port: ${{ secrets.HETZNER_PORT || '22' }}
          envs: DEPLOY_DIRECTORY
          script: |
            set -eu
            cd "$DEPLOY_DIRECTORY"
            chmod 600 .env
            docker compose --file docker-compose.cloud.yml up --detach --build --remove-orphans --wait --wait-timeout 120
            docker image prune --force

      - name: Check the app answers at its domain, through the proxy
        env:
          <APP>_DOMAIN: ${{ vars.<APP>_DOMAIN }}
        run: curl --fail --silent --show-error --retry 10 --retry-delay 3 --retry-all-errors "https://$<APP>_DOMAIN/<health route>"
```

Rules this file keeps:

- **CI first.** `checks` calls the repository's CI workflow, so `ci.yml` needs `on:
  workflow_call:` next to its own triggers. `needs: checks` means a red CI never deploys.
- **The domain variable gates the job.** Until the owner sets `<APP>_DOMAIN` the job is
  skipped, so merging this change deploys nothing and cannot fail on a server that is not
  ready.
- **`set -eu` in the SSH script**, so a failed `up` is not masked by the prune after it and
  the job never reports success on a failed start.
- **Pinned actions.** Both `appleboy` actions are pinned to the commit SHA of a release, with
  the tag in a comment. The SHAs above are the ones Dashi pins (v1.0.0 and v1.2.5); to use a
  newer release look up its commit with `gh api repos/appleboy/<action>/git/ref/tags/<tag>`
  (follow the object if it is a tag object), never copy one from memory. Pin `actions/checkout`
  the same way. `@master`, as generative-art's older deploy has it, is not acceptable.
- **`.env` is written with `umask 077`** and `chmod 600` again on the server. Secrets go
  through `env:` and never appear in a `run:` line, a log or a command argument.
- **`source` lists only what the build reads**: the Dockerfile, `.dockerignore`, the compose
  file, lockfile and manifests, the source folders. Never `.git`, `node_modules` or tests.
  Check it by copying exactly those paths into an empty directory and running `docker build`
  there; a missing path fails here instead of on the server.
- **`DEPLOY_DIRECTORY` is per repository.** Two apps sharing one directory would wipe each
  other on every `rm: true`.
- **Smoke test through the domain**, not the container: it proves DNS, the proxy and the
  certificate too. The retries cover the seconds the proxy needs to see the new container.

Add `.env` to `.gitignore` if it is not already there.

## 4. SQLite backup

Only when the app keeps its data in SQLite (Project facts says which file). Add this service
and a second volume to `docker-compose.cloud.yml`. A nightly `sqlite3 .backup` takes a
consistent copy while the app keeps writing; copying the `.db` file with `cp` does not.

```yaml
  backup:
    image: alpine:3.20
    depends_on:
      app:
        condition: service_healthy
    volumes:
      # Read and write: SQLite in WAL mode needs to open the -shm file even to read.
      - app-data:/<data directory>
      - app-backups:/backups
    restart: unless-stopped
    entrypoint: ["/bin/sh", "-c"]
    command:
      - |
        set -eu
        apk add --no-cache sqlite
        while true; do
          now=$$(( $$(date +%s) % 86400 ))
          pause=$$(( (10800 - now + 86400) % 86400 ))
          [ "$$pause" -eq 0 ] && pause=86400
          sleep "$$pause"
          file="/backups/<db file>.$$(date +%F)"
          sqlite3 "/<data directory>/<db file>" ".backup '$$file'"
          [ "$$(sqlite3 "$$file" 'PRAGMA integrity_check;')" = "ok" ] || { echo "backup failed its integrity check: $$file" >&2; rm -f "$$file"; exit 1; }
          find /backups -name '<db file>.*' -mtime +14 -delete
        done

volumes:
  app-data:
  app-backups:
```

It runs at 03:00 UTC, keeps 14 days, and exits (so `restart: unless-stopped` restarts it and
`docker compose ps` shows it) when a backup fails its integrity check. Keep the retention and
the hour as they are unless the ticket says otherwise.

A backup in a second volume on the same server protects against a corrupted or deleted
database, not against losing the server. Say so in the pull request and list an off-server
copy under the owner's steps; do not build one unasked.

Restore, for the README:

```sh
cd "$DEPLOY_DIRECTORY"
docker compose --file docker-compose.cloud.yml stop app
docker compose --file docker-compose.cloud.yml run --rm --no-deps --entrypoint sh backup -c '
  cp /backups/<db file>.<date> /<data directory>/<db file> &&
  rm -f /<data directory>/<db file>-wal /<data directory>/<db file>-shm &&
  chown "$(stat -c %u:%g /<data directory>)" /<data directory>/<db file>'
docker compose --file docker-compose.cloud.yml start app
```

Check it once against a real backup before calling the section done (see the checks below);
a backup nobody has restored is a guess.

## 5. What the owner does by hand

You cannot do these and must not try: they touch the server, DNS and repository settings. Put
them in the README's "Deploy to the cloud" section and in the pull request, in this order, with
every value either given by the owner or left as a placeholder.

1. **Pick a free port** on the server (`ss -tlnp`) and say which, or ask for it.
2. **DNS**: an `A` record for the domain pointing at the server.
3. **The proxy entry**: the domain forwards to `<publish address>:<port>`, with a certificate
   and the `Host` header passed through. If the proxy runs in Docker, set
   `<APP>_PUBLISH_ADDRESS` to the bridge address (see the compose rules above).
4. **Repository secrets** (Settings, Secrets and variables, Actions): `HETZNER_HOST` (the
   server's address), `HETZNER_USERNAME` (the SSH user, who can run `docker`),
   `HETZNER_SSH_KEY` (a private key that user accepts), `HETZNER_PORT` (optional, defaults to
   22), plus every app secret the workflow writes into `.env`.
5. **Repository variables**: `<APP>_PUBLISH_PORT`, optionally `<APP>_PUBLISH_ADDRESS` and
   `DEPLOY_DIRECTORY`, and last of all `<APP>_DOMAIN`, because setting it is what switches the
   job on. Set before the DNS and the proxy exist, the first deploy fails its smoke test.
6. **An off-server copy of the backups**, if the app has the backup service.

## Checks before it is done

Run what the repository's **Checks** list says, then:

- `docker compose --file docker-compose.cloud.yml config` with a throwaway `.env` holding
  dummy values: the file parses and every `${...}` resolves.
- `actionlint` on the workflow when it is installed; otherwise parse it as YAML.
- The `source` list against the Dockerfile, by building from a directory holding only those
  paths (step 3).
- With a backup service: run the backup loop body once by hand against a copy of a SQLite
  file, open the result with `sqlite3 <file> 'PRAGMA integrity_check;'`, and run the restore
  commands against it.
- `grep -rnE "uses: appleboy/.*@(master|main|v[0-9])" .github` finds nothing: both actions are SHAs.

Then report, in the pull request, which of the owner's steps are still open. Do not claim the
deployment works: nothing here has run on the server until the owner has finished them.
