#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Iterable

ROOT = Path(__file__).resolve().parent
ROUTING_DOC = ROOT / 'docs' / 'perf' / '07-optimization-backlog-and-routing.md'

TABLE_HEADER = '| ID | 类别 | 问题 | 预期收益 | 成本 | 冲突风险 | 并行策略 | API 变动 |'


@dataclass
class TaskInfo:
    task_id: str
    kind: str
    problem: str
    expected_benefit: str
    cost: str
    conflict_level: str
    parallel_strategy: str
    api_change: str
    details: str
    files: list[str]
    verify_commands: list[str]
    next_gate: list[str]
    requires_worktree: bool
    parallelizable: bool


def _read_doc() -> str:
    return ROUTING_DOC.read_text(encoding='utf-8')


def _parse_table(text: str) -> dict[str, dict[str, str]]:
    lines = text.splitlines()
    try:
        start = lines.index(TABLE_HEADER)
    except ValueError as exc:
        raise SystemExit(f'未找到 backlog 总表表头: {ROUTING_DOC}') from exc

    rows: dict[str, dict[str, str]] = {}
    for line in lines[start + 2 :]:
        if not line.startswith('|'):
            break
        cols = [c.strip() for c in line.strip().strip('|').split('|')]
        if len(cols) != 8:
            continue
        task_id = cols[0].strip('`')
        rows[task_id] = {
            'task_id': task_id,
            'kind': cols[1],
            'problem': cols[2],
            'expected_benefit': cols[3],
            'cost': cols[4],
            'conflict_level': cols[5],
            'parallel_strategy': cols[6],
            'api_change': cols[7],
        }
    return rows


def _extract_section(text: str, task_id: str) -> str:
    pattern = re.compile(rf'^### `({re.escape(task_id)})`.+?$(.*?)(?=^### `|^## |\Z)', re.M | re.S)
    match = pattern.search(text)
    if not match:
        return ''
    return match.group(0).strip()


_FILE_RE = re.compile(r'^- `([^`]+)`$', re.M)


def _extract_files(section: str) -> list[str]:
    marker = '主要落点：'
    idx = section.find(marker)
    if idx < 0:
        return []
    tail = section[idx + len(marker) :]
    stop = re.search(r'\n(?:并行/串行：|API 变动：|实施成本：|预期收益：|架构缺陷：)', tail)
    body = tail[: stop.start()] if stop else tail
    return _FILE_RE.findall(body)


def _default_verify_commands(task_id: str, files: list[str]) -> list[str]:
    if task_id == 'R-1':
        return [
            'pnpm -C packages/logix-core typecheck:test',
            'pnpm -C packages/logix-react typecheck:test',
            'pnpm -C packages/logix-react test -- --project browser --maxWorkers 1 test/browser/perf-boundaries/txn-lanes.test.tsx',
            'pnpm perf collect -- --profile quick --files test/browser/perf-boundaries/txn-lanes.test.tsx --out specs/103-effect-v4-forward-cutover/perf/<name>.json',
        ]
    if task_id == 'S-2':
        return [
            'pnpm -C packages/logix-react typecheck:test',
            'pnpm -C packages/logix-react test -- --project browser test/browser/watcher-browser-perf.test.tsx',
            'pnpm perf collect -- --profile quick --files test/browser/watcher-browser-perf.test.tsx --out specs/103-effect-v4-forward-cutover/perf/<name>.json',
        ]
    if task_id == 'F-1':
        return [
            'python3 fabfile.py list-tasks',
            'python3 fabfile.py show-task F-1',
            'python3 fabfile.py plan-parallel',
        ]
    if task_id == 'S-4':
        return [
            'pnpm -C packages/logix-react test -- --project browser test/browser/perf-boundaries/runtime-store-no-tearing.test.tsx',
            'pnpm perf collect -- --profile quick --files test/browser/perf-boundaries/runtime-store-no-tearing.test.tsx --out specs/103-effect-v4-forward-cutover/perf/<name>.json',
        ]
    if task_id == 'S-3':
        return [
            'pnpm -C packages/logix-react typecheck:test',
            'pnpm perf collect -- --profile quick --files test/browser/perf-boundaries/converge-steps.test.tsx --out specs/103-effect-v4-forward-cutover/perf/<name>.json',
        ]
    if task_id == 'S-1':
        return [
            'pnpm perf collect -- --profile quick --files test/browser/perf-boundaries/external-store-ingest.test.tsx --out specs/103-effect-v4-forward-cutover/perf/<name>.json',
        ]
    return [f'# TODO: 为 {task_id} 补验证命令']


def _default_next_gate(task_id: str) -> list[str]:
    mapping = {
        'R-1': ['urgent.p95<=50ms default/off', 'docs/perf 日期记录 + 单独提交'],
        'S-2': ['语义更清楚且 current-head 可比性更强', 'docs/perf 日期记录 + 单独提交'],
        'F-1': ['fabfile.py 最小命令可用', 'docs/perf 日期记录 + 单独提交'],
        'S-4': ['full-matrix refresh 不再被 runtime-store-no-tearing 挡住', 'docs/perf 日期记录 + 单独提交'],
        'S-3': ['auto-only decision gate 通过', 'docs/perf 日期记录 + 单独提交'],
        'S-1': ['5 轮 audit 通过到 512', 'docs/perf 日期记录 + 单独提交'],
    }
    return mapping.get(task_id, ['docs/perf 日期记录 + 单独提交'])


def _requires_worktree(task_id: str, parallel_strategy: str, section: str) -> bool:
    return task_id in {'S-2', 'R-1'} or '独立 worktree' in parallel_strategy or '独立 worktree' in section


def _parallelizable(task_id: str, parallel_strategy: str) -> bool:
    return task_id not in {'R-2'} and ('可并行' in parallel_strategy or task_id in {'S-2', 'F-1', 'S-4', 'S-3', 'S-1'})


def load_tasks() -> dict[str, TaskInfo]:
    text = _read_doc()
    rows = _parse_table(text)
    tasks: dict[str, TaskInfo] = {}
    for task_id, row in rows.items():
        section = _extract_section(text, task_id)
        files = _extract_files(section)
        tasks[task_id] = TaskInfo(
            **row,
            details=section,
            files=files,
            verify_commands=_default_verify_commands(task_id, files),
            next_gate=_default_next_gate(task_id),
            requires_worktree=_requires_worktree(task_id, row['parallel_strategy'], section),
            parallelizable=_parallelizable(task_id, row['parallel_strategy']),
        )
    return tasks


def cmd_list_tasks(tasks: dict[str, TaskInfo]) -> int:
    for task in tasks.values():
        print(f"{task.task_id}\t{task.kind}\t{task.problem}\tparallel={str(task.parallelizable).lower()}\tworktree={str(task.requires_worktree).lower()}")
    return 0


def cmd_show_task(tasks: dict[str, TaskInfo], task_id: str, json_mode: bool) -> int:
    task = tasks.get(task_id)
    if not task:
        print(f'未找到任务: {task_id}', file=sys.stderr)
        return 1
    if json_mode:
        print(json.dumps(asdict(task), ensure_ascii=False, indent=2))
        return 0
    print(f'ID: {task.task_id}')
    print(f'类别: {task.kind}')
    print(f'问题: {task.problem}')
    print(f'收益: {task.expected_benefit}')
    print(f'成本: {task.cost}')
    print(f'冲突风险: {task.conflict_level}')
    print(f'并行策略: {task.parallel_strategy}')
    print(f'需要 worktree: {task.requires_worktree}')
    print(f'可并行: {task.parallelizable}')
    print('主要落点:')
    for item in task.files:
        print(f'- {item}')
    print('验证命令:')
    for item in task.verify_commands:
        print(f'- {item}')
    print('下一关口:')
    for item in task.next_gate:
        print(f'- {item}')
    if task.details:
        print('\n任务详情:')
        print(task.details)
    return 0


def _current_parallel_group(tasks: dict[str, TaskInfo]) -> Iterable[TaskInfo]:
    preferred = ['R-1', 'S-2', 'F-1', 'S-4']
    for task_id in preferred:
        task = tasks.get(task_id)
        if task is not None:
            yield task


def cmd_plan_parallel(tasks: dict[str, TaskInfo], json_mode: bool) -> int:
    selected = list(_current_parallel_group(tasks))
    if json_mode:
        print(json.dumps([asdict(task) for task in selected], ensure_ascii=False, indent=2))
        return 0
    print('当前建议并行组:')
    for task in selected:
        print(f'- {task.task_id}: {task.problem}')
        print(f'  kind={task.kind} conflict={task.conflict_level} worktree={str(task.requires_worktree).lower()}')
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description='Perf backlog routing fabfile')
    sub = parser.add_subparsers(dest='command', required=True)

    sub.add_parser('list-tasks', help='列出当前 backlog 任务')

    show = sub.add_parser('show-task', help='查看单个任务详情')
    show.add_argument('task_id')
    show.add_argument('--json', action='store_true')

    plan = sub.add_parser('plan-parallel', help='输出当前推荐并行组')
    plan.add_argument('--json', action='store_true')

    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    tasks = load_tasks()
    if args.command == 'list-tasks':
        return cmd_list_tasks(tasks)
    if args.command == 'show-task':
        return cmd_show_task(tasks, args.task_id, args.json)
    if args.command == 'plan-parallel':
        return cmd_plan_parallel(tasks, args.json)
    parser.error(f'未知命令: {args.command}')
    return 2


if __name__ == '__main__':
    raise SystemExit(main())
