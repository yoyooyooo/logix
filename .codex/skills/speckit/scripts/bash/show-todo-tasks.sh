#!/usr/bin/env bash

# Show pending (unchecked) tasks across specs, or for specific specs.
#
# Default (no feature args): summarize all specs that still have TODO tasks.
# With feature args: show all TODO tasks under the specified spec(s).
#
# This script is read-only and uses extract-tasks.sh for the detailed view.
#
# Usage:
#   ./show-todo-tasks.sh [--json] [--feature <id>]... [<id>...]
#
# Examples:
#   ./show-todo-tasks.sh
#   ./show-todo-tasks.sh 024
#   ./show-todo-tasks.sh --feature 024 --feature 025
#   ./show-todo-tasks.sh --json --feature 024
#
# Notes:
# - Exit code matches extract-tasks.sh (e.g. duplicates => non-zero), but output is still printed.
# - Read-only.

set -euo pipefail

SCRIPT_DIR="$(CDPATH="" cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
EXTRACT="$SCRIPT_DIR/extract-tasks.sh"

JSON_MODE=false
SHOW_HELP=false
FORWARD_ARGS=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    --json)
      JSON_MODE=true
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
Usage: show-todo-tasks.sh [--json] [--feature <id>]... [<id>...]

Default (no feature args): summarize all specs that still have TODO tasks.
With feature args: show pending tasks from tasks.md, with file+line evidence.

Options:
  --json              Output JSON (default: text)
  --feature <id>      Target a specific spec (repeatable)
  --help, -h          Show this help message

Examples:
  ./show-todo-tasks.sh
  ./show-todo-tasks.sh 024
  ./show-todo-tasks.sh --feature 024 --feature 025
  ./show-todo-tasks.sh --json --feature 024
EOF
  exit 0
fi

if [[ ${#FORWARD_ARGS[@]} -eq 0 ]]; then
  source "$SCRIPT_DIR/common.sh"
  REPO_ROOT="$(get_repo_root)"
  SPECS_DIR="$REPO_ROOT/specs"

  python3 - "$JSON_MODE" "$REPO_ROOT" "$SPECS_DIR" << 'PY'
from __future__ import annotations

import json
import re
import sys
from pathlib import Path
from typing import Any


JSON_MODE = sys.argv[1].lower() == "true"
REPO_ROOT = Path(sys.argv[2])
SPECS_DIR = Path(sys.argv[3])

TASK_PATTERN = re.compile(r"^\s*-\s*\[(?P<state>[ xX])\]\s+(?P<id>[A-Z]\d{3,})\b")
FEATURE_PATTERN = re.compile(r"^(?P<num>\d{3})-")


def feature_sort_key(name: str) -> tuple[int, str]:
    m = FEATURE_PATTERN.match(name)
    if not m:
        return (-1, name)
    return (int(m.group("num")), name)


def count_todo(tasks_path: Path) -> dict[str, int]:
    total = 0
    done = 0
    todo = 0

    for line in tasks_path.read_text(encoding="utf-8", errors="replace").splitlines():
        m = TASK_PATTERN.match(line)
        if not m:
            continue
        total += 1
        state = m.group("state").lower()
        if state == "x":
            done += 1
        else:
            todo += 1

    return {"total": total, "done": done, "todo": todo}


if not SPECS_DIR.is_dir():
    raise SystemExit(f"ERROR: specs dir not found: {SPECS_DIR}")

rows: list[dict[str, Any]] = []
total_todo = 0

for feature_dir in sorted((p for p in SPECS_DIR.iterdir() if p.is_dir()), key=lambda p: feature_sort_key(p.name)):
    name = feature_dir.name
    if not FEATURE_PATTERN.match(name):
        continue

    tasks_path = feature_dir / "tasks.md"
    if not tasks_path.is_file():
        continue

    counts = count_todo(tasks_path)
    if counts["todo"] <= 0:
        continue

    rows.append({"feature": name, "todo": counts["todo"]})
    total_todo += counts["todo"]

if JSON_MODE:
    print(json.dumps({"repoRoot": str(REPO_ROOT), "counts": {"specs": len(rows), "todo": total_todo}, "specs": rows}, ensure_ascii=False, indent=2))
    raise SystemExit(0)

for r in rows:
    print(f"{r['feature']} todo={r['todo']}")
print(f"TOTAL todo={total_todo} specs={len(rows)}")
PY

  exit 0
fi

set +e
RAW_JSON="$("$EXTRACT" --json "${FORWARD_ARGS[@]}")"
STATUS=$?
set -e

TMP_JSON="$(mktemp -t speckit-todo-tasks.XXXXXX)"
trap 'rm -f "$TMP_JSON"' EXIT
printf '%s' "$RAW_JSON" > "$TMP_JSON"

python3 - "$JSON_MODE" "$TMP_JSON" << 'PY'
from __future__ import annotations

import json
import re
import sys
from pathlib import Path
from typing import Any


JSON_MODE = sys.argv[1].lower() == "true"
JSON_PATH = Path(sys.argv[2])

raw = JSON_PATH.read_text(encoding="utf-8", errors="replace")
try:
    payload = json.loads(raw)
except json.JSONDecodeError:
    sys.stdout.write(raw)
    raise SystemExit(1)

targets: list[dict[str, Any]] = payload.get("targets") or []

TASK_DESC_PATTERN = re.compile(r"^\s*-\s*\[[ xX]\]\s+[A-Z]\d{3,}\b(?P<desc>.*)$")


def format_task(task: dict[str, Any]) -> str:
    task_id = task.get("id") or "(unknown)"
    line = task.get("line") or "?"
    phase = task.get("phase")
    section = task.get("section")
    story = task.get("story")
    refs = task.get("refs") or []
    raw_line = (task.get("raw") or "").rstrip("\n")

    m = TASK_DESC_PATTERN.match(raw_line)
    desc = (m.group("desc").strip() if m else raw_line.strip()) or raw_line

    ctx_parts = [p for p in [phase, section, story] if p]
    ctx = " / ".join(ctx_parts)
    ctx_part = f" [{ctx}]" if ctx else ""
    refs_part = f" refs={','.join(refs)}" if refs else ""

    return f"  - {task_id}:{line}{ctx_part}{refs_part} {desc}"


filtered_targets: list[dict[str, Any]] = []
for t in targets:
    if "error" in t:
        filtered_targets.append(t)
        continue

    tasks = t.get("tasks") or []
    todo_tasks = [task for task in tasks if not task.get("done")]

    t2 = dict(t)
    t2["tasks"] = todo_tasks
    filtered_targets.append(t2)

if JSON_MODE:
    print(json.dumps({"targets": filtered_targets}, ensure_ascii=False, indent=2))
    raise SystemExit(0)

for t in filtered_targets:
    if "error" in t:
        err = t.get("error") or {}
        print(f"[ERROR] {t.get('input')}: {err.get('type')}: {err.get('message')}")
        continue

    counts = t.get("counts") or {}
    feature = t.get("feature") or "(unknown)"
    tasks_file = t.get("tasksFile") or ""
    print(f"{feature}  ({tasks_file})")
    print(
        "  "
        + " ".join(
            [
                f"todo={counts.get('todo')}",
                f"total={counts.get('total')}",
                f"done={counts.get('done')}",
                f"dup={counts.get('duplicates')}",
            ]
        )
    )

    todo_tasks = t.get("tasks") or []
    if not todo_tasks:
        print("  (no pending tasks)")
        print()
        continue

    for task in todo_tasks:
        print(format_task(task))
    print()
PY

exit $STATUS
