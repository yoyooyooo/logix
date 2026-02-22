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

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
watch_script="${script_dir}/pr-ci-watch-merge.sh"
log_dir="${PR_CI_WATCH_LOG_DIR:-.context/pr-ci-watch}"
timestamp="$(date +%Y%m%d-%H%M%S)"
log_file="${log_dir}/pr-${pr_number}-${timestamp}.log"

mkdir -p "$log_dir"
nohup "$watch_script" "$pr_number" "$merge_method" >"$log_file" 2>&1 &
pid=$!

echo "[pr-ci-watch-bg] started pid=${pid} log=${log_file}"
echo "[pr-ci-watch-bg] tail log: tail -f ${log_file}"
