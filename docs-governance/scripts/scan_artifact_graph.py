#!/usr/bin/env python3
"""Audit opt-in artifact graph metadata."""

from __future__ import annotations

import argparse
import json
import re
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

NODE_RE = re.compile(r"^node_id\s*:\s*['\"]?([^'\"#\n]+)", re.MULTILINE)
STATUS_RE = re.compile(r"^status\s*:\s*['\"]?([^'\"#\n]+)", re.MULTILINE)
RELATION_KEYS = ("depends_on", "blocks", "unblocks", "bridges_to", "related_to", "supersedes", "source_material", "evidence")
KNOWN_STATUS = {"weak-signal", "open-candidate", "bridge-needed", "ready", "active", "completed", "blocked", "retired"}


def _frontmatter(text: str) -> str:
    if not text.startswith("---\n"):
        return ""
    end = text.find("\n---\n", 4)
    return text[4:end] if end >= 0 else ""


def _list_values(frontmatter: str, key: str) -> list[str]:
    lines = frontmatter.splitlines()
    values: list[str] = []
    capture = False
    for line in lines:
        if re.match(rf"^{re.escape(key)}\s*:\s*$", line):
            capture = True
            continue
        if capture:
            item = re.match(r"^\s*-\s*['\"]?([^'\"#]+)", line)
            if item:
                values.append(item.group(1).strip())
                continue
            if line and not line.startswith((" ", "\t")):
                break
    return values


def scan(repo: Path) -> dict:
    root = repo.resolve()
    roots = [root / "docs", root / "specs"]
    nodes: dict[str, Path] = {}
    relations: dict[str, dict[str, list[str]]] = defaultdict(dict)
    findings: list[dict] = []

    for base in roots:
        if not base.is_dir():
            continue
        for path in sorted(base.rglob("*.md")):
            text = path.read_text(encoding="utf-8", errors="ignore")
            fm = _frontmatter(text)
            match = NODE_RE.search(fm)
            if not match:
                continue
            node_id = match.group(1).strip()
            if node_id in nodes:
                findings.append({
                    "id": f"GRAPH_NODE_ID_DUPLICATE::{node_id}",
                    "severity": "blocker",
                    "ruleId": "GRAPH_NODE_ID_DUPLICATE",
                    "path": str(path),
                    "summary": f"duplicate node_id: {node_id}",
                    "evidence": [str(nodes[node_id]), str(path)],
                    "fixHint": "assign a unique graph identity or remove unnecessary graph metadata",
                })
            else:
                nodes[node_id] = path
            status_match = STATUS_RE.search(fm)
            if status_match and status_match.group(1).strip() not in KNOWN_STATUS:
                findings.append({
                    "id": f"GRAPH_STATUS_UNKNOWN::{node_id}",
                    "severity": "info",
                    "ruleId": "GRAPH_STATUS_UNKNOWN",
                    "path": str(path),
                    "summary": f"graph status is outside the generic vocabulary: {status_match.group(1).strip()}",
                    "evidence": [status_match.group(1).strip()],
                    "fixHint": "declare the project-local extension or use the generic status vocabulary",
                })
            for key in RELATION_KEYS:
                values = _list_values(fm, key)
                if values:
                    relations[node_id][key] = values

    for source, fields in relations.items():
        for key, values in fields.items():
            if key in {"source_material", "evidence"}:
                continue
            for target in values:
                if target not in nodes:
                    path = nodes.get(source, root)
                    findings.append({
                        "id": f"GRAPH_TARGET_MISSING::{source}::{key}::{target}",
                        "severity": "warn",
                        "ruleId": "GRAPH_TARGET_MISSING",
                        "path": str(path),
                        "summary": f"graph relation points to unknown node_id: {target}",
                        "evidence": [source, key, target],
                        "fixHint": "repair the relation, add the intended graph node, or use a direct file reference instead",
                    })

    counts = {"blocker": 0, "warn": 0, "info": 0}
    for item in findings:
        counts[item["severity"]] = counts.get(item["severity"], 0) + 1
    counts["total"] = len(findings)
    return {
        "version": "v2",
        "scannedAt": datetime.now(timezone.utc).isoformat(),
        "repoRoot": str(root),
        "summary": counts,
        "nodeCount": len(nodes),
        "findings": findings,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Audit opt-in artifact graph metadata")
    parser.add_argument("--repo", default=".", help="Repository root")
    args = parser.parse_args()
    report = scan(Path(args.repo))
    print(json.dumps(report, ensure_ascii=False, indent=2))
    if report["summary"].get("blocker", 0):
        raise SystemExit(1)


if __name__ == "__main__":
    main()
