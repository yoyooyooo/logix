#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Iterable, Iterator


DEFAULT_IGNORE_DIRS = {
    ".git",
    "node_modules",
    "dist",
    "build",
    "coverage",
    ".turbo",
    ".next",
    ".vite",
    ".source",
}


@dataclass(frozen=True)
class FileStat:
    path: str
    lines: int


def iter_files(roots: Iterable[Path], exts: set[str], ignore_dirs: set[str]) -> Iterator[Path]:
    for root in roots:
        if root.is_file():
            if root.suffix.lower().lstrip(".") in exts:
                yield root
            continue

        for dirpath, dirnames, filenames in os.walk(root):
            dirnames[:] = [d for d in dirnames if d not in ignore_dirs]
            base = Path(dirpath)
            for name in filenames:
                p = base / name
                if p.suffix.lower().lstrip(".") in exts:
                    yield p


def count_lines(path: Path) -> int:
    try:
        data = path.read_bytes()
    except OSError:
        return 0
    if not data:
        return 0
    return data.count(b"\n") + (0 if data.endswith(b"\n") else 1)


def to_rel(path: Path, relative_to: Path) -> str:
    try:
        return str(path.relative_to(relative_to))
    except ValueError:
        return str(path)


def render_md(stats: list[FileStat], min_lines: int) -> str:
    lines = [f"### 超大文件清单（>= {min_lines} LOC）"]
    if not stats:
        lines.append("- （无）")
        return "\n".join(lines) + "\n"
    for s in stats:
        lines.append(f"- `{s.path}`（{s.lines}）")
    return "\n".join(lines) + "\n"


def main() -> int:
    parser = argparse.ArgumentParser(description="Scan large files by LOC for module decomposition planning.")
    parser.add_argument(
        "roots",
        nargs="*",
        default=["."],
        help="Roots to scan (files or directories). Defaults to current directory.",
    )
    parser.add_argument("--min-lines", type=int, default=1000, help="Minimum line count threshold (default: 1000).")
    parser.add_argument("--top", type=int, default=30, help="Max number of files to return (default: 30).")
    parser.add_argument(
        "--ext",
        action="append",
        default=["ts", "tsx"],
        help="File extensions to include (repeatable). Default: ts, tsx.",
    )
    parser.add_argument(
        "--ignore-dir",
        action="append",
        default=[],
        help="Directory names to ignore (repeatable). Defaults include node_modules/dist/build/etc.",
    )
    parser.add_argument(
        "--relative-to",
        default=".",
        help="Render paths relative to this directory (default: .).",
    )
    parser.add_argument(
        "--format",
        choices=("text", "json", "md"),
        default="text",
        help="Output format (default: text).",
    )

    args = parser.parse_args()
    min_lines: int = max(0, args.min_lines)
    top: int = max(1, args.top)
    exts = {e.lower().lstrip(".") for e in args.ext if e}
    ignore_dirs = set(DEFAULT_IGNORE_DIRS)
    ignore_dirs.update({d for d in args.ignore_dir if d})

    roots = [Path(r).resolve() for r in args.roots]
    relative_to = Path(args.relative_to).resolve()

    stats: list[FileStat] = []
    for p in iter_files(roots, exts, ignore_dirs):
        loc = count_lines(p)
        if loc < min_lines:
            continue
        stats.append(FileStat(path=to_rel(p.resolve(), relative_to), lines=loc))

    stats.sort(key=lambda s: s.lines, reverse=True)
    stats = stats[:top]

    if args.format == "json":
        payload = {
            "minLines": min_lines,
            "top": top,
            "extensions": sorted(exts),
            "ignoreDirs": sorted(ignore_dirs),
            "roots": [to_rel(p, Path.cwd()) for p in roots],
            "files": [asdict(s) for s in stats],
        }
        print(json.dumps(payload, ensure_ascii=False, indent=2))
        return 0

    if args.format == "md":
        print(render_md(stats, min_lines), end="")
        return 0

    # text
    if not stats:
        print(f"(no files >= {min_lines} LOC)")
        return 0
    for s in stats:
        print(f"{s.lines}\t{s.path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

