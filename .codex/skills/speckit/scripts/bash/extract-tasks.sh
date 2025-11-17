#!/usr/bin/env bash

# Extract tasks (checkbox + id + status) from one or more tasks.md files.
#
# This script is intentionally read-only and deterministic: it emits an inventory
# of tasks with file+line evidence so acceptance review does not rely on ad-hoc grep.
#
# Usage:
#   ./extract-tasks.sh [--json] [--feature <id>]... [<id>...]
#
# Examples:
#   ./extract-tasks.sh --json --feature 024 --feature 025
#   ./extract-tasks.sh 024 025
#
# Notes:
# - <id> can be "024" (numeric prefix) or "024-some-feature" (full directory).
# - Feature resolution reuses check-prerequisites.sh to find absolute paths.

set -euo pipefail

JSON_MODE=false
FEATURES=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    --json)
      JSON_MODE=true
      shift
      ;;
    --feature)
      if [[ $# -lt 2 || "${2:-}" == --* ]]; then
        echo "ERROR: --feature requires a value." >&2
        exit 1
      fi
      FEATURES+=("$2")
      shift 2
      ;;
    --feature=*)
      FEATURES+=("${1#--feature=}")
      shift
      ;;
    --help|-h)
      cat << 'EOF'
Usage: extract-tasks.sh [--json] [--feature <id>]... [<id>...]

Extract checkbox tasks from one or more tasks.md files and emit an inventory
with file+line evidence (useful for speckit.acceptance).

Options:
  --json              Output JSON (default: text)
  --feature <id>      Target a specific spec (repeatable)
  --help, -h          Show this help message

Examples:
  ./extract-tasks.sh --json --feature 024 --feature 025
  ./extract-tasks.sh 024 025
EOF
      exit 0
      ;;
    --*)
      echo "ERROR: Unknown option '$1'. Use --help for usage information." >&2
      exit 1
      ;;
    *)
      if [[ "$1" =~ ^[0-9]{3}(-.+)?$ ]]; then
        FEATURES+=("$1")
        shift
      else
        echo "ERROR: Unknown argument '$1'. Expected feature id like 024 or 024-some-feature." >&2
        exit 1
      fi
      ;;
  esac
done

SCRIPT_DIR="$(CDPATH="" cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CHECK_PREREQ="$SCRIPT_DIR/check-prerequisites.sh"

python3 - "$CHECK_PREREQ" "$JSON_MODE" "${FEATURES[@]}" << 'PY'
from __future__ import annotations

import json
import re
import subprocess
import sys
from pathlib import Path
from typing import Any


CHECK = sys.argv[1]
JSON_MODE = sys.argv[2].lower() == "true"
INPUT_FEATURES = sys.argv[3:]


TASK_PATTERN = re.compile(r"^\s*-\s*\[(?P<state>[ xX])\]\s+(?P<id>[A-Z]\d{3,})\b(?P<rest>.*)$")
HEADING_PATTERN = re.compile(r"^(#{1,6})\s+(.+?)\s*$")
STORY_PATTERN = re.compile(r"\[(US\d+)\]")
PARALLEL_PATTERN = re.compile(r"\[P\]")
CODE_PATTERN = re.compile(r"\b(?:FR|NFR|SC)-\d{3}\b")
REFS_MARKER_PATTERN = re.compile(r"\bRefs:\s*(?P<body>.+?)\s*[)）]\s*$")


def run_check(feature: str | None) -> dict[str, Any]:
    cmd = [CHECK, "--json", "--paths-only"]
    if feature:
        cmd += ["--feature", feature]
    out = subprocess.check_output(cmd, text=True)
    return json.loads(out)


def parse_tasks(tasks_path: Path) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    if not tasks_path.exists():
        raise FileNotFoundError(str(tasks_path))

    lines = tasks_path.read_text(encoding="utf-8", errors="replace").splitlines()
    last_h2: str | None = None
    last_h3: str | None = None

    tasks: list[dict[str, Any]] = []
    non_task_checkboxes: list[dict[str, Any]] = []

    for line_no, line in enumerate(lines, start=1):
        heading_match = HEADING_PATTERN.match(line)
        if heading_match:
            level = len(heading_match.group(1))
            title = heading_match.group(2).strip() or None
            if level == 2:
                last_h2 = title
                last_h3 = None
            elif level == 3:
                last_h3 = title

        m = TASK_PATTERN.match(line)
        if not m:
            # Keep compatibility: some tasks files may include checkboxes without IDs;
            # we intentionally ignore them, but record them for diagnostics.
            if re.match(r"^\s*-\s*\[[ xX]\]\s+", line):
                non_task_checkboxes.append({"line": line_no, "raw": line})
            continue

        state = m.group("state")
        task_id = m.group("id")
        rest = m.group("rest").strip()

        story_match = STORY_PATTERN.search(rest)
        story = story_match.group(1) if story_match else None

        parallel = bool(PARALLEL_PATTERN.search(rest))

        refs_codes: list[str] = []
        refs_marker = REFS_MARKER_PATTERN.search(rest)
        if refs_marker:
            refs_body = refs_marker.group("body")
            refs_codes = sorted(set(CODE_PATTERN.findall(refs_body)))

        tasks.append(
            {
                "id": task_id,
                "done": state.lower() == "x",
                "line": line_no,
                "phase": last_h2,
                "section": last_h3,
                "parallel": parallel,
                "story": story,
                "refs": refs_codes,
                "raw": line.rstrip("\n"),
            }
        )

    return tasks, non_task_checkboxes


def summarize_duplicates(tasks: list[dict[str, Any]]) -> list[dict[str, Any]]:
    by_id: dict[str, list[dict[str, Any]]] = {}
    for t in tasks:
        by_id.setdefault(t["id"], []).append(t)
    duplicates = []
    for task_id, items in by_id.items():
        if len(items) > 1:
            duplicates.append(
                {
                    "id": task_id,
                    "occurrences": [{"line": it["line"], "raw": it["raw"]} for it in items],
                }
            )
    return sorted(duplicates, key=lambda x: x["id"])


def summarize_by_key(tasks: list[dict[str, Any]], key: str) -> dict[str, Any]:
    out: dict[str, Any] = {}
    for t in tasks:
        k = t.get(key) or "(none)"
        bucket = out.setdefault(k, {"total": 0, "done": 0, "todo": 0})
        bucket["total"] += 1
        if t["done"]:
            bucket["done"] += 1
        else:
            bucket["todo"] += 1
    return out


def main() -> int:
    features = list(INPUT_FEATURES)
    if not features:
        features = [None]  # type: ignore[list-item]

    targets: list[dict[str, Any]] = []
    had_error = False

    for feature in features:
        try:
            paths = run_check(feature)
            tasks_path = Path(paths.get("TASKS", ""))
            tasks, non_task_checkboxes = parse_tasks(tasks_path)
        except Exception as e:
            had_error = True
            targets.append(
                {
                    "input": feature,
                    "error": {"message": str(e), "type": type(e).__name__},
                }
            )
            continue

        total = len(tasks)
        done = sum(1 for t in tasks if t["done"])
        todo = total - done

        duplicates = summarize_duplicates(tasks)
        if duplicates:
            had_error = True

        targets.append(
            {
                "input": feature,
                "feature": paths.get("BRANCH"),
                "repoRoot": paths.get("REPO_ROOT"),
                "featureDir": paths.get("FEATURE_DIR"),
                "tasksFile": str(Path(paths.get("FEATURE_DIR", "")) / "tasks.md"),
                "counts": {
                    "total": total,
                    "done": done,
                    "todo": todo,
                    "duplicates": len(duplicates),
                    "nonTaskCheckboxes": len(non_task_checkboxes),
                },
                "byPhase": summarize_by_key(tasks, "phase"),
                "byStory": summarize_by_key(tasks, "story"),
                "duplicates": duplicates,
                "nonTaskCheckboxes": non_task_checkboxes,
                "tasks": tasks,
            }
        )

    if JSON_MODE:
        print(json.dumps({"targets": targets}, ensure_ascii=False, indent=2))
        return 1 if had_error else 0

    for t in targets:
        if "error" in t:
            print(f"[ERROR] {t.get('input')}: {t['error']['type']}: {t['error']['message']}")
            continue

        counts = t.get("counts", {})
        print(f"{t.get('feature')}  ({t.get('tasksFile')})")
        print(
            "  "
            + " ".join(
                [
                    f"total={counts.get('total')}",
                    f"done={counts.get('done')}",
                    f"todo={counts.get('todo')}",
                    f"dup={counts.get('duplicates')}",
                    f"nonTaskCheckboxes={counts.get('nonTaskCheckboxes')}",
                ]
            )
        )
        for task in t.get("tasks", []):
            mark = "x" if task["done"] else " "
            phase = task.get("phase") or ""
            story = task.get("story") or ""
            refs = task.get("refs") or []
            refs_part = f" refs={','.join(refs)}" if refs else ""
            context = " / ".join([p for p in [phase, story] if p]) if (phase or story) else ""
            context_part = f" [{context}]" if context else ""
            print(f"  - [{mark}] {task['id']}:{task['line']}{context_part}{refs_part} {task['raw']}")
        print()

    return 1 if had_error else 0


if __name__ == "__main__":
    raise SystemExit(main())
PY

