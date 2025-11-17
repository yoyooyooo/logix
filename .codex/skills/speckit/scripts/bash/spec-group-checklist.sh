#!/usr/bin/env bash

# Create/refresh a "spec group" execution checklist under specs/<group>/checklists/.
#
# This script is intentionally light-weight:
# - It does NOT copy member tasks into the group spec.
# - It only creates an index-style checklist with links to member specs.
#
# Usage:
#   ./spec-group-checklist.sh <group> <member...> [--name <name>] [--title <title>] [--force] [--json]
#
# Examples:
#   ./spec-group-checklist.sh 046 045 039 --name m0-m1 --title "M0→M1"
#   ./spec-group-checklist.sh 046-core-ng-roadmap 045-dual-kernel-contract 039-trait-converge-int-exec-evidence

set -euo pipefail

JSON_MODE=false
FORCE=false
DRY_RUN=false
FROM=""
GROUP=""
NAME=""
TITLE=""
MEMBERS=()

usage() {
  cat << 'EOF'
Usage:
  spec-group-checklist.sh <group> [<member...>] [--from registry] [--name <name>] [--title <title>] [--force] [--dry-run] [--json]

Args:
  <group>              Group spec id (e.g., 046 or 046-core-ng-roadmap)
  <member...>          Member spec ids (optional; if omitted, try deriving from the group spec)

Options:
  --from <source>      How to derive members when <member...> is omitted (default: registry)
                       Supported: registry
  --name <name>        Checklist filename (default: group.<members>.md)
  --title <title>      Checklist title (default: Spec Group Checklist: <group> ...)
  --force              Overwrite existing checklist file
  --dry-run            Resolve paths and print output, but do not write any file
  --json               Output JSON payload (also prints nothing else)

Examples:
  spec-group-checklist.sh 046 045 039 --name m0-m1 --title "M0→M1"
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --json)
      JSON_MODE=true
      shift
      ;;
    --force)
      FORCE=true
      shift
      ;;
    --dry-run)
      DRY_RUN=true
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
    --name)
      if [[ $# -lt 2 || "${2:-}" == --* ]]; then
        echo "ERROR: --name requires a value." >&2
        exit 1
      fi
      NAME="$2"
      shift 2
      ;;
    --title)
      if [[ $# -lt 2 || "${2:-}" == --* ]]; then
        echo "ERROR: --title requires a value." >&2
        exit 1
      fi
      TITLE="$2"
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
        MEMBERS+=("$1")
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

if [[ ! -d "$GROUP_DIR" ]]; then
  echo "ERROR: Group feature directory not found: $GROUP_DIR" >&2
  exit 1
fi

DERIVED_FROM="explicit"
if [[ ${#MEMBERS[@]} -eq 0 ]]; then
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
        echo "ERROR: Missing member specs and no spec-registry.json/spec-registry.md found at $GROUP_DIR" >&2
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
      DERIVED_FROM="registry"
      ;;
    *)
      echo "ERROR: Unsupported --from value: $source (supported: registry)" >&2
      exit 1
      ;;
  esac
fi

if [[ ${#MEMBERS[@]} -eq 0 ]]; then
  echo "ERROR: No members resolved for group $GROUP_BRANCH (derivedFrom=$DERIVED_FROM)." >&2
  exit 1
fi

if [[ -z "$NAME" ]]; then
  if [[ "$DERIVED_FROM" != "explicit" ]]; then
    NAME="group.${DERIVED_FROM}.md"
  else
    prefixes=()
    for m in "${MEMBERS[@]}"; do
      if [[ "$m" =~ ^([0-9]{3}) ]]; then
        prefixes+=("${BASH_REMATCH[1]}")
      else
        prefixes+=("$m")
      fi
    done
    joined="$(IFS=-; echo "${prefixes[*]}")"
    NAME="group.${joined}.md"
  fi
fi

if [[ "$NAME" != *.md ]]; then
  NAME="${NAME}.md"
fi

CHECKLIST_DIR="$GROUP_DIR/checklists"
mkdir -p "$CHECKLIST_DIR"

OUT_FILE="$CHECKLIST_DIR/$NAME"

if [[ "$DRY_RUN" == true ]]; then
  if $JSON_MODE; then
    python3 - "$OUT_FILE" "$GROUP_BRANCH" "$GROUP_DIR" "$DERIVED_FROM" "${MEMBERS[@]}" << 'PY'
from __future__ import annotations

import json
import sys

out_file = sys.argv[1]
group_branch = sys.argv[2]
group_dir = sys.argv[3]
derived_from = sys.argv[4]
members = sys.argv[5:]

print(
    json.dumps(
        {
            "dryRun": True,
            "group": group_branch,
            "groupDir": group_dir,
            "derivedFrom": derived_from,
            "members": members,
            "checklistFile": out_file,
        },
        ensure_ascii=False,
    )
)
PY
  else
    echo "dry-run: would write $OUT_FILE"
  fi
  exit 0
fi

if [[ -f "$OUT_FILE" && "$FORCE" != true ]]; then
  echo "ERROR: Checklist already exists: $OUT_FILE (use --force to overwrite or choose another --name)" >&2
  exit 1
fi

python3 - "$CHECK" "$GROUP_BRANCH" "$GROUP_DIR" "$OUT_FILE" "$TITLE" "$DERIVED_FROM" "${MEMBERS[@]}" << 'PY'
from __future__ import annotations

import json
import subprocess
import sys
from datetime import datetime
from pathlib import Path


CHECK = sys.argv[1]
GROUP_BRANCH = sys.argv[2]
GROUP_DIR = Path(sys.argv[3])
OUT_FILE = Path(sys.argv[4])
TITLE = sys.argv[5].strip()
DERIVED_FROM = sys.argv[6].strip()
MEMBERS = sys.argv[7:]


def run_paths(feature: str) -> dict:
    out = subprocess.check_output([CHECK, "--json", "--paths-only", "--feature", feature], text=True)
    return json.loads(out)


def rel(p: Path) -> str:
    try:
        return str(p.relative_to(Path.cwd()))
    except Exception:
        return str(p)


members_info: list[dict] = []
for member in MEMBERS:
    paths = run_paths(member)
    feature_dir = Path(paths["FEATURE_DIR"])
    members_info.append(
        {
            "input": member,
            "id": paths["BRANCH"],
            "dir": feature_dir,
            "spec": feature_dir / "spec.md",
            "plan": feature_dir / "plan.md",
            "tasks": feature_dir / "tasks.md",
            "quickstart": feature_dir / "quickstart.md",
        }
    )


auto_title = f"Spec Group Checklist: {GROUP_BRANCH} · " + " + ".join([m["id"] for m in members_info])
final_title = TITLE or auto_title


lines: list[str] = []
lines.append(f"# {final_title}")
lines.append("")
lines.append(f"**Group**: `{rel(GROUP_DIR)}`")
lines.append(f"**Derived From**: `{DERIVED_FROM}`")
lines.append(f"**Members**: " + ", ".join([f"`{rel(m['dir'])}`" for m in members_info]))
lines.append(f"**Created**: {datetime.now().strftime('%Y-%m-%d')}")
lines.append("")
lines.append("> 本文件是“执行索引清单”：只做跳转与 gate 归纳，不复制成员 spec 的实现 tasks（避免并行真相源）。")
lines.append("")
lines.append("## Members")
lines.append("")

for m in members_info:
    lines.append(f"- [ ] `{m['id']}` 已按其 tasks/quickstart 达标（入口：`{rel(m['tasks'])}`、`{rel(m['quickstart'])}`）")

lines.append("")
lines.append("## Notes")
lines.append("")
lines.append("- 若需要跨 spec 联合验收：优先用 `$speckit acceptance <member...>`（multi-spec mode）。")
lines.append("- 若需要查看成员 tasks 进度汇总：用 `extract-tasks.sh --json --feature ...`。")
lines.append("")

OUT_FILE.parent.mkdir(parents=True, exist_ok=True)
OUT_FILE.write_text("\n".join(lines) + "\n", encoding="utf-8")
PY

if $JSON_MODE; then
  python3 - "$OUT_FILE" "$GROUP_BRANCH" "$GROUP_DIR" "${MEMBERS[@]}" << 'PY'
from __future__ import annotations

import json
import sys

out_file = sys.argv[1]
group_branch = sys.argv[2]
group_dir = sys.argv[3]
members = sys.argv[4:]

print(
    json.dumps(
        {
            "group": group_branch,
            "groupDir": group_dir,
            "members": members,
            "checklistFile": out_file,
        },
        ensure_ascii=False,
    )
)
PY
else
  echo "wrote $OUT_FILE"
fi
