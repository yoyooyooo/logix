#!/usr/bin/env bash

# Resolve "spec group" members from specs/<group>/spec-registry.md.
#
# Usage:
#   spec-group-members.sh <group> [--from registry] [--json]
#
# Examples:
#   spec-group-members.sh 046 --json

set -euo pipefail

JSON_MODE=false
FROM=""
GROUP=""

usage() {
  cat << 'EOF'
Usage:
  spec-group-members.sh <group> [--from registry] [--json]

Args:
  <group>              Group spec id (e.g., 046 or 046-core-ng-roadmap)

Options:
  --from <source>      How to derive members (default: registry)
                       Supported: registry
  --json               Output JSON payload (default: plain lines)
  --help, -h           Show help

Output:
  Plain mode: one member prefix per line (e.g., 045)
  JSON mode: {"group":"046-core-ng-roadmap","groupDir":"...","derivedFrom":"registry","registryFile":"...","members":[...]}
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --json)
      JSON_MODE=true
      shift
      ;;
    --from)
      if [[ $# -lt 2 || "${2:-}" == --* ]]; then
        echo "ERROR: --from requires a value." >&2
        exit 1
      fi
      FROM="$2"
      shift 2
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
      if [[ -z "$GROUP" ]]; then
        GROUP="$1"
      else
        echo "ERROR: Unexpected extra argument '$1'. Use --help for usage information." >&2
        exit 1
      fi
      shift
      ;;
  esac
done

if [[ -z "$GROUP" ]]; then
  echo "ERROR: Missing <group>." >&2
  usage >&2
  exit 1
fi

SCRIPT_DIR="$(CDPATH="" cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CHECK="$SCRIPT_DIR/check-prerequisites.sh"

group_paths_json="$("$CHECK" --json --paths-only --feature "$GROUP")"
GROUP_DIR="$(python3 -c 'import json,sys; print(json.load(sys.stdin)["FEATURE_DIR"])' <<<"$group_paths_json")"
GROUP_BRANCH="$(python3 -c 'import json,sys; print(json.load(sys.stdin)["BRANCH"])' <<<"$group_paths_json")"

source="${FROM:-registry}"
case "$source" in
  registry)
    registry_json="$GROUP_DIR/spec-registry.json"
    registry_md="$GROUP_DIR/spec-registry.md"
    if [[ -f "$registry_json" ]]; then
      registry_file="$registry_json"
    elif [[ -f "$registry_md" ]]; then
      registry_file="$registry_md"
    else
      echo "ERROR: Missing spec-registry.json/spec-registry.md at $GROUP_DIR" >&2
      exit 1
    fi
    mapfile -t MEMBERS < <(python3 - "$registry_file" << 'PY'
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

registry = Path(sys.argv[1])
group_dir = registry.parent
repo_root = group_dir.parent.parent  # .../specs/<group>
specs_dir = repo_root / "specs"

ordered: list[str] = []
seen: set[str] = set()

group_prefix_match = re.match(r"^(?P<prefix>\d{3})-", group_dir.name)
group_prefix = group_prefix_match.group("prefix") if group_prefix_match else None

def push_candidate(raw: str) -> None:
    raw = raw.strip()
    if raw.startswith("specs/"):
        raw = raw[len("specs/") :]
    raw = raw.strip().strip("/")

    m = re.match(r"^(?P<prefix>\d{3})(?:-|$)", raw)
    if not m:
        return

    prefix = m.group("prefix")
    if group_prefix and prefix == group_prefix:
        return
    if prefix in seen:
        return

    matches = list(specs_dir.glob(f"{prefix}-*"))
    if not matches:
        return

    seen.add(prefix)
    ordered.append(prefix)


if registry.suffix == ".json":
    data = json.loads(registry.read_text(encoding="utf-8", errors="replace"))
    entries = data.get("entries", [])
    for entry in entries:
        if isinstance(entry, str):
            push_candidate(entry)
            continue
        if isinstance(entry, dict):
            candidate = entry.get("dir") or entry.get("id") or ""
            push_candidate(str(candidate))
            continue
else:
    text = registry.read_text(encoding="utf-8", errors="replace")
    lines = text.splitlines()
    for line in lines:
        if not line.lstrip().startswith("|"):
            continue

        parts = line.split("|")
        if len(parts) < 3:
            continue

        first_cell = parts[1].strip()
        if not first_cell.startswith("`") or "`" not in first_cell[1:]:
            continue

        inner = first_cell.strip().strip("`").strip()
        push_candidate(inner)

for prefix in ordered:
    print(prefix)
PY
    )
    ;;
  *)
    echo "ERROR: Unsupported --from value: $source (supported: registry)" >&2
    exit 1
    ;;
esac

if [[ ${#MEMBERS[@]} -eq 0 ]]; then
  echo "ERROR: No members resolved for group $GROUP_BRANCH (derivedFrom=$source)." >&2
  exit 1
fi

if $JSON_MODE; then
  python3 - "$GROUP_BRANCH" "$GROUP_DIR" "$source" "$registry_file" "${MEMBERS[@]}" << 'PY'
from __future__ import annotations

import json
import sys

group = sys.argv[1]
group_dir = sys.argv[2]
derived_from = sys.argv[3]
registry_file = sys.argv[4]
members = sys.argv[5:]

print(
    json.dumps(
        {
            "group": group,
            "groupDir": group_dir,
            "derivedFrom": derived_from,
            "registryFile": registry_file,
            "members": members,
        },
        ensure_ascii=False,
    )
)
PY
else
  for m in "${MEMBERS[@]}"; do
    echo "$m"
  done
fi
