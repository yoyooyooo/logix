#!/usr/bin/env bash

# Extract user stories (US) from one or more spec.md files.
#
# This script is intentionally read-only and deterministic: it emits an inventory
# of User Story definitions with file+line evidence.
#
# Usage:
#   ./extract-user-stories.sh [--json] [--feature <id>]... [<id>...]
#
# Examples:
#   ./extract-user-stories.sh --json --feature 061
#   ./extract-user-stories.sh 060 061
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
Usage: extract-user-stories.sh [--json] [--feature <id>]... [<id>...]

Extract User Story (US) definitions from one or more spec files and emit an inventory
with file+line evidence.

Options:
  --json              Output JSON (default: text)
  --feature <id>      Target a specific spec (repeatable)
  --help, -h          Show this help message

Examples:
  ./extract-user-stories.sh --json --feature 061
  ./extract-user-stories.sh 060 061
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


HEADING_PATTERN = re.compile(r"^(#{1,6})\s+(.+?)\s*$")
USER_STORY_PATTERN = re.compile(r"^User\s+Story\s+(?P<num>\d+)\b(?P<rest>.*)$", re.IGNORECASE)
PRIORITY_PATTERN = re.compile(r"\(\s*Priority\s*:\s*(?P<priority>P\d+)\s*\)\s*$", re.IGNORECASE)

US_CODE_PATTERN = re.compile(r"\bUS(?P<num>\d+)\b")


def run_check(feature: str | None) -> dict[str, Any]:
    cmd = [CHECK, "--json", "--paths-only"]
    if feature:
        cmd += ["--feature", feature]
    out = subprocess.check_output(cmd, text=True)
    return json.loads(out)


def normalize_title(rest: str) -> tuple[str, str | None]:
    rest = rest.strip()
    priority: str | None = None

    pri = PRIORITY_PATTERN.search(rest)
    if pri:
        priority = pri.group("priority")
        rest = rest[: pri.start()].rstrip()

    rest = rest.lstrip()
    if rest.startswith(("-", "–", "—")):
        rest = rest[1:].lstrip()
    if rest.startswith(":"):
        rest = rest[1:].lstrip()

    return rest.strip(), priority


def parse_user_stories(spec_path: Path) -> tuple[list[dict[str, Any]], list[dict[str, Any]], list[dict[str, Any]]]:
    if not spec_path.exists():
        return [], [], []

    lines = spec_path.read_text(encoding="utf-8", errors="replace").splitlines()

    # Collect story headings (definitions).
    definitions: list[dict[str, Any]] = []
    by_code: dict[str, list[dict[str, Any]]] = {}

    for line_no, line in enumerate(lines, start=1):
        heading = HEADING_PATTERN.match(line)
        if not heading:
            continue

        heading_text = heading.group(2).strip()
        m = USER_STORY_PATTERN.match(heading_text)
        if not m:
            continue

        num = int(m.group("num"))
        raw_rest = m.group("rest")
        title, priority = normalize_title(raw_rest)
        code = f"US{num}"

        definition = {
            "code": code,
            "index": num,
            "line": line_no,
            "title": title,
            "priority": priority,
            "raw": line.rstrip("\n"),
        }
        definitions.append(definition)
        by_code.setdefault(code, []).append(definition)

    # Pick canonical definitions per code (keep order by index).
    stories: list[dict[str, Any]] = []
    duplicates: list[dict[str, Any]] = []

    for code, defs in sorted(by_code.items(), key=lambda kv: int(kv[0][2:])):
        canonical = defs[0]
        story = dict(canonical)
        story["references"] = []
        stories.append(story)

        if len(defs) > 1:
            duplicates.append(
                {
                    "code": code,
                    "definitions": [{"line": d["line"], "raw": d["raw"]} for d in defs],
                }
            )

    by_code_story: dict[str, dict[str, Any]] = {s["code"]: s for s in stories}

    # Collect references (USn mentions) and orphan references (USn without heading).
    orphan_refs: dict[str, list[dict[str, Any]]] = {}
    total_refs = 0

    for line_no, line in enumerate(lines, start=1):
        for match in US_CODE_PATTERN.finditer(line):
            code = f"US{match.group('num')}"
            occ = {"line": line_no, "col": match.start() + 1, "raw": line.rstrip("\n")}
            total_refs += 1

            story = by_code_story.get(code)
            if story is not None:
                story["references"].append(occ)
            else:
                orphan_refs.setdefault(code, []).append(occ)

    orphan_references = [
        {"code": code, "references": refs} for code, refs in sorted(orphan_refs.items(), key=lambda kv: int(kv[0][2:]))
    ]

    return stories, duplicates, orphan_references


def summarize_by_priority(stories: list[dict[str, Any]]) -> dict[str, int]:
    out: dict[str, int] = {}
    for s in stories:
        p = s.get("priority") or "(none)"
        out[p] = out.get(p, 0) + 1
    return dict(sorted(out.items(), key=lambda kv: kv[0]))


def main() -> int:
    features = list(INPUT_FEATURES)
    if not features:
        features = [None]  # type: ignore[list-item]

    targets: list[dict[str, Any]] = []
    had_error = False

    for feature in features:
        try:
            paths = run_check(feature)
        except subprocess.CalledProcessError as e:
            had_error = True
            targets.append(
                {
                    "input": feature,
                    "error": {
                        "message": "check-prerequisites failed",
                        "exitCode": e.returncode,
                        "stdout": (e.stdout or "").strip(),
                        "stderr": (e.stderr or "").strip(),
                    },
                }
            )
            continue

        spec_path = Path(paths.get("FEATURE_SPEC", ""))
        stories, duplicate_definitions, orphan_references = parse_user_stories(spec_path)

        if duplicate_definitions:
            had_error = True

        counts = {
            "definitions": len(stories),
            "byPriority": summarize_by_priority(stories),
            "references": sum(len(s.get("references") or []) for s in stories),
            "duplicateDefinitions": len(duplicate_definitions),
            "orphanReferences": len(orphan_references),
        }

        targets.append(
            {
                "input": feature,
                "feature": paths.get("BRANCH"),
                "repoRoot": paths.get("REPO_ROOT"),
                "featureDir": paths.get("FEATURE_DIR"),
                "specFile": str(spec_path),
                "planFile": paths.get("IMPL_PLAN"),
                "tasksFile": paths.get("TASKS"),
                "counts": counts,
                "duplicateDefinitions": duplicate_definitions,
                "orphanReferences": orphan_references,
                "stories": stories,
            }
        )

    if JSON_MODE:
        print(json.dumps({"targets": targets}, ensure_ascii=False, indent=2))
        return 1 if had_error else 0

    for t in targets:
        if "error" in t:
            err = t.get("error") or {}
            print(f"[ERROR] {t.get('input')}: {err.get('message')}")
            continue

        print(f"{t.get('feature')}  ({t.get('specFile')})")
        counts = t.get("counts") or {}
        by_pri = counts.get("byPriority") or {}
        print(
            "  "
            + " ".join(
                [
                    f"definitions={counts.get('definitions')}",
                    f"byPriority={by_pri}",
                    f"refs={counts.get('references')}",
                    f"dupDefs={counts.get('duplicateDefinitions')}",
                    f"orphanRefs={counts.get('orphanReferences')}",
                ]
            )
        )

        for s in t.get("stories") or []:
            pri = s.get("priority")
            pri_part = f" pri={pri}" if pri else ""
            title = s.get("title") or ""
            refs = s.get("references") or []
            refs_part = f" refs={len(refs)}" if refs else ""
            print(f"  - {s['code']}:{s['line']}{pri_part}{refs_part} {title}".rstrip())
        print()

    return 1 if had_error else 0


if __name__ == "__main__":
    raise SystemExit(main())
PY

