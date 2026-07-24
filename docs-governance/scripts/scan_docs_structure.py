#!/usr/bin/env python3
"""Report earned-shape and identity review signals without moving files."""

from __future__ import annotations

import argparse
import json
import re
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path

SKIP_DIRS = {".git", "node_modules", "dist", "build", ".next", ".cache", "target", ".venv", "venv", "__pycache__"}
IDENTITY_RE = re.compile(r"^(doc_id|key)\s*:\s*['\"]?([^'\"#\n]+)", re.MULTILINE)
AUTHORITY_HEADINGS = ("## Owns", "## Must Not Own")
TYPE_AXIS = {"states", "rules", "permissions", "metrics", "glossary", "domain", "enumerations", "api", "reports"}


def _finding(rule: str, severity: str, path: Path, summary: str, fix: str, evidence: list[str] | None = None) -> dict:
    return {
        "id": f"{rule}::{path.as_posix()}",
        "severity": severity,
        "ruleId": rule,
        "path": str(path),
        "summary": summary,
        "evidence": evidence or [path.as_posix()],
        "fixHint": fix,
    }


def _visible_dirs(path: Path) -> list[Path]:
    return sorted(p for p in path.iterdir() if p.is_dir() and not p.name.startswith(".") and p.name not in SKIP_DIRS)


def _md_files(path: Path, recursive: bool = False) -> list[Path]:
    iterator = path.rglob("*.md") if recursive else path.glob("*.md")
    return sorted(p for p in iterator if p.is_file())


def _stem_prefix(stem: str) -> str | None:
    parts = [p for p in re.split(r"[-_.]+", stem.lower()) if p]
    if len(parts) < 2:
        return None
    prefix = parts[0]
    if prefix in {"readme", "index", "overview", "template"} or prefix.isdigit() or len(prefix) < 3:
        return None
    return prefix


def scan(repo: Path) -> dict:
    root = repo.resolve()
    docs = root / "docs"
    findings: list[dict] = []
    identities: dict[tuple[str, str], Path] = {}

    if not docs.is_dir():
        return {
            "version": "v2",
            "scannedAt": datetime.now(timezone.utc).isoformat(),
            "repoRoot": str(root),
            "summary": {"blocker": 0, "warn": 0, "info": 0, "total": 0},
            "findings": [],
            "skipped": True,
            "reason": "docs/ does not exist",
        }

    for path in sorted(p for p in docs.rglob("*") if p.is_dir() and p.name not in SKIP_DIRS and not p.name.startswith(".")):
        rel_parts = path.relative_to(docs).parts
        depth = len(rel_parts)
        direct_md = _md_files(path)
        child_dirs = _visible_dirs(path)
        all_files = [p for p in path.rglob("*") if p.is_file()]

        if path != docs and not all_files:
            findings.append(_finding(
                "DOCS_EMPTY_PARTITION", "warn", path,
                "empty docs partition has no routing or authority value",
                "remove the pre-created taxonomy or add the real artifact only when the boundary is needed",
            ))

        business_md = [p for p in direct_md if p.name.lower() not in {"readme.md", "_template.md", "template.md"}]
        if path != docs and len(business_md) == 1 and not child_dirs:
            findings.append(_finding(
                "DOCS_SINGLE_ARTIFACT_PARTITION", "info", path,
                f"partition contains one ordinary Markdown artifact: {business_md[0].name}",
                "keep it only for a real ownership, security, retention, lifecycle, generation, or reader boundary; otherwise flatten",
            ))

        if depth > 3:
            findings.append(_finding(
                "DOCS_DEEP_PARTITION_REVIEW", "info", path,
                f"docs nesting depth is {depth}",
                "confirm every level represents a durable boundary rather than a pre-built taxonomy",
            ))

        if len(business_md) >= 5 and not (path / "README.md").is_file():
            findings.append(_finding(
                "DOCS_CHILD_README_MISSING", "info", path,
                f"directory contains {len(business_md)} direct Markdown artifacts without a local router",
                "add a concise README only when it improves routing; do not create subdirectories solely for volume",
            ))

        prefixes = Counter(filter(None, (_stem_prefix(p.stem) for p in business_md)))
        for prefix, count in sorted(prefixes.items()):
            if count >= 3:
                findings.append(_finding(
                    "DOCS_REPEATED_PREFIX_CLUSTER", "info", path,
                    f"{count} direct artifacts share prefix '{prefix}'",
                    "review whether the cluster has a durable partition boundary; repeated names alone do not authorize a move",
                    evidence=[p.name for p in business_md if _stem_prefix(p.stem) == prefix],
                ))

        if child_dirs:
            child_names = {p.name.lower() for p in child_dirs}
            type_like = child_names & TYPE_AXIS
            domain_like = child_names - TYPE_AXIS
            if type_like and domain_like:
                findings.append(_finding(
                    "DOCS_MIXED_AXIS_REVIEW", "info", path,
                    "sibling partitions appear to mix artifact-type and domain axes",
                    "prefer one primary organizational axis at this level or document the genuine exception",
                    evidence=sorted(child_names),
                ))

        if path != docs and (path / "README.md").is_file():
            text = (path / "README.md").read_text(encoding="utf-8", errors="ignore")
            if all(heading in text for heading in AUTHORITY_HEADINGS) and depth >= 2:
                findings.append(_finding(
                    "DOCS_REDUNDANT_CHILD_AUTHORITY", "info", path / "README.md",
                    "child README restates a full authority contract",
                    "keep child README focused on local scope, contents, read order, and genuine exceptions; inherit authority from the parent layer",
                ))

    for path in sorted(docs.rglob("*.md")):
        text = path.read_text(encoding="utf-8", errors="ignore")
        for kind, value in IDENTITY_RE.findall(text):
            identity = value.strip()
            key = (kind, identity)
            if key in identities:
                findings.append(_finding(
                    "DOCS_EXPLICIT_IDENTITY_DUPLICATE", "blocker", path,
                    f"duplicate explicit {kind}: {identity}",
                    "assign a unique stable identity or remove unnecessary metadata",
                    evidence=[str(identities[key]), str(path)],
                ))
            else:
                identities[key] = path

    counts = {"blocker": 0, "warn": 0, "info": 0}
    for item in findings:
        counts[item["severity"]] = counts.get(item["severity"], 0) + 1
    counts["total"] = len(findings)
    return {
        "version": "v2",
        "scannedAt": datetime.now(timezone.utc).isoformat(),
        "repoRoot": str(root),
        "summary": counts,
        "explicitIdentityCount": len(identities),
        "findings": findings,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Scan docs earned-shape and identity signals")
    parser.add_argument("--repo", default=".", help="Repository root")
    args = parser.parse_args()
    report = scan(Path(args.repo))
    print(json.dumps(report, ensure_ascii=False, indent=2))
    if report["summary"].get("blocker", 0):
        raise SystemExit(1)


if __name__ == "__main__":
    main()
