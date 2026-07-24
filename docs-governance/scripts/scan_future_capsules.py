#!/usr/bin/env python3
"""Audit future routes and capability capsules without requiring a fixed shape."""

from __future__ import annotations

import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path

SHADOW_LAYERS = {"ssot", "standards", "adr", "architecture", "product", "protocols", "design", "security", "api", "data"}
AUTHORITY_RE = re.compile(r"^authority_scope\s*:\s*['\"]?([^'\"#\n]+)", re.MULTILINE)


def _finding(rule: str, severity: str, path: Path, summary: str, fix: str) -> dict:
    return {
        "id": f"{rule}::{path.as_posix()}",
        "severity": severity,
        "ruleId": rule,
        "path": str(path),
        "summary": summary,
        "evidence": [path.as_posix()],
        "fixHint": fix,
    }


def scan(repo: Path) -> dict:
    root = repo.resolve()
    future = root / "docs" / "roadmap" / "future"
    findings: list[dict] = []
    capsules: list[dict] = []
    if not future.is_dir():
        return {
            "version": "v2",
            "scannedAt": datetime.now(timezone.utc).isoformat(),
            "repoRoot": str(root),
            "summary": {"blocker": 0, "warn": 0, "info": 0, "total": 0},
            "findings": [],
            "capsules": [],
            "skipped": True,
            "reason": "docs/roadmap/future does not exist; flat Roadmap routes may be sufficient",
        }

    index = future / "README.md"
    index_text = index.read_text(encoding="utf-8", errors="ignore") if index.is_file() else ""
    for child in sorted(p for p in future.iterdir() if p.is_dir() and not p.name.startswith(".")):
        if child.name.lower() in SHADOW_LAYERS:
            findings.append(_finding(
                "FUTURE_SHADOW_AUTHORITY_LAYER", "blocker", child,
                f"future route duplicates authority layer name: {child.name}",
                "replace the shadow layer with capability-oriented routes or capsules",
            ))
            continue
        readme = child / "README.md"
        if not readme.is_file():
            findings.append(_finding(
                "FUTURE_CAPSULE_README_MISSING", "warn", child,
                "future capability directory has no README entry",
                "add a concise capability route or flatten the directory when one file is enough",
            ))
            continue
        text = readme.read_text(encoding="utf-8", errors="ignore")
        match = AUTHORITY_RE.search(text)
        authority = match.group(1).strip() if match else None
        if authority and authority != "future-candidate":
            findings.append(_finding(
                "FUTURE_CAPSULE_AUTHORITY_INVALID", "blocker", readme,
                f"future capsule declares authority_scope={authority!r}",
                "future routes must remain future-candidate until promoted into formal authority layers",
            ))
        if index.is_file() and f"{child.name}/README.md" not in index_text:
            findings.append(_finding(
                "FUTURE_CAPSULE_NOT_INDEXED", "info", child,
                "future capability is not linked from the local future index",
                "link it when the index is the declared entry route; otherwise document the alternate route",
            ))
        capsules.append({"path": str(readme.relative_to(root)), "authorityScope": authority})

    counts = {"blocker": 0, "warn": 0, "info": 0}
    for item in findings:
        counts[item["severity"]] = counts.get(item["severity"], 0) + 1
    counts["total"] = len(findings)
    return {
        "version": "v2",
        "scannedAt": datetime.now(timezone.utc).isoformat(),
        "repoRoot": str(root),
        "summary": counts,
        "findings": findings,
        "capsules": capsules,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Audit future capability routes")
    parser.add_argument("--repo", default=".", help="Repository root")
    args = parser.parse_args()
    report = scan(Path(args.repo))
    print(json.dumps(report, ensure_ascii=False, indent=2))
    if report["summary"].get("blocker", 0):
        raise SystemExit(1)


if __name__ == "__main__":
    main()
