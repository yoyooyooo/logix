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

echo "[pr-ci-watch] waiting checks for PR #${pr_number} (interval=${poll_interval}s)"
if gh pr checks "$pr_number" --required --watch --interval "$poll_interval"; then
  echo "[pr-ci-watch] required checks passed"
else
  exit_code=$?
  required_info="$(gh pr checks "$pr_number" --required 2>&1 || true)"
  if echo "$required_info" | grep -q "no required checks reported"; then
    echo "[pr-ci-watch] no required checks configured, fallback to all checks"
    gh pr checks "$pr_number" --watch --interval "$poll_interval"
  else
    echo "$required_info" >&2
    exit "$exit_code"
  fi
fi

echo "[pr-ci-watch] checks passed, merging PR #${pr_number} with --${merge_method}"
gh pr merge "$pr_number" --"$merge_method" --delete-branch

echo "[pr-ci-watch] merged PR #${pr_number}"
