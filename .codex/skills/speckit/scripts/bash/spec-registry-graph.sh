#!/usr/bin/env bash

# Render a dependency graph from one or more spec-registry.json files.
#
# A "Spec Group" is any spec directory that contains `spec-registry.json`.
# You can pass group ids (e.g. 046) or registry file paths.
#
# Usage:
#   spec-registry-graph.sh <group|registry.json>... [--all] [--focus <id>] [--direction upstream|downstream|both] [--format mermaid|text] [--json]
#
# Examples:
#   spec-registry-graph.sh 046
#   spec-registry-graph.sh 046 --focus 050
#   spec-registry-graph.sh --all --focus 045 --direction downstream

set -euo pipefail

JSON_MODE=false
ALL=false
FOCUS=""
DIRECTION="both"
FORMAT="mermaid"
SOURCES=()

usage() {
  cat << 'EOF'
Usage:
  spec-registry-graph.sh <group|registry.json>... [--all] [--focus <id>] [--direction upstream|downstream|both] [--format mermaid|text] [--json]

Args:
  <group|registry.json>   Group spec id (e.g., 046 or 046-core-ng-roadmap) OR a direct path to spec-registry.json

Options:
  --all                   Scan all `specs/*/spec-registry.json` and merge as one graph
  --focus <id>            Only render the dependency closure around this spec id (e.g. 045 / 045-xxx / specs/045-*/...)
  --direction <dir>       Closure direction for --focus: upstream | downstream | both (default: both)
  --format <fmt>          Output format: mermaid | text (default: mermaid). Ignored in --json mode.
  --json                  Output machine JSON: nodes/edges/conflicts
  --help, -h              Show help

Notes:
  - Edge direction: `A dependsOn B` renders as `B --> A` (B must be done before A).
  - Nodes referenced in dependsOn but not defined in any loaded registry are shown as "external".
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --json)
      JSON_MODE=true
      shift
      ;;
    --all)
      ALL=true
      shift
      ;;
    --focus)
      if [[ $# -lt 2 || "${2:-}" == --* ]]; then
        echo "ERROR: --focus requires a value." >&2
        exit 1
      fi
      FOCUS="$2"
      shift 2
      ;;
    --direction)
      if [[ $# -lt 2 || "${2:-}" == --* ]]; then
        echo "ERROR: --direction requires a value." >&2
        exit 1
      fi
      DIRECTION="$2"
      shift 2
      ;;
    --format)
      if [[ $# -lt 2 || "${2:-}" == --* ]]; then
        echo "ERROR: --format requires a value." >&2
        exit 1
      fi
      FORMAT="$2"
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
      SOURCES+=("$1")
      shift
      ;;
  esac
done

if [[ "$ALL" != true && ${#SOURCES[@]} -eq 0 ]]; then
  echo "ERROR: Provide at least one <group|registry.json>, or use --all." >&2
  usage >&2
  exit 1
fi

case "$DIRECTION" in
  upstream|downstream|both) ;;
  *)
    echo "ERROR: Invalid --direction: $DIRECTION (use upstream|downstream|both)" >&2
    exit 1
    ;;
esac

case "$FORMAT" in
  mermaid|text) ;;
  *)
    echo "ERROR: Invalid --format: $FORMAT (use mermaid|text)" >&2
    exit 1
    ;;
esac

SCRIPT_DIR="$(CDPATH="" cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CHECK="$SCRIPT_DIR/check-prerequisites.sh"
source "$SCRIPT_DIR/common.sh"

repo_root="$(get_repo_root)"

REGISTRIES=()

if [[ "$ALL" == true ]]; then
  shopt -s nullglob
  for f in "$repo_root/specs"/*/spec-registry.json; do
    REGISTRIES+=("$f")
  done
  shopt -u nullglob
fi

for s in "${SOURCES[@]}"; do
  if [[ -f "$s" && "$s" == *.json ]]; then
    REGISTRIES+=("$s")
    continue
  fi

  paths_json="$("$CHECK" --json --paths-only --feature "$s")"
  feature_dir="$(python3 -c 'import json,sys; print(json.load(sys.stdin)["FEATURE_DIR"])' <<<"$paths_json")"
  registry_json="$feature_dir/spec-registry.json"
  if [[ ! -f "$registry_json" ]]; then
    echo "ERROR: spec-registry.json not found for group '$s' at $registry_json" >&2
    echo "Hint: add a machine-readable registry file (SSoT) under the group feature directory." >&2
    exit 1
  fi
  REGISTRIES+=("$registry_json")
done

if [[ ${#REGISTRIES[@]} -eq 0 ]]; then
  echo "ERROR: No registry files found." >&2
  exit 1
fi

python3 - "$repo_root" "$JSON_MODE" "$FORMAT" "$FOCUS" "$DIRECTION" "${REGISTRIES[@]}" << 'PY'
from __future__ import annotations

import json
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Literal


Format = Literal["mermaid", "text"]
Direction = Literal["upstream", "downstream", "both"]


repo_root = Path(sys.argv[1])
json_mode = sys.argv[2].lower() == "true"
fmt: Format = sys.argv[3]  # type: ignore[assignment]
focus_raw = sys.argv[4].strip()
direction: Direction = sys.argv[5]  # type: ignore[assignment]
registry_files = [Path(p) for p in sys.argv[6:]]


def normalize_id(raw: str) -> str:
    raw = raw.strip()
    if raw.startswith("specs/"):
        raw = raw[len("specs/") :]
    raw = raw.strip().strip("/")

    m = re.match(r"^(?P<prefix>\d{3})", raw)
    return m.group("prefix") if m else raw


@dataclass
class Node:
    id: str
    defined: bool = False
    dir: str | None = None
    status: str | None = None
    groups: set[str] = field(default_factory=set)


@dataclass(frozen=True)
class Edge:
    dep: str
    target: str


nodes: dict[str, Node] = {}
edges: set[Edge] = set()
conflicts: list[dict[str, Any]] = []


def get_node(node_id: str) -> Node:
    if node_id not in nodes:
        nodes[node_id] = Node(id=node_id)
    return nodes[node_id]


def load_registry(path: Path) -> dict[str, Any]:
    data = json.loads(path.read_text(encoding="utf-8", errors="replace"))
    if not isinstance(data, dict):
        raise ValueError(f"registry must be a JSON object: {path}")
    return data


for registry_file in registry_files:
    data = load_registry(registry_file)
    group = str(data.get("group") or registry_file.parent.name)
    entries = data.get("entries", [])
    if not isinstance(entries, list):
        raise ValueError(f"entries must be a list: {registry_file}")

    for entry in entries:
        if isinstance(entry, str):
            entry_id = normalize_id(entry)
            n = get_node(entry_id)
            n.groups.add(group)
            continue

        if not isinstance(entry, dict):
            continue

        entry_id = normalize_id(str(entry.get("id") or entry.get("dir") or ""))
        if not entry_id:
            continue

        entry_dir = entry.get("dir")
        entry_status = entry.get("status")
        entry_deps = entry.get("dependsOn", [])

        if entry_deps is None:
            entry_deps = []
        if not isinstance(entry_deps, list):
            entry_deps = []

        n = get_node(entry_id)
        n.groups.add(group)

        if n.defined and (n.dir != entry_dir or n.status != entry_status):
            conflicts.append(
                {
                    "id": entry_id,
                    "existing": {"dir": n.dir, "status": n.status, "groups": sorted(n.groups)},
                    "incoming": {"dir": entry_dir, "status": entry_status, "group": group, "file": str(registry_file)},
                }
            )

        if not n.defined:
            n.defined = True
            n.dir = str(entry_dir) if isinstance(entry_dir, str) else None
            n.status = str(entry_status) if isinstance(entry_status, str) else None

        for dep in entry_deps:
            if dep is None:
                continue
            dep_id = normalize_id(str(dep))
            if not dep_id:
                continue
            get_node(dep_id)
            edges.add(Edge(dep=dep_id, target=entry_id))


def build_adj(edges_set: set[Edge]) -> tuple[dict[str, set[str]], dict[str, set[str]]]:
    upstream: dict[str, set[str]] = {}
    downstream: dict[str, set[str]] = {}
    for e in edges_set:
        upstream.setdefault(e.target, set()).add(e.dep)
        downstream.setdefault(e.dep, set()).add(e.target)
    return upstream, downstream


up, down = build_adj(edges)


def closure(start: str, *, direction: Direction) -> set[str]:
    seen: set[str] = set()
    queue: list[str] = [start]
    while queue:
        cur = queue.pop(0)
        if cur in seen:
            continue
        seen.add(cur)
        if direction in ("upstream", "both"):
            for nxt in sorted(up.get(cur, set())):
                if nxt not in seen:
                    queue.append(nxt)
        if direction in ("downstream", "both"):
            for nxt in sorted(down.get(cur, set())):
                if nxt not in seen:
                    queue.append(nxt)
    return seen


focus_id = normalize_id(focus_raw) if focus_raw else ""
if focus_id:
    keep = closure(focus_id, direction=direction)
    nodes = {k: v for k, v in nodes.items() if k in keep}
    edges = {e for e in edges if e.dep in keep and e.target in keep}


def mermaid_id(spec_id: str) -> str:
    # Mermaid node ids should be identifiers; we prefix with "S" and keep digits.
    safe = re.sub(r"[^0-9A-Za-z_]", "_", spec_id)
    if not safe:
        safe = "unknown"
    if safe[0].isdigit():
        safe = "S" + safe
    return safe


def sort_key(n: Node) -> tuple[int, str]:
    # Prefer numeric ids first.
    m = re.match(r"^(\d{3})$", n.id)
    if m:
        return (0, m.group(1))
    return (1, n.id)


sorted_nodes = sorted(nodes.values(), key=sort_key)
sorted_edges = sorted(edges, key=lambda e: (e.dep, e.target))


if json_mode:
    payload = {
        "focus": focus_id or None,
        "direction": direction,
        "registries": [str(p) for p in registry_files],
        "nodes": [
            {
                "id": n.id,
                "defined": n.defined,
                "dir": n.dir,
                "status": n.status,
                "groups": sorted(n.groups),
            }
            for n in sorted_nodes
        ],
        "edges": [{"dep": e.dep, "target": e.target} for e in sorted_edges],
        "conflicts": conflicts,
    }
    print(json.dumps(payload, ensure_ascii=False))
    raise SystemExit(0)


if fmt == "text":
    for n in sorted_nodes:
        deps = sorted(up.get(n.id, set()))
        status = n.status or ("external" if not n.defined else "")
        deps_str = ",".join(deps) if deps else "-"
        print(f"{n.id}\t{status}\tdependsOn:{deps_str}")
    raise SystemExit(0)


# mermaid
print("graph TD")

for n in sorted_nodes:
    mid = mermaid_id(n.id)
    label = n.id
    if n.status:
        label = f"{label} · {n.status}"
    elif not n.defined:
        label = f"{label} · external"
    # Use double quotes via Mermaid bracket syntax.
    print(f'  {mid}["{label}"]')

for e in sorted_edges:
    a = mermaid_id(e.dep)
    b = mermaid_id(e.target)
    print(f"  {a} --> {b}")

# style external nodes
externals = [n for n in sorted_nodes if not n.defined]
if externals:
    print("")
    print("  classDef external stroke-dasharray: 5 5;")
    for n in externals:
        print(f"  class {mermaid_id(n.id)} external;")

if conflicts:
    print("")
    print(f"%% WARNING: registry conflicts detected: {len(conflicts)} (use --json to inspect)")
PY
