#!/usr/bin/env bash

set -euo pipefail

if [ "$#" -lt 2 ]; then
  echo "Usage: $0 <endpoint> <git-short-hash>"
  exit 1
fi

ENDPOINT="$1"
TARGET_HASH="$2"
# If no third argument is provided, no delay is applied
if [ "$#" -ge 3 ]; then
  MAX_DELAY="$3"
fi

# Initial delay in seconds (60, then doubles each time)
DELAY=60

echo "Watching $ENDPOINT for Build: staging@$TARGET_HASH ..."
while true
do
  PAGE_CONTENT="$(curl -s "$ENDPOINT")"

  # If the page contains the line with the hash:
  if echo "$PAGE_CONTENT" | grep -q "Build: staging@${TARGET_HASH}"; then
    echo "Found Build: staging@${TARGET_HASH}!"
    exit 0
  fi

  echo "Not found yet. Sleeping for ${DELAY} seconds..."
  sleep "$DELAY"

  # Exponential backoff
  DELAY=$((DELAY * 2))

  # cap the delay if a maximum delay is provided
  if [ -n "$MAX_DELAY" ] && [ $DELAY -gt $MAX_DELAY ]; then
    DELAY=$MAX_DELAY
  fi
done
