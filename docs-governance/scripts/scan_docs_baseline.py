#!/usr/bin/env python3
"""Scan the minimal, project-agnostic docs governance baseline."""

from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path

README_NAMES = ("README.md", "readme.md")
SECTION_ALIASES = {
    "owns": ("## Owns", "## 职责", "## 拥有"),
    "must_not_own": ("## Must Not Own", "## 不负责", "## 不应拥有"),
    "entry": ("## Read Next", "## Homes", "## 下一步阅读", "## 使用方式", "## 入口"),
}


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


def _has_any(text: str, aliases: tuple[str, ...]) -> bool:
    lower = text.lower()
    return any(alias.lower() in lower for alias in aliases)


def scan(repo: Path) -> dict:
    root = repo.resolve()
    docs = root / "docs"
    findings: list[dict] = []
    layers: list[dict] = []

    if not docs.is_dir():
        findings.append(_finding(
            "DOCS_ROOT_ABSENT", "info", docs,
            "repository has no docs/ directory",
            "create docs/ only when durable documentation routing or authority is needed",
        ))
    else:
        docs_readme = docs / "README.md"
        if not docs_readme.is_file():
            findings.append(_finding(
                "DOCS_ROUTER_MISSING", "warn", docs_readme,
                "docs/ exists without docs/README.md",
                "add the thinnest repository docs router",
            ))

        for child in sorted(p for p in docs.iterdir() if p.is_dir() and not p.name.startswith(".")):
            markdown = [p for p in child.rglob("*.md") if p.is_file()]
            if not markdown:
                continue
            readme = next((child / name for name in README_NAMES if (child / name).is_file()), None)
            record = {"layer": child.name, "markdownFiles": len(markdown), "readme": str(readme) if readme else None}
            layers.append(record)
            if readme is None:
                severity = "warn" if len(markdown) >= 2 else "info"
                findings.append(_finding(
                    "DOCS_LAYER_README_MISSING", severity, child,
                    f"durable docs layer has {len(markdown)} Markdown file(s) but no README router",
                    "add a thin layer README when it materially improves ownership and entry routing",
                ))
                continue
            text = readme.read_text(encoding="utf-8", errors="ignore")
            missing = [name for name, aliases in SECTION_ALIASES.items() if not _has_any(text, aliases)]
            if missing:
                findings.append(_finding(
                    "DOCS_LAYER_CONTRACT_THIN", "info", readme,
                    "layer README may be missing: " + ", ".join(missing),
                    "state ownership, nearest non-ownership boundary, and current entry points without boilerplate",
                ))

    counts = {"blocker": 0, "warn": 0, "info": 0}
    for item in findings:
        counts[item["severity"]] = counts.get(item["severity"], 0) + 1
    counts["total"] = len(findings)
    return {
        "version": "v2",
        "scannedAt": datetime.now(timezone.utc).isoformat(),
        "repoRoot": str(root),
        "summary": counts,
        "layers": layers,
        "findings": findings,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Scan minimal docs governance baseline")
    parser.add_argument("--repo", default=".", help="Repository root")
    args = parser.parse_args()
    print(json.dumps(scan(Path(args.repo)), ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
