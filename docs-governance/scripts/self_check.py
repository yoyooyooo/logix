#!/usr/bin/env python3
"""Validate the packaged skill without third-party dependencies."""

from __future__ import annotations

import json
import py_compile
from pathlib import Path


def main() -> None:
    root = Path(__file__).resolve().parents[1]
    required = [
        root / "SKILL.md",
        root / "agents" / "openai.yaml",
        root / "references" / "docs-layer-model.md",
        root / "references" / "elastic-shape-and-identity.md",
        root / "evals" / "evals.json",
    ]
    missing = [str(path.relative_to(root)) for path in required if not path.is_file()]
    if missing:
        raise SystemExit("missing required files: " + ", ".join(missing))

    for path in sorted((root / "scripts").glob("*.py")):
        py_compile.compile(str(path), doraise=True)

    data = json.loads((root / "evals" / "evals.json").read_text(encoding="utf-8"))
    if data.get("skill_name") != "docs-governance":
        raise SystemExit("evals skill_name mismatch")
    ids = [item.get("id") for item in data.get("evals", [])]
    if len(ids) != len(set(ids)):
        raise SystemExit("duplicate eval ids")

    skill = (root / "SKILL.md").read_text(encoding="utf-8")
    for pointer in (
        "references/docs-layer-model.md",
        "references/elastic-shape-and-identity.md",
        "references/current-vs-future.md",
        "scripts/run_docs_audit.py",
    ):
        if pointer not in skill:
            raise SystemExit(f"SKILL.md missing pointer: {pointer}")

    print(json.dumps({"ok": True, "compiledScripts": len(list((root / 'scripts').glob('*.py'))), "evalCount": len(ids)}, ensure_ascii=False))


if __name__ == "__main__":
    main()
