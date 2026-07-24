#!/usr/bin/env python3
"""Audit relative Markdown links under docs/."""

from __future__ import annotations

import argparse
import json
import re
import urllib.parse
from datetime import datetime, timezone
from pathlib import Path

LINK_RE = re.compile(r"(?<!!)\[[^\]]*\]\(([^)]+)\)")


def scan(repo: Path) -> dict:
    root = repo.resolve()
    docs = root / "docs"
    findings: list[dict] = []
    checked = 0
    if docs.exists():
        for path in sorted(docs.rglob("*.md")):
            text = path.read_text(encoding="utf-8", errors="ignore")
            for match in LINK_RE.finditer(text):
                raw = match.group(1).strip()
                target = raw.split()[0].strip("<>") if raw else ""
                if not target or target.startswith(("http://", "https://", "mailto:", "#")):
                    continue
                target = urllib.parse.unquote(target.split("#", 1)[0])
                if not target:
                    continue
                checked += 1
                resolved = (path.parent / target).resolve()
                if not resolved.exists():
                    findings.append({
                        "id": f"DOCS_RELATIVE_LINK_MISSING::{path.relative_to(root).as_posix()}::{target}",
                        "severity": "warn",
                        "ruleId": "DOCS_RELATIVE_LINK_MISSING",
                        "path": str(path),
                        "summary": f"relative Markdown link target does not exist: {target}",
                        "evidence": [raw, str(resolved)],
                        "fixHint": "repair the link, restore the retained artifact, or remove the stale route",
                    })
    counts = {"blocker": 0, "warn": 0, "info": 0}
    for item in findings:
        counts[item["severity"]] = counts.get(item["severity"], 0) + 1
    counts["total"] = len(findings)
    return {
        "version": "v2",
        "scannedAt": datetime.now(timezone.utc).isoformat(),
        "repoRoot": str(root),
        "checkedRelativeLinks": checked,
        "summary": counts,
        "findings": findings,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Audit relative Markdown links under docs/")
    parser.add_argument("--repo", default=".", help="Repository root")
    args = parser.parse_args()
    print(json.dumps(scan(Path(args.repo)), ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
