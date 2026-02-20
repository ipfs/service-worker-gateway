#!/usr/bin/env bash

# Fetches Cloudflare Pages deployment build logs via the CF API
# and writes them to $GITHUB_STEP_SUMMARY so they are visible
# to anyone with access to the GitHub Actions run.
#
# Required environment variables:
#   CF_ACCOUNT_ID         - Cloudflare account ID
#   CF_PAGES_PROJECT      - Cloudflare Pages project name
#   CF_PAGES_READ_TOKEN   - API token with Cloudflare Pages:Read permission
#   DEPLOY_COMMIT         - full or short commit SHA to match

set -euo pipefail

for var in CF_ACCOUNT_ID CF_PAGES_PROJECT CF_PAGES_READ_TOKEN DEPLOY_COMMIT; do
  if [ -z "${!var:-}" ]; then
    echo "ERROR: $var is not set"
    exit 1
  fi
done

API_BASE="https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/pages/projects/${CF_PAGES_PROJECT}"

cf_api() {
  curl -sf -H "Authorization: Bearer ${CF_PAGES_READ_TOKEN}" "$@"
}

# Resolve tag to short SHA if needed (same logic as wait-for-deploy.sh)
if [[ "$DEPLOY_COMMIT" =~ ^v[0-9]+ ]]; then
  SHORT_SHA="$(git rev-parse --short "refs/tags/$DEPLOY_COMMIT")" || {
    echo "ERROR: tag $DEPLOY_COMMIT not found"
    exit 1
  }
else
  SHORT_SHA="${DEPLOY_COMMIT:0:7}"
fi
echo "Looking for deployment matching commit ${SHORT_SHA}..."

# List recent deployments and find the one matching our commit
DEPLOYMENTS=$(cf_api "${API_BASE}/deployments?sort_by=created_on&sort_order=desc&per_page=10")

DEPLOYMENT_ID=$(echo "$DEPLOYMENTS" | jq -r \
  --arg sha "$SHORT_SHA" \
  '[.result[] | select(.deployment_trigger.metadata.commit_hash | startswith($sha))] | first | .id // empty')

if [ -z "$DEPLOYMENT_ID" ]; then
  echo "WARNING: could not find a deployment for commit ${SHORT_SHA}"
  echo "Recent deployments:"
  echo "$DEPLOYMENTS" | jq '.result[] | {id, created_on, commit: .deployment_trigger.metadata.commit_hash, status: .latest_stage.status}'
  exit 0
fi

echo "Found deployment: ${DEPLOYMENT_ID}"

# Fetch build logs
LOGS=$(cf_api "${API_BASE}/deployments/${DEPLOYMENT_ID}/history/logs")

# Write to GitHub step summary if available
if [ -n "${GITHUB_STEP_SUMMARY:-}" ]; then
  {
    echo "## Cloudflare Pages build logs"
    echo ""
    echo "**Project:** \`${CF_PAGES_PROJECT}\`  "
    echo "**Deployment:** \`${DEPLOYMENT_ID}\`  "
    echo "**Commit:** \`${SHORT_SHA}\`"
    echo ""
    echo "<details><summary>Build log</summary>"
    echo ""
    echo '```'
    echo "$LOGS" | jq -r '.result.data[]? | "\(.ts) \(.line)"'
    echo '```'
    echo ""
    echo "</details>"
  } >> "$GITHUB_STEP_SUMMARY"
  echo "Build logs written to job summary."
else
  # Print to stdout when running locally
  echo "$LOGS" | jq -r '.result.data[]? | "\(.ts) \(.line)"'
fi
