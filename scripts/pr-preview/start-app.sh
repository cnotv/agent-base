#!/bin/sh
# Starts the app under test in its own process group, so stop-app.sh can stop every process the
# start command spawned, and waits up to three minutes for it to answer on its port.
# Usage: START_COMMAND=... PORT=... start-app.sh <log file> <pid file>
set -u
log_file=$1
pid_file=$2

setsid nohup sh -c "$START_COMMAND" > "$log_file" 2>&1 &
echo $! > "$pid_file"

attempt=0
while [ "$attempt" -lt 90 ]; do
  if curl --silent --output /dev/null "http://localhost:$PORT"; then exit 0; fi
  attempt=$((attempt + 1))
  sleep 2
done
cat "$log_file"
exit 1
