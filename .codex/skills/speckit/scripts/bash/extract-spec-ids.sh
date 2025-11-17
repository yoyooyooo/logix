#!/usr/bin/env bash

# Extract spec numbering inventories (US / FR/NFR/SC / Tasks) for one or more specs.
#
# This is a convenience aggregator that delegates to:
# - extract-user-stories.sh
# - extract-coded-points.sh
# - extract-tasks.sh
#
# Usage:
#   ./extract-spec-ids.sh [--json] [--kind <kind>]... [--feature <id>]... [<id>...]
#
# Kinds:
#   us        User Stories (from spec.md headings)
#   codes     FR/NFR/SC coded points (from spec.md)
#   tasks     Tasks (from tasks.md)
#
# Notes:
# - If no --kind is provided, defaults to: us,codes,tasks
# - Read-only. Exit code is non-zero if any selected sub-command returns non-zero.

set -euo pipefail

JSON_MODE=false
SHOW_HELP=false
KINDS_RAW=()
FORWARD_ARGS=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    --json)
      JSON_MODE=true
      shift
      ;;
    --kind)
      if [[ $# -lt 2 || "${2:-}" == --* ]]; then
        echo "ERROR: --kind requires a value (us|codes|tasks|all)." >&2
        exit 1
      fi
      KINDS_RAW+=("$2")
      shift 2
      ;;
    --kind=*)
      KINDS_RAW+=("${1#--kind=}")
      shift
      ;;
    --kinds)
      if [[ $# -lt 2 || "${2:-}" == --* ]]; then
        echo "ERROR: --kinds requires a value (comma-separated list)." >&2
        exit 1
      fi
      KINDS_RAW+=("$2")
      shift 2
      ;;
    --kinds=*)
      KINDS_RAW+=("${1#--kinds=}")
      shift
      ;;
    --help|-h)
      SHOW_HELP=true
      shift
      ;;
    *)
      FORWARD_ARGS+=("$1")
      shift
      ;;
  esac
done

if $SHOW_HELP; then
  cat << 'EOF'
Usage: extract-spec-ids.sh [--json] [--kind <kind>]... [--feature <id>]... [<id>...]

Extract spec numbering inventories (US / FR/NFR/SC / Tasks) for one or more specs.

Kinds:
  us        User Stories (from spec.md headings)
  codes     FR/NFR/SC coded points (from spec.md)
  tasks     Tasks (from tasks.md)
  all       Same as: us,codes,tasks

Options:
  --json              Output JSON (default: text)
  --kind <kind>       Select a kind (repeatable)
  --kinds <list>      Select kinds (comma-separated)
  --feature <id>      Target a specific spec (repeatable)
  --help, -h          Show this help message

Examples:
  ./extract-spec-ids.sh --feature 061
  ./extract-spec-ids.sh --kind us --kind codes 061
  ./extract-spec-ids.sh --kinds us,tasks --feature 060 --feature 061
  ./extract-spec-ids.sh --json --kinds us,codes --feature 061
EOF
  exit 0
fi

normalize_kind() {
  local k="$1"
  k="$(printf '%s' "$k" | tr '[:upper:]' '[:lower:]' | tr -d '[:space:]')"
  printf '%s' "$k"
}

declare -A kind_set=()
KINDS=()

if [[ ${#KINDS_RAW[@]} -eq 0 ]]; then
  KINDS_RAW=("all")
fi

for raw in "${KINDS_RAW[@]}"; do
  raw="$(normalize_kind "$raw")"
  IFS=',' read -r -a parts <<< "$raw"
  for part in "${parts[@]}"; do
    k="$(normalize_kind "$part")"
    [[ -z "$k" ]] && continue

    if [[ "$k" == "all" ]]; then
      for kk in us codes tasks; do
        if [[ -z "${kind_set[$kk]:-}" ]]; then
          kind_set[$kk]=1
          KINDS+=("$kk")
        fi
      done
      continue
    fi

    case "$k" in
      us|codes|tasks)
        if [[ -z "${kind_set[$k]:-}" ]]; then
          kind_set[$k]=1
          KINDS+=("$k")
        fi
        ;;
      *)
        echo "ERROR: Unknown kind '$k'. Allowed: us,codes,tasks,all." >&2
        exit 1
        ;;
    esac
  done
done

SCRIPT_DIR="$(CDPATH="" cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
US_SCRIPT="$SCRIPT_DIR/extract-user-stories.sh"
CODES_SCRIPT="$SCRIPT_DIR/extract-coded-points.sh"
TASKS_SCRIPT="$SCRIPT_DIR/extract-tasks.sh"

overall_status=0

if ! $JSON_MODE; then
  if [[ ${#KINDS[@]} -gt 1 ]]; then
    for k in "${KINDS[@]}"; do
      echo "== $k =="
      set +e
      case "$k" in
        us) "$US_SCRIPT" "${FORWARD_ARGS[@]}" ;;
        codes) "$CODES_SCRIPT" "${FORWARD_ARGS[@]}" ;;
        tasks) "$TASKS_SCRIPT" "${FORWARD_ARGS[@]}" ;;
      esac
      st=$?
      set -e
      if [[ $st -ne 0 ]]; then overall_status=1; fi
      echo
    done
  else
    set +e
    case "${KINDS[0]}" in
      us) "$US_SCRIPT" "${FORWARD_ARGS[@]}" ;;
      codes) "$CODES_SCRIPT" "${FORWARD_ARGS[@]}" ;;
      tasks) "$TASKS_SCRIPT" "${FORWARD_ARGS[@]}" ;;
    esac
    st=$?
    set -e
    if [[ $st -ne 0 ]]; then overall_status=1; fi
  fi

  exit $overall_status
fi

TMP_FILES=()
trap 'rm -f "${TMP_FILES[@]}"' EXIT

python_args=("$JSON_MODE")

for k in "${KINDS[@]}"; do
  tmp="$(mktemp -t speckit-extract-spec-ids.${k}.XXXXXX)"
  TMP_FILES+=("$tmp")

  set +e
  case "$k" in
    us) "$US_SCRIPT" --json "${FORWARD_ARGS[@]}" > "$tmp" ;;
    codes) "$CODES_SCRIPT" --json "${FORWARD_ARGS[@]}" > "$tmp" ;;
    tasks) "$TASKS_SCRIPT" --json "${FORWARD_ARGS[@]}" > "$tmp" ;;
  esac
  st=$?
  set -e

  if [[ $st -ne 0 ]]; then overall_status=1; fi
  python_args+=("$k" "$tmp" "$st")
done

python3 - "${python_args[@]}" << 'PY'
from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any


JSON_MODE = sys.argv[1].lower() == "true"
triples = sys.argv[2:]

if len(triples) % 3 != 0:
    raise SystemExit("ERROR: invalid aggregator arguments")

results: dict[str, Any] = {}
kinds: list[str] = []

for i in range(0, len(triples), 3):
    kind = triples[i]
    path = Path(triples[i + 1])
    exit_code = int(triples[i + 2])

    raw = path.read_text(encoding="utf-8", errors="replace")
    try:
        payload = json.loads(raw) if raw.strip() else None
    except json.JSONDecodeError as e:
        payload = {"error": {"message": "invalid json from subcommand", "detail": str(e)}, "raw": raw}

    kinds.append(kind)
    results[kind] = {"exitCode": exit_code, "payload": payload}

print(json.dumps({"kinds": kinds, "results": results}, ensure_ascii=False, indent=2))
PY

exit $overall_status

