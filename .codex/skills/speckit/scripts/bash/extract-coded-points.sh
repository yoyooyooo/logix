#!/usr/bin/env bash

# Extract coded points (FR/NFR/SC) from one or more spec.md files.
#
# This script is intentionally read-only and deterministic: it emits an inventory
# of codes with file+line evidence so acceptance review does not rely on ad-hoc grep.
#
# Usage:
#   ./extract-coded-points.sh [--json] [--feature <id>]... [<id>...]
#
# Examples:
#   ./extract-coded-points.sh --json --feature 024 --feature 025
#   ./extract-coded-points.sh 024 025
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
Usage: extract-coded-points.sh [--json] [--feature <id>]... [<id>...]

Extract FR/NFR/SC coded points from one or more spec files and emit an inventory
with file+line evidence (useful for speckit.acceptance).

Options:
  --json              Output JSON (default: text)
  --feature <id>      Target a specific spec (repeatable)
  --help, -h          Show this help message

Examples:
  ./extract-coded-points.sh --json --feature 024 --feature 025
  ./extract-coded-points.sh 024 025
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


CODE_PATTERN = re.compile(r"\b(?:FR|NFR|SC)-\d{3}[A-Za-z]?\b")
HEADING_PATTERN = re.compile(r"^(#{1,6})\s+(.+?)\s*$")


def run_check(feature: str | None) -> dict[str, Any]:
    cmd = [CHECK, "--json", "--paths-only"]
    if feature:
        cmd += ["--feature", feature]
    out = subprocess.check_output(cmd, text=True)
    return json.loads(out)


def is_definition_line(line: str, match_start: int, match_end: int) -> bool:
    prefix = line[:match_start]
    suffix = line[match_end:]

    prefix_stripped = prefix.lstrip()

    # Remove common markdown list markers.
    if prefix_stripped.startswith(("-", "*")):
        prefix_stripped = prefix_stripped[1:]
    else:
        m = re.match(r"^\d+\.\s+", prefix_stripped)
        if m:
            prefix_stripped = prefix_stripped[m.end() :]

    # Allow surrounding markdown emphasis.
    prefix_stripped = prefix_stripped.strip().strip("*").strip()
    if prefix_stripped:
        return False

    suffix_stripped = suffix.lstrip()
    if suffix_stripped.startswith("**"):
        suffix_stripped = suffix_stripped[2:].lstrip()

    return suffix_stripped.startswith((":","："))


def extract_occurrences(spec_path: Path) -> list[dict[str, Any]]:
    if not spec_path.exists():
        return []

    lines = spec_path.read_text(encoding="utf-8", errors="replace").splitlines()
    last_heading: str | None = None
    occurrences: list[dict[str, Any]] = []

    for line_no, line in enumerate(lines, start=1):
        heading_match = HEADING_PATTERN.match(line)
        if heading_match:
            last_heading = heading_match.group(2).strip() or None

        for match in CODE_PATTERN.finditer(line):
            code = match.group(0)
            code_type = code.split("-", 1)[0]
            kind = "definition" if is_definition_line(line, match.start(), match.end()) else "reference"
            occurrences.append(
                {
                    "code": code,
                    "type": code_type,
                    "line": line_no,
                    "col": match.start() + 1,
                    "heading": last_heading,
                    "kind": kind,
                    "raw": line.rstrip("\n"),
                }
            )

    return occurrences


def build_points(occurrences: list[dict[str, Any]]) -> tuple[list[dict[str, Any]], list[dict[str, Any]], list[dict[str, Any]]]:
    by_code: dict[str, dict[str, Any]] = {}
    for occ in occurrences:
        entry = by_code.setdefault(
            occ["code"],
            {"code": occ["code"], "type": occ["type"], "definitions": [], "references": []},
        )
        if occ["kind"] == "definition":
            entry["definitions"].append(occ)
        else:
            entry["references"].append(occ)

    points: list[dict[str, Any]] = []
    duplicate_definitions: list[dict[str, Any]] = []
    orphan_references: list[dict[str, Any]] = []

    for code, entry in by_code.items():
        defs = sorted(entry["definitions"], key=lambda x: (x["line"], x["col"]))
        refs = sorted(entry["references"], key=lambda x: (x["line"], x["col"]))
        if not defs:
            orphan_references.append(
                {
                    "code": code,
                    "type": entry["type"],
                    "references": [{"line": r["line"], "col": r["col"], "raw": r["raw"]} for r in refs],
                }
            )
            continue

        definition = defs[0]
        points.append(
            {
                "code": code,
                "type": entry["type"],
                "definition": {
                    "line": definition["line"],
                    "col": definition["col"],
                    "heading": definition["heading"],
                    "raw": definition["raw"],
                },
                "references": [{"line": r["line"], "col": r["col"], "raw": r["raw"]} for r in refs],
            }
        )

        if len(defs) > 1:
            duplicate_definitions.append(
                {
                    "code": code,
                    "type": entry["type"],
                    "definitions": [
                        {"line": d["line"], "col": d["col"], "raw": d["raw"]} for d in defs
                    ],
                }
            )

    points = sorted(points, key=lambda x: (x["type"], x["code"]))
    duplicate_definitions = sorted(duplicate_definitions, key=lambda x: x["code"])
    orphan_references = sorted(orphan_references, key=lambda x: x["code"])

    return points, duplicate_definitions, orphan_references


def main() -> int:
    features = list(INPUT_FEATURES)
    if not features:
        # Fall back to inferred current feature (may be "latest"); caller should usually pass ids.
        features = [None]  # type: ignore[list-item]

    targets: list[dict[str, Any]] = []

    for feature in features:
        try:
            paths = run_check(feature)  # includes REPO_ROOT/BRANCH/FEATURE_DIR/FEATURE_SPEC...
        except subprocess.CalledProcessError as e:
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
        occurrences = extract_occurrences(spec_path)
        points, duplicate_definitions, orphan_references = build_points(occurrences)

        by_type_defs: dict[str, int] = {}
        for item in points:
            by_type_defs[item["type"]] = by_type_defs.get(item["type"], 0) + 1

        targets.append(
            {
                "input": feature,
                "feature": paths.get("BRANCH"),
                "repoRoot": paths.get("REPO_ROOT"),
                "featureDir": paths.get("FEATURE_DIR"),
                "specFile": str(spec_path),
                "planFile": paths.get("IMPL_PLAN"),
                "tasksFile": paths.get("TASKS"),
                "counts": {
                    "definitions": len(points),
                    "byTypeDefinitions": dict(sorted(by_type_defs.items(), key=lambda kv: kv[0])),
                    "occurrences": len(occurrences),
                    "duplicateDefinitions": len(duplicate_definitions),
                    "orphanReferences": len(orphan_references),
                },
                "duplicateDefinitions": duplicate_definitions,
                "orphanReferences": orphan_references,
                "points": points,
                "occurrences": occurrences,
            }
        )

    if JSON_MODE:
        payload = {"targets": targets}
        print(json.dumps(payload, ensure_ascii=False, indent=2))
        return 0

    # Text output (compact)
    for t in targets:
        if "error" in t:
            print(f"[ERROR] {t.get('input')}: {t['error']['message']}")
            continue
        print(f"{t.get('feature')}  ({t.get('specFile')})")
        counts = t.get("counts", {})
        by_type = counts.get("byTypeDefinitions", {})
        print(
            "  "
            + " ".join(
                [
                    f"definitions={counts.get('definitions')}",
                    f"byType={by_type}",
                    f"occurrences={counts.get('occurrences')}",
                    f"dupDefs={counts.get('duplicateDefinitions')}",
                    f"orphanRefs={counts.get('orphanReferences')}",
                ]
            )
        )
        for p in t.get("points", []):
            d = p["definition"]
            heading = d.get("heading")
            heading_part = f" [{heading}]" if heading else ""
            refs = p.get("references", [])
            refs_part = f" refs={len(refs)}" if refs else ""
            print(f"  - {p['code']}:{d['line']}:{d['col']}{heading_part}{refs_part} {d['raw']}")
        print()

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
PY
