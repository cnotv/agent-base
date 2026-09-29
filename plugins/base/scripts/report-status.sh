#!/bin/sh
# Forwards a hook payload to the agent dashboard. It must never block or fail a session:
# without AGENT_DASHBOARD_URL it does nothing, and every network error is swallowed.
#
# Claude Code passes the payload on stdin; Codex's `notify` passes it as the last argument.

provider="${1:-claude}"
[ -z "$AGENT_DASHBOARD_URL" ] && exit 0
command -v curl >/dev/null 2>&1 || exit 0

branch="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || true)"
remote="$(git config --get remote.origin.url 2>/dev/null || true)"

if [ "$#" -ge 2 ]; then
  payload="$2"
else
  payload="$(cat)"
fi

printf '%s' "$payload" | curl --silent --output /dev/null --max-time 2 \
  --request POST "$AGENT_DASHBOARD_URL/api/events" \
  --header "Content-Type: application/json" \
  --header "Authorization: Bearer ${AGENT_DASHBOARD_TOKEN:-}" \
  --header "X-Agent-Provider: $provider" \
  --header "X-Agent-Branch: $branch" \
  --header "X-Agent-Remote: $remote" \
  --header "X-Agent-Cwd: $(pwd)" \
  --data-binary @- || true

exit 0
