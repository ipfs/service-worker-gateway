#!/usr/bin/env bash

set -euo pipefail

if [ "$#" -lt 2 ]; then
  echo "Usage: $0 <endpoint> <git-short-hash>"
  exit 1
fi

ENDPOINT="$1"
TARGET_STRING="$2"

# If no third argument is provided, no maximum delay is applied
MAX_DELAY="${3:-}"

# If it starts with `v`, treat it as a tag
if [[ "$TARGET_STRING" =~ ^v[0-9]+ ]]; then
  echo "Interpreted '$TARGET_STRING' as a Git tag. Resolving to short SHA..."
  SHORT_SHA="$(git rev-parse --short "refs/tags/$TARGET_STRING")" || {
    echo "ERROR: Tag $TARGET_STRING is not present"
    exit 1
  }
else
  echo "Interpreted '$TARGET_STRING' as a short SHA (or unknown tag). Taking first 7 characters..."
  SHORT_SHA="${TARGET_STRING:0:7}"
fi

# Initial delay in seconds (60, then doubles each time)
DELAY=60

echo "Watching $ENDPOINT for Build: .*@${SHORT_SHA} ..."
while true
do
  PAGE_CONTENT="$(curl -s "$ENDPOINT")"

  # If the page contains the line with the hash:
  if echo "$PAGE_CONTENT" | grep -q "Build: .*@${SHORT_SHA}"; then
    echo "Found Build: .*@${SHORT_SHA}!"
    exit 0
  fi

  echo "Not found yet. Sleeping for ${DELAY} seconds..."
  sleep "$DELAY"

  # Exponential backoff
  DELAY=$((DELAY * 2))

  # cap the delay if a maximum delay is provided
  if [ -n "$MAX_DELAY" ] && [ "$DELAY" -gt "$MAX_DELAY" ]; then
    DELAY="$MAX_DELAY"
  fi
done
