#!/usr/bin/env python3
"""Audit explicit repository-path anchors written in Markdown code spans."""

from __future__ import annotations

import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path

PREFIXES = ("src/", "app/", "apps/", "packages/", "services/", "libs/", "crates/", "bins/", "scripts/", "migrations/", "fixtures/", "schemas/", "proto/", "tests/")
CODE_RE = re.compile(r"`([^`\n]+)`")


def scan(repo: Path) -> dict:
    root = repo.resolve()
    docs = root / "docs"
    findings: list[dict] = []
    checked = 0
    if docs.exists():
        for path in sorted(docs.rglob("*.md")):
            text = path.read_text(encoding="utf-8", errors="ignore")
            for raw in CODE_RE.findall(text):
                value = raw.strip().rstrip(".:")
                if not value.startswith(PREFIXES):
                    continue
                prefix = re.split(r"[\*\?\[]", value, maxsplit=1)[0].rstrip("/")
                if not prefix:
                    continue
                checked += 1
                target = root / prefix
                if not target.exists():
                    findings.append({
                        "id": f"DOCS_SOURCE_ANCHOR_MISSING::{path.relative_to(root).as_posix()}::{value}",
                        "severity": "warn",
                        "ruleId": "DOCS_SOURCE_ANCHOR_MISSING",
                        "path": str(path),
                        "summary": f"documented repository path does not exist: {value}",
                        "evidence": [str(target)],
                        "fixHint": "repair the anchor, label it as future/example, lower the claim, or remove stale prose",
                    })
    counts = {"blocker": 0, "warn": 0, "info": 0}
    for item in findings:
        counts[item["severity"]] = counts.get(item["severity"], 0) + 1
    counts["total"] = len(findings)
    return {
        "version": "v2",
        "scannedAt": datetime.now(timezone.utc).isoformat(),
        "repoRoot": str(root),
        "checkedAnchors": checked,
        "summary": counts,
        "findings": findings,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Audit repository path anchors in docs")
    parser.add_argument("--repo", default=".", help="Repository root")
    args = parser.parse_args()
    print(json.dumps(scan(Path(args.repo)), ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
