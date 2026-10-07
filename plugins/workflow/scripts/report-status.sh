#!/bin/sh
# Forwards a hook payload to Dashi, the agent dashboard. It must never block or fail a session:
# without DASHI_URL it does nothing, and every network error is swallowed. A machine set up
# before the rename to Dashi has AGENT_DASHBOARD_URL and AGENT_DASHBOARD_TOKEN, still read when
# the new names are unset.
#
# Claude Code passes the payload on stdin; Codex's `notify` passes it as the last argument.

provider="${1:-claude}"
dashboard_url="${DASHI_URL:-${AGENT_DASHBOARD_URL:-}}"
dashboard_token="${DASHI_TOKEN:-${AGENT_DASHBOARD_TOKEN:-}}"
[ -z "$dashboard_url" ] && exit 0
command -v curl >/dev/null 2>&1 || exit 0

branch="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || true)"
remote="$(git config --get remote.origin.url 2>/dev/null || true)"

# A header value read from the environment, kept to one short line so it can never start a header
# of its own.
one_line() {
  printf '%s' "$1" | tr -d '\r\n' | cut -c1-120
}

# The app that started the agent. macOS hands a GUI app's bundle id down to the processes it
# starts; elsewhere it is the nearest ancestor that is not a shell, the runtime or the agent.
launching_app() {
  if [ -n "${__CFBundleIdentifier:-}" ]; then
    printf '%s' "$__CFBundleIdentifier"
    return
  fi
  command -v ps >/dev/null 2>&1 || return 0
  ancestor="$PPID"
  for _ in 1 2 3 4 5 6; do
    ancestor="$(ps -o ppid= -p "$ancestor" 2>/dev/null | tr -d ' ')"
    case "$ancestor" in '' | 0 | 1) return 0 ;; esac
    name="$(basename "$(ps -o comm= -p "$ancestor" 2>/dev/null)" 2>/dev/null)"
    case "$name" in
      '' | -* | sh | bash | zsh | fish | dash | ksh | login | sudo | env | node | npm | npx | pnpm | tmux* | screen | claude | codex) ;;
      *)
        printf '%s' "$name"
        return 0
        ;;
    esac
  done
}

# What pays for the session, as a kind only: a key's value is never read into a header.
billing() {
  if [ "$provider" = "codex" ]; then
    if [ -n "${OPENAI_API_KEY:-}" ]; then echo "api-key"; else echo "chatgpt-login"; fi
  elif [ "${CLAUDE_CODE_USE_BEDROCK:-}" = "1" ]; then
    echo "bedrock"
  elif [ "${CLAUDE_CODE_USE_VERTEX:-}" = "1" ]; then
    echo "vertex"
  elif [ "${CLAUDE_CODE_USE_FOUNDRY:-}" = "1" ]; then
    echo "foundry"
  elif [ -n "${ANTHROPIC_API_KEY:-}${ANTHROPIC_AUTH_TOKEN:-}" ]; then
    echo "api-key"
  else
    echo "claude-login"
  fi
}

api_host="$(printf '%s' "${ANTHROPIC_BASE_URL:-}" | sed -e 's#^[A-Za-z]*://##' -e 's#[/:?].*##')"

if [ "$#" -ge 2 ]; then
  payload="$2"
else
  payload="$(cat)"
fi

printf '%s' "$payload" | curl --silent --output /dev/null --max-time 2 \
  --request POST "$dashboard_url/api/events" \
  --header "Content-Type: application/json" \
  --header "Authorization: Bearer $dashboard_token" \
  --header "X-Agent-Provider: $provider" \
  --header "X-Agent-Branch: $branch" \
  --header "X-Agent-Remote: $remote" \
  --header "X-Agent-Cwd: $(pwd)" \
  --header "X-Agent-Launcher: $(one_line "${CLAUDE_CODE_ENTRYPOINT:-}")" \
  --header "X-Agent-Terminal: $(one_line "${TERM_PROGRAM:-}")" \
  --header "X-Agent-App: $(one_line "$(launching_app)")" \
  --header "X-Agent-Billing: $(billing)" \
  --header "X-Agent-Api-Host: $(one_line "$api_host")" \
  --header "X-Dashi-Start-Id: $(one_line "${DASHI_START_ID:-}")" \
  --data-binary @- || true

exit 0
