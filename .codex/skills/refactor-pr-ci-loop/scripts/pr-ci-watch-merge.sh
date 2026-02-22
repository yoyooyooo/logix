#!/usr/bin/env bash
set -euo pipefail

usage() {
  echo "Usage: $0 <pr-number> [merge|squash|rebase]" >&2
}

if [[ $# -lt 1 || $# -gt 2 ]]; then
  usage
  exit 1
fi

pr_number="$1"
merge_method="${2:-merge}"

case "$merge_method" in
  merge | squash | rebase) ;;
  *)
    usage
    exit 1
    ;;
esac

poll_interval="${PR_CI_POLL_INTERVAL:-30}"

echo "[pr-ci-watch] waiting required checks for PR #${pr_number} (interval=${poll_interval}s)"
gh pr checks "$pr_number" --required --watch --interval "$poll_interval"

echo "[pr-ci-watch] required checks passed, merging PR #${pr_number} with --${merge_method}"
gh pr merge "$pr_number" --"$merge_method" --delete-branch

echo "[pr-ci-watch] merged PR #${pr_number}"
