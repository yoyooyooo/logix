#!/usr/bin/env bash

set -euo pipefail

JSON_MODE=false
DRY_RUN=false
ENSURE=false
FEATURE_OVERRIDE=""
STATUS=""
POSITIONAL=()

usage() {
  cat << 'EOF'
Usage:
  update-spec-status.sh [--json] [--dry-run] [--ensure] --status <Status> [--feature <NNN|NNN-name>] [NNN|NNN-name]

Options:
  --status <Status>   New status value to write into specs/<id>/spec.md (required)
  --feature <id>      Target a specific spec (e.g., 025 or 025-my-feature)
  --ensure            Only move status forward (Draft -> Planned -> Active -> Done). No regression.
                      Unknown/terminal statuses (Frozen/Superseded/Archived/...) are left untouched in ensure mode.
  --dry-run           Do not write; just report what would change
  --json              Output JSON only
  --help, -h          Show this help

Examples:
  update-spec-status.sh --status Planned --feature 025
  update-spec-status.sh --ensure --status Active 025-my-feature
  update-spec-status.sh --ensure --status Done --dry-run
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --json)
      JSON_MODE=true
      shift
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --ensure)
      ENSURE=true
      shift
      ;;
    --status)
      if [[ $# -lt 2 || "${2:-}" == --* ]]; then
        echo "ERROR: --status requires a value." >&2
        exit 1
      fi
      STATUS="$2"
      shift 2
      ;;
    --status=*)
      STATUS="${1#--status=}"
      shift
      ;;
    --feature)
      if [[ $# -lt 2 || "${2:-}" == --* ]]; then
        echo "ERROR: --feature requires a value." >&2
        exit 1
      fi
      FEATURE_OVERRIDE="$2"
      shift 2
      ;;
    --feature=*)
      FEATURE_OVERRIDE="${1#--feature=}"
      shift
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    --*)
      echo "ERROR: Unknown option '$1'. Use --help for usage information." >&2
      exit 1
      ;;
    *)
      POSITIONAL+=("$1")
      shift
      ;;
  esac
done

if [[ -z "$STATUS" ]]; then
  echo "ERROR: Missing --status <Status>." >&2
  usage >&2
  exit 1
fi

if [[ -n "$FEATURE_OVERRIDE" ]]; then
  SPECIFY_FEATURE="$FEATURE_OVERRIDE"
fi

if [[ ${#POSITIONAL[@]} -gt 0 ]]; then
  if [[ -z "${FEATURE_OVERRIDE:-}" && ${#POSITIONAL[@]} -eq 1 && "${POSITIONAL[0]}" =~ ^[0-9]{3}(-.+)?$ ]]; then
    SPECIFY_FEATURE="${POSITIONAL[0]}"
  else
    echo "ERROR: Unknown argument(s): ${POSITIONAL[*]} (use --help for usage information)" >&2
    exit 1
  fi
fi

SCRIPT_DIR="$(CDPATH="" cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common.sh"

eval $(get_feature_paths)

check_feature_branch "$CURRENT_BRANCH" || exit 1

if [[ ! -f "$FEATURE_SPEC" ]]; then
  echo "ERROR: spec.md not found: $FEATURE_SPEC" >&2
  exit 1
fi

python3 - "$FEATURE_SPEC" "$STATUS" "$ENSURE" "$DRY_RUN" "$JSON_MODE" << 'PY'
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

spec_file = Path(sys.argv[1])
target_status = sys.argv[2]
ensure = sys.argv[3].lower() == "true"
dry_run = sys.argv[4].lower() == "true"
json_mode = sys.argv[5].lower() == "true"

text = spec_file.read_text(encoding="utf-8", errors="replace")
lines = text.splitlines(keepends=True)

status_line_re = re.compile(r"^(?P<prefix>\*\*Status\*\*:\s*)(?P<value>.*?)(?P<trailing>\s*)$")

def status_key(s: str) -> str:
    # Normalize leading token to support forms like "Active（...）" / "Archived (...)"
    s = s.strip()
    m = re.match(r"^(?P<word>[A-Za-z]+)", s)
    return m.group("word") if m else s

rank = {"Draft": 0, "Planned": 1, "Active": 2, "Done": 3, "Complete": 3}

found = False
old_status_raw = ""
old_status_key = ""
new_status_effective = target_status
updated = False
reason = ""

for idx, line in enumerate(lines):
    raw = line.rstrip("\n")
    m = status_line_re.match(raw)
    if not m:
        continue

    found = True
    old_status_raw = m.group("value")
    old_status_key = status_key(old_status_raw)
    target_key = status_key(target_status)

    if ensure:
        if old_status_key in rank and target_key in rank:
            if rank[old_status_key] >= rank[target_key]:
                reason = "ensure: no-op (no regression)"
                break
        else:
            reason = "ensure: skipped (unknown/terminal status)"
            break

    trailing = m.group("trailing")
    newline = "\n" if line.endswith("\n") else ""
    lines[idx] = f"{m.group('prefix')}{target_status}{trailing}{newline}"
    updated = raw != lines[idx].rstrip("\n")
    break

if not found:
    # Insert Status after Created / Feature Branch if missing.
    created_re = re.compile(r"^\*\*Created\*\*:\s*")
    feature_branch_re = re.compile(r"^\*\*Feature Branch\*\*:\s*")
    insert_after = None
    for i, line in enumerate(lines):
        if created_re.match(line.rstrip("\n")):
            insert_after = i
            break
    if insert_after is None:
        for i, line in enumerate(lines):
            if feature_branch_re.match(line.rstrip("\n")):
                insert_after = i
                break
    if insert_after is None:
        insert_after = 0
    lines.insert(insert_after + 1, f"**Status**: {target_status}  \n")
    updated = True
    reason = "inserted: missing status line"

new_text = "".join(lines)
if updated and not dry_run:
    spec_file.write_text(new_text, encoding="utf-8")

payload = {
    "specFile": str(spec_file),
    "found": found,
    "updated": updated,
    "dryRun": dry_run,
    "ensure": ensure,
    "oldStatus": (old_status_raw.strip() if old_status_raw else None),
    "newStatus": target_status,
    "reason": reason or ("updated" if updated else "no-op"),
}

if json_mode:
    sys.stdout.write(json.dumps(payload, ensure_ascii=False) + "\n")
else:
    sys.stdout.write(f"spec: {payload['specFile']}\n")
    sys.stdout.write(f"status: {payload['oldStatus']} -> {payload['newStatus']} ({payload['reason']})\n")
PY
