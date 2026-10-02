#!/bin/sh
# Stops the app start-app.sh started, its whole process group, and waits for its port to free up
# so the next app can listen there.
# Usage: PORT=... stop-app.sh <pid file>
set -u
pid_file=$1

kill -- "-$(cat "$pid_file")" 2>/dev/null || true

attempt=0
while [ "$attempt" -lt 30 ]; do
  if ! curl --silent --output /dev/null "http://localhost:$PORT"; then exit 0; fi
  attempt=$((attempt + 1))
  sleep 1
done
echo "The app still answers on port $PORT" >&2
exit 1
