#!/usr/bin/env python3
"""Run the generic docs-governance audit suite and print one JSON report."""

from __future__ import annotations

import argparse
import importlib.util
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from types import ModuleType


def _load(path: Path, name: str) -> ModuleType:
    spec = importlib.util.spec_from_file_location(name, path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"cannot load module: {path}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


def _counts(findings: list[dict]) -> dict:
    result = {"blocker": 0, "warn": 0, "info": 0}
    for item in findings:
        severity = str(item.get("severity", "info"))
        result[severity] = result.get(severity, 0) + 1
    result["total"] = len(findings)
    return result


def main() -> None:
    parser = argparse.ArgumentParser(description="Run docs governance audits")
    parser.add_argument("--repo", default=".", help="Repository root")
    args = parser.parse_args()

    scripts = Path(__file__).resolve().parent
    repo = Path(args.repo).resolve()
    modules = {
        "baseline": "scan_docs_baseline.py",
        "structure": "scan_docs_structure.py",
        "links": "scan_docs_links.py",
        "sourceAnchors": "scan_source_doc_anchors.py",
        "futureCapsules": "scan_future_capsules.py",
        "artifactGraph": "scan_artifact_graph.py",
    }
    reports = {name: _load(scripts / filename, f"docs_governance_{name}").scan(repo) for name, filename in modules.items()}
    findings: list[dict] = []
    for source, report in reports.items():
        for finding in report.get("findings", []):
            item = dict(finding)
            item.setdefault("source", source)
            findings.append(item)

    result = {
        "version": "v2",
        "scannedAt": datetime.now(timezone.utc).isoformat(),
        "repoRoot": str(repo),
        "summary": _counts(findings),
        "findings": findings,
        "reports": reports,
    }
    print(json.dumps(result, ensure_ascii=False, indent=2))
    if result["summary"].get("blocker", 0):
        raise SystemExit(1)


if __name__ == "__main__":
    main()
