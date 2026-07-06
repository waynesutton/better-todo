#!/usr/bin/env bash
set -euo pipefail

echo "== Convex self hosting upstream check =="
echo "timestamp_utc=$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

SELF_HOSTING_REPO="https://github.com/get-convex/self-hosting"
INTEGRATION_URL="https://raw.githubusercontent.com/get-convex/self-hosting/main/INTEGRATION.md"
MANUAL_SETUP_URL="https://github.com/get-convex/self-hosting?tab=readme-ov-file#manual-setup-1"
CONVEX_LLMS_URL="https://docs.convex.dev/llms.txt"
PLUGIN_REPO_URL="https://github.com/get-convex/convex-agent-plugins"

echo
echo "sources:"
echo "  repo=${SELF_HOSTING_REPO}"
echo "  integration=${INTEGRATION_URL}"
echo "  manual_setup=${MANUAL_SETUP_URL}"
echo "  convex_llms=${CONVEX_LLMS_URL}"
echo "  plugins=${PLUGIN_REPO_URL}"

echo
echo "head_commit_self_hosting=$(git ls-remote https://github.com/get-convex/self-hosting.git HEAD | awk '{print $1}')"

echo
echo "checking npm publish status..."
if npm view @convex-dev/self-hosting version >/tmp/self_hosting_version.txt 2>/tmp/self_hosting_err.txt; then
  echo "npm_self_hosting_version=$(cat /tmp/self_hosting_version.txt)"
else
  echo "npm_self_hosting_version=UNPUBLISHED"
fi

fetch_sha256() {
  local url="$1"
  local label="$2"
  local tmp_file
  tmp_file="$(mktemp)"
  if curl -fsSL "$url" -o "$tmp_file"; then
    local digest
    digest="$(shasum -a 256 "$tmp_file" | awk '{print $1}')"
    echo "${label}_sha256=${digest}"
  else
    echo "${label}_sha256=UNAVAILABLE"
  fi
  rm -f "$tmp_file"
}

echo
echo "quick content fingerprints..."
fetch_sha256 "$INTEGRATION_URL" "integration"
fetch_sha256 "$CONVEX_LLMS_URL" "convex_llms"

echo
echo "done"
