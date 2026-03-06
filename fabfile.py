#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from collections import Counter
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any, Iterable

ROOT = Path(__file__).resolve().parent
ROUTING_DOC = ROOT / 'docs' / 'perf' / '07-optimization-backlog-and-routing.md'
WORKTREE_SERIES = ROOT.name.split('.', 1)[0]
WORKTREE_ROOT = ROOT.parent
AGENT_BRANCH_PREFIX = 'agent/'
DEFAULT_BASE_BRANCH = 'main'

TABLE_HEADER = '| ID | 类别 | 问题 | 预期收益 | 成本 | 冲突风险 | 并行策略 | API 变动 |'
SECTION_TITLE_RE = re.compile(r'^### `(?P<task_id>[^`]+)` · (?P<title>.+)$', re.M)
FILE_RE = re.compile(r'^- `([^`]+)`$', re.M)
TASK_TOKEN_RE = re.compile(r'(^|[./_-])([a-z])([0-9]+)(?=-|$)')
TRAILING_VERSION_RE = re.compile(r'-v(?P<version>[0-9]+)$')
SLUG_STOPWORDS = {
    'api',
    'and',
    'current',
    'for',
    'gate',
    'head',
    'only',
    'phase',
    'the',
    'to',
    'v',
}


@dataclass
class TaskInfo:
    priority: int
    task_id: str
    title: str
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


@dataclass
class WorktreeInfo:
    path: str
    basename: str
    head: str
    head_short: str
    branch: str | None
    branch_name: str | None
    detached: bool
    prunable: str | None
    dirty: bool
    dirty_count: int
    task_id: str | None
    category: str


@dataclass
class BranchDiffInfo:
    branch: str
    base_branch: str
    ahead_count: int
    behind_count: int
    head: str
    head_short: str
    committed_date: str
    author_name: str
    subject: str
    worktree: WorktreeInfo | None
    merge_ready: bool
    merge_ready_reasons: list[str]


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


def _extract_title(section: str, task_id: str, fallback: str) -> str:
    if not section:
        return fallback
    match = SECTION_TITLE_RE.search(section)
    if not match or match.group('task_id') != task_id:
        return fallback
    return match.group('title').replace('`', '').strip()


def _extract_files(section: str) -> list[str]:
    marker = '主要落点：'
    idx = section.find(marker)
    if idx < 0:
        return []
    tail = section[idx + len(marker) :]
    stop = re.search(r'\n(?:并行/串行：|API 变动：|实施成本：|预期收益：|架构缺陷：)', tail)
    body = tail[: stop.start()] if stop else tail
    return FILE_RE.findall(body)


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
            'python3 fabfile.py list_tasks',
            'python3 fabfile.py show_task F-1',
            'python3 fabfile.py plan_parallel',
            'python3 fabfile.py show_worktree_plan F-1',
            'python3 fabfile.py list_active_worktrees',
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
    for priority, (task_id, row) in enumerate(rows.items(), start=1):
        section = _extract_section(text, task_id)
        files = _extract_files(section)
        tasks[task_id] = TaskInfo(
            priority=priority,
            title=_extract_title(section, task_id, row['problem']),
            **row,
            details=section,
            files=files,
            verify_commands=_default_verify_commands(task_id, files),
            next_gate=_default_next_gate(task_id),
            requires_worktree=_requires_worktree(task_id, row['parallel_strategy'], section),
            parallelizable=_parallelizable(task_id, row['parallel_strategy']),
        )
    return tasks


def _run_git(args: list[str], cwd: Path = ROOT) -> str:
    result = subprocess.run(['git', *args], cwd=cwd, text=True, capture_output=True, check=False)
    if result.returncode != 0:
        message = result.stderr.strip() or result.stdout.strip() or 'unknown git error'
        raise SystemExit(f'git {" ".join(args)} 失败: {message}')
    return result.stdout


def _run_git_optional(args: list[str], cwd: Path = ROOT) -> subprocess.CompletedProcess[str]:
    return subprocess.run(['git', *args], cwd=cwd, text=True, capture_output=True, check=False)


def _resolve_base_branch() -> str:
    result = _run_git_optional(['symbolic-ref', '--short', 'refs/remotes/origin/HEAD'])
    if result.returncode != 0:
        return DEFAULT_BASE_BRANCH
    ref = result.stdout.strip()
    return ref.removeprefix('origin/') or DEFAULT_BASE_BRANCH


def _local_branch_exists(branch: str) -> bool:
    result = _run_git_optional(['show-ref', '--verify', '--quiet', f'refs/heads/{branch}'])
    return result.returncode == 0


def _resolve_branch_name(branch: str, worktrees: list[WorktreeInfo]) -> str | None:
    if _local_branch_exists(branch):
        return branch
    if not branch.startswith(AGENT_BRANCH_PREFIX) and _local_branch_exists(f'{AGENT_BRANCH_PREFIX}{branch}'):
        return f'{AGENT_BRANCH_PREFIX}{branch}'
    for worktree in worktrees:
        if worktree.basename == branch or worktree.basename.removeprefix(f'{WORKTREE_SERIES}.') == branch:
            if worktree.branch_name:
                return worktree.branch_name
    return None


def _infer_task_id(name: str | None) -> str | None:
    if not name:
        return None
    match = TASK_TOKEN_RE.search(name)
    if not match:
        return None
    return f'{match.group(2).upper()}-{int(match.group(3))}'


def _worktree_category(basename: str, task_id: str | None) -> str:
    suffix = basename.removeprefix(f'{WORKTREE_SERIES}.')
    if suffix.startswith('before-'):
        return 'snapshot'
    if task_id:
        return 'task'
    return 'other'


def _dirty_count(path: Path) -> int:
    if not path.exists():
        return -1
    result = subprocess.run(['git', '-C', str(path), 'status', '--short'], text=True, capture_output=True, check=False)
    if result.returncode != 0:
        return -1
    return len([line for line in result.stdout.splitlines() if line.strip()])


def load_active_worktrees() -> list[WorktreeInfo]:
    raw = _run_git(['worktree', 'list', '--porcelain'])
    entries: list[dict[str, Any]] = []
    current: dict[str, Any] = {}
    for line in raw.splitlines() + ['']:
        if not line:
            if current:
                entries.append(current)
                current = {}
            continue
        key, _, value = line.partition(' ')
        if key == 'detached':
            current['detached'] = True
        else:
            current[key] = value

    worktrees: list[WorktreeInfo] = []
    for entry in entries:
        path = Path(entry['worktree'])
        basename = path.name
        if not basename.startswith(f'{WORKTREE_SERIES}.'):
            continue
        is_snapshot = basename.removeprefix(f'{WORKTREE_SERIES}.').startswith('before-')
        branch = entry.get('branch')
        branch_name = branch.removeprefix('refs/heads/') if branch else None
        task_id = None if is_snapshot else _infer_task_id(branch_name or basename)
        dirty_count = _dirty_count(path)
        worktrees.append(
            WorktreeInfo(
                path=str(path),
                basename=basename,
                head=entry.get('HEAD', ''),
                head_short=entry.get('HEAD', '')[:8],
                branch=branch,
                branch_name=branch_name,
                detached=bool(entry.get('detached')),
                prunable=entry.get('prunable'),
                dirty=dirty_count > 0,
                dirty_count=dirty_count,
                task_id=task_id,
                category=_worktree_category(basename, task_id),
            ),
        )
    return sorted(worktrees, key=lambda item: item.basename)


def _task_token(task_id: str) -> str:
    return task_id.lower().replace('-', '')


def _slug_words(*parts: str) -> list[str]:
    words: list[str] = []
    for part in parts:
        normalized = re.sub(r'`([^`]+)`', r' \1 ', part)
        normalized = re.sub(r'([a-z0-9])([A-Z])', r'\1-\2', normalized)
        normalized = normalized.lower()
        for word in re.findall(r'[a-z0-9]+', normalized):
            if word in SLUG_STOPWORDS:
                continue
            words.append(word)
    deduped: list[str] = []
    seen: set[str] = set()
    for word in words:
        if word not in seen:
            deduped.append(word)
            seen.add(word)
    return deduped


def _canonical_slug_from_worktrees(task_id: str, worktrees: list[WorktreeInfo]) -> str | None:
    candidates: list[str] = []
    for worktree in worktrees:
        if worktree.task_id != task_id:
            continue
        source = worktree.branch_name.split('/')[-1] if worktree.branch_name else worktree.basename.removeprefix(f'{WORKTREE_SERIES}.')
        candidates.append(TRAILING_VERSION_RE.sub('', source))
    if not candidates:
        return None
    return Counter(candidates).most_common(1)[0][0]


def _derived_task_slug(task: TaskInfo) -> str:
    token = _task_token(task.task_id)
    words = [word for word in _slug_words(task.title, task.problem) if word != token]
    if not words:
        words = ['task']
    return '-'.join([token, *words[:6]])


def _occupied_same_task_slugs(task_id: str, worktrees: list[WorktreeInfo]) -> set[str]:
    occupied: set[str] = set()
    for worktree in worktrees:
        if worktree.task_id != task_id:
            continue
        if worktree.branch_name:
            occupied.add(worktree.branch_name.split('/')[-1])
        occupied.add(worktree.basename.removeprefix(f'{WORKTREE_SERIES}.'))
    return occupied


def _next_available_slug(base_slug: str, occupied: set[str]) -> tuple[str, int]:
    if base_slug not in occupied:
        return base_slug, 1
    version = 2
    while f'{base_slug}-v{version}' in occupied:
        version += 1
    return f'{base_slug}-v{version}', version


def _task_payload(task: TaskInfo, *, include_details: bool = False) -> dict[str, Any]:
    payload = {
        'priority': task.priority,
        'task_id': task.task_id,
        'title': task.title,
        'kind': task.kind,
        'problem': task.problem,
        'expected_benefit': task.expected_benefit,
        'cost': task.cost,
        'conflict_level': task.conflict_level,
        'parallel_strategy': task.parallel_strategy,
        'api_change': task.api_change,
        'files': task.files,
        'verify_commands': task.verify_commands,
        'next_gate': task.next_gate,
        'requires_worktree': task.requires_worktree,
        'parallelizable': task.parallelizable,
    }
    if include_details:
        payload['details'] = task.details
    return payload


def _worktree_payload(worktree: WorktreeInfo) -> dict[str, Any]:
    return {
        'basename': worktree.basename,
        'task_id': worktree.task_id,
        'category': worktree.category,
        'branch': worktree.branch_name,
        'head': worktree.head_short,
        'dirty': worktree.dirty,
        'dirty_count': worktree.dirty_count,
        'detached': worktree.detached,
        'prunable': worktree.prunable,
        'path': worktree.path,
    }


def _worktree_for_branch(branch: str, worktrees: list[WorktreeInfo]) -> WorktreeInfo | None:
    for worktree in worktrees:
        if worktree.branch_name == branch:
            return worktree
    return None


def _branch_diff_info(branch: str, worktrees: list[WorktreeInfo], *, base_branch: str | None = None) -> BranchDiffInfo:
    target_base = base_branch or _resolve_base_branch()
    behind_raw, ahead_raw = _run_git(['rev-list', '--left-right', '--count', f'{target_base}...{branch}']).strip().split()
    head, head_short, committed_date, author_name, subject = _run_git(
        ['log', '-1', '--format=%H%x1f%h%x1f%cs%x1f%an%x1f%s', branch],
    ).strip().split('\x1f', 4)
    worktree = _worktree_for_branch(branch, worktrees)
    ahead_count = int(ahead_raw)
    behind_count = int(behind_raw)
    merge_ready_reasons: list[str] = []
    if ahead_count != 1:
        merge_ready_reasons.append(f'相对 {target_base} 不是恰好多 1 个提交（ahead={ahead_count}）')
    if behind_count != 0:
        merge_ready_reasons.append(f'{target_base} 已领先 {behind_count} 个提交')
    if worktree is None:
        merge_ready_reasons.append('没有 active worktree，无法判定 clean')
    elif worktree.dirty_count < 0:
        merge_ready_reasons.append('worktree 状态不可读')
    elif worktree.dirty:
        merge_ready_reasons.append(f'worktree dirty_count={worktree.dirty_count}')
    return BranchDiffInfo(
        branch=branch,
        base_branch=target_base,
        ahead_count=ahead_count,
        behind_count=behind_count,
        head=head,
        head_short=head_short,
        committed_date=committed_date,
        author_name=author_name,
        subject=subject,
        worktree=worktree,
        merge_ready=not merge_ready_reasons,
        merge_ready_reasons=merge_ready_reasons,
    )


def _branch_diff_payload(diff: BranchDiffInfo) -> dict[str, Any]:
    return {
        'branch': diff.branch,
        'base_branch': diff.base_branch,
        'ahead_count': diff.ahead_count,
        'behind_count': diff.behind_count,
        'head': diff.head,
        'head_short': diff.head_short,
        'committed_date': diff.committed_date,
        'author_name': diff.author_name,
        'subject': diff.subject,
        'merge_ready': diff.merge_ready,
        'merge_ready_reasons': diff.merge_ready_reasons,
        'task_id': diff.worktree.task_id if diff.worktree else None,
        'worktree': _worktree_payload(diff.worktree) if diff.worktree else None,
    }


def _shared_file_conflicts(task: TaskInfo, tasks: dict[str, TaskInfo], worktrees: list[WorktreeInfo]) -> list[dict[str, Any]]:
    conflicts: list[dict[str, Any]] = []
    seen_task_ids: set[str] = set()
    target_files = set(task.files)
    for worktree in worktrees:
        other_task_id = worktree.task_id
        if not other_task_id or other_task_id == task.task_id or other_task_id in seen_task_ids:
            continue
        other_task = tasks.get(other_task_id)
        if not other_task:
            continue
        shared_files = sorted(target_files & set(other_task.files))
        if not shared_files:
            continue
        seen_task_ids.add(other_task_id)
        conflicts.append(
            {
                'task_id': other_task_id,
                'title': other_task.title,
                'shared_files': shared_files,
                'active_worktrees': [_worktree_payload(item) for item in worktrees if item.task_id == other_task_id],
            },
        )
    return conflicts


def _serial_constraints() -> list[dict[str, Any]]:
    return [
        {
            'rule_id': 's2-independent-worktree',
            'task_ids': ['S-2'],
            'reason': 'watcher benchmark 语义会污染 current-head 与 targeted 证据，任何并行推进都应独立 worktree。',
        },
        {
            'rule_id': 'r1-runtime-core-exclusive',
            'task_ids': ['R-1'],
            'reason': '任何新的 txnLanes runtime 重构都必须与 R-1 串行，避免同时触碰 ModuleRuntime impl/policy。',
        },
        {
            'rule_id': 'r2-blocked-by-r1',
            'task_ids': ['R-2'],
            'blocked_by': ['R-1'],
            'reason': '只有在 R-1 收益明确后，才决定是否启动 TxnLanePolicy API vNext。',
        },
    ]


def _parallel_groups(tasks: dict[str, TaskInfo]) -> list[dict[str, Any]]:
    definitions = [
        {
            'group_id': 'phase1-core',
            'phase': 'Phase 1',
            'status': 'active',
            'title': '主线 + 并行副线 + 自动化',
            'summary': '当前默认三线：R-1 主线、S-2 独立 worktree、副线自动化 F-1。',
            'task_ids': ['R-1', 'S-2', 'F-1'],
            'constraints': ['S-2 必须独立 worktree', 'F 线不触碰 runtime core'],
        },
        {
            'group_id': 'phase1-optional',
            'phase': 'Phase 1',
            'status': 'optional',
            'title': '可选第四线',
            'summary': '在主三线之外，可增开 S-5，但先限定在 react.strictSuspenseJitter test/browser import 范围。',
            'task_ids': ['S-5'],
            'constraints': ['只做 browser import / test harness 排障，不默认触碰 runtime'],
        },
        {
            'group_id': 'phase2-deferred',
            'phase': 'Phase 2',
            'status': 'blocked',
            'title': '等待 R-1 结论的后续项',
            'summary': 'R-2 只有在 R-1 收益确认后才有资格展开。',
            'task_ids': ['R-2'],
            'blocked_by': ['R-1'],
            'constraints': ['不与任何当前 runtime 主线并行'],
        },
    ]

    groups: list[dict[str, Any]] = []
    for definition in definitions:
        selected = [tasks[task_id] for task_id in definition['task_ids'] if task_id in tasks]
        missing_task_ids = [task_id for task_id in definition['task_ids'] if task_id not in tasks]
        groups.append(
            {
                **definition,
                'task_ids': [task.task_id for task in selected],
                'tasks': [_task_payload(task) for task in selected],
                'missing_task_ids': missing_task_ids,
            },
        )
    return groups


def cmd_list_tasks(tasks: dict[str, TaskInfo]) -> int:
    for task in tasks.values():
        print(
            f"p{task.priority}\t{task.task_id}\t{task.kind}\t{task.title}\tparallel={str(task.parallelizable).lower()}\tworktree={str(task.requires_worktree).lower()}",
        )
    return 0


def cmd_show_task(tasks: dict[str, TaskInfo], task_id: str, json_mode: bool) -> int:
    task = tasks.get(task_id)
    if not task:
        print(f'未找到任务: {task_id}', file=sys.stderr)
        return 1
    if json_mode:
        print(json.dumps(asdict(task), ensure_ascii=False, indent=2))
        return 0
    print(f'优先级: p{task.priority}')
    print(f'ID: {task.task_id}')
    print(f'标题: {task.title}')
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


def cmd_show_worktree_plan(tasks: dict[str, TaskInfo], worktrees: list[WorktreeInfo], task_id: str, json_mode: bool) -> int:
    task = tasks.get(task_id)
    if not task:
        print(f'未找到任务: {task_id}', file=sys.stderr)
        return 1

    canonical_slug = _canonical_slug_from_worktrees(task_id, worktrees)
    naming_source = 'active_worktree'
    if canonical_slug is None:
        canonical_slug = _derived_task_slug(task)
        naming_source = 'derived_from_task'
    suggested_slug, version = _next_available_slug(canonical_slug, _occupied_same_task_slugs(task_id, worktrees))
    same_task_worktrees = [_worktree_payload(item) for item in worktrees if item.task_id == task_id]
    shared_conflicts = _shared_file_conflicts(task, tasks, worktrees)

    conflict_notes = [
        f'doc.conflict_level={task.conflict_level}',
        f'doc.parallel_strategy={task.parallel_strategy}',
        'requires_worktree=true' if task.requires_worktree else 'requires_worktree=false',
    ]
    if same_task_worktrees:
        conflict_notes.append(
            '已有同任务 worktree 占用命名：'
            + ', '.join(item['basename'] for item in same_task_worktrees)
            + '；建议沿用 slug 并递增版本后缀。',
        )
    for conflict in shared_conflicts:
        shared = ', '.join(conflict['shared_files'])
        conflict_notes.append(f"与 {conflict['task_id']} 共享主要落点：{shared}")

    payload = {
        'task': _task_payload(task),
        'naming_source': naming_source,
        'canonical_slug': canonical_slug,
        'suggested_slug': suggested_slug,
        'suggested_branch': f'{AGENT_BRANCH_PREFIX}{suggested_slug}',
        'suggested_worktree_basename': f'{WORKTREE_SERIES}.{suggested_slug}',
        'suggested_worktree_path': str(WORKTREE_ROOT / f'{WORKTREE_SERIES}.{suggested_slug}'),
        'version': version,
        'same_task_active_worktrees': same_task_worktrees,
        'shared_file_conflicts': shared_conflicts,
        'conflict_notes': conflict_notes,
    }
    if json_mode:
        print(json.dumps(payload, ensure_ascii=False, indent=2))
        return 0

    print(f'任务: {task.task_id} · {task.title}')
    print(f'建议 branch: {payload["suggested_branch"]}')
    print(f'建议 worktree: {payload["suggested_worktree_path"]}')
    print(f'命名来源: {naming_source} ({canonical_slug})')
    print('冲突说明:')
    for note in conflict_notes:
        print(f'- {note}')
    if same_task_worktrees:
        print('同任务现有 worktree:')
        for item in same_task_worktrees:
            print(f'- {item["basename"]} ({item["branch"]}, dirty={item["dirty_count"]})')
    if shared_conflicts:
        print('共享落点冲突:')
        for item in shared_conflicts:
            print(f'- {item["task_id"]}: {", ".join(item["shared_files"])}')
    return 0


def cmd_list_active_worktrees(worktrees: list[WorktreeInfo], json_mode: bool) -> int:
    payload = [_worktree_payload(worktree) for worktree in worktrees]
    if json_mode:
        print(json.dumps(payload, ensure_ascii=False, indent=2))
        return 0
    print(f'当前 {WORKTREE_SERIES}.* worktree:')
    for item in payload:
        branch = item['branch'] or '(detached)'
        print(
            f"- {item['basename']} | task={item['task_id'] or '-'} | category={item['category']} | branch={branch} | head={item['head']} | dirty={item['dirty_count']}",
        )
        print(f"  path={item['path']}")
    return 0


def cmd_list_merge_ready(worktrees: list[WorktreeInfo], json_mode: bool) -> int:
    base_branch = _resolve_base_branch()
    candidates = [worktree for worktree in worktrees if worktree.branch_name and not worktree.detached]
    diffs = sorted(
        (_branch_diff_info(worktree.branch_name, worktrees, base_branch=base_branch) for worktree in candidates),
        key=lambda item: ((item.worktree.task_id or '') if item.worktree else '', item.branch),
    )
    ready = [diff for diff in diffs if diff.merge_ready]
    payload = {
        'base_branch': base_branch,
        'criteria': {
            'ahead_count': 1,
            'behind_count': 0,
            'worktree_clean': True,
        },
        'merge_ready_branches': [_branch_diff_payload(diff) for diff in ready],
        'scanned_branches': len(diffs),
    }
    if json_mode:
        print(json.dumps(payload, ensure_ascii=False, indent=2))
        return 0

    print(f'merge-ready satellites（base={base_branch}，ahead=1，behind=0，worktree clean）:')
    if not ready:
        print('- 当前没有满足条件的分支')
        print(f'- 已扫描 active satellite branches: {len(diffs)}')
        return 0
    for diff in ready:
        worktree = diff.worktree
        task_label = worktree.task_id if worktree and worktree.task_id else '-'
        print(
            f'- {diff.branch} | task={task_label} | head={diff.head_short} | latest={diff.committed_date} {diff.subject}',
        )
        if worktree:
            print(f'  worktree={worktree.basename} dirty={worktree.dirty_count} path={worktree.path}')
    return 0


def cmd_show_branch_diff(worktrees: list[WorktreeInfo], branch: str, json_mode: bool) -> int:
    resolved_branch = _resolve_branch_name(branch, worktrees)
    if not resolved_branch:
        print(f'未找到本地分支: {branch}', file=sys.stderr)
        return 1
    diff = _branch_diff_info(resolved_branch, worktrees)
    payload = _branch_diff_payload(diff)
    if json_mode:
        print(json.dumps(payload, ensure_ascii=False, indent=2))
        return 0

    print(f'base: {diff.base_branch}')
    print(f'branch: {diff.branch}')
    print(f'diff: ahead={diff.ahead_count} behind={diff.behind_count}')
    print(f'latest: {diff.head_short} {diff.committed_date} {diff.author_name} :: {diff.subject}')
    if diff.worktree:
        print(
            'worktree: '
            f'{diff.worktree.basename} | task={diff.worktree.task_id or "-"} | dirty={diff.worktree.dirty_count} | '
            f'path={diff.worktree.path}',
        )
    else:
        print('worktree: (no active worktree)')
    print(f'merge_ready: {str(diff.merge_ready).lower()}')
    if diff.merge_ready_reasons:
        print('not_ready_reasons:')
        for reason in diff.merge_ready_reasons:
            print(f'- {reason}')
    return 0


def cmd_plan_parallel(tasks: dict[str, TaskInfo], worktrees: list[WorktreeInfo], json_mode: bool) -> int:
    payload = {
        'source': str(ROUTING_DOC),
        'worktree_series': WORKTREE_SERIES,
        'groups': _parallel_groups(tasks),
        'serial_constraints': _serial_constraints(),
        'active_worktrees': [_worktree_payload(worktree) for worktree in worktrees],
    }
    if json_mode:
        print(json.dumps(payload, ensure_ascii=False, indent=2))
        return 0

    print('当前并行计划:')
    for group in payload['groups']:
        print(f"- [{group['status']}] {group['group_id']} ({group['phase']}) {group['title']}")
        print(f"  {group['summary']}")
        for task in group['tasks']:
            print(
                f"  - {task['task_id']}: {task['title']} | kind={task['kind']} | conflict={task['conflict_level']} | worktree={str(task['requires_worktree']).lower()}",
            )
        if group['missing_task_ids']:
            print(f"  - missing_from_source: {', '.join(group['missing_task_ids'])}")
    print('串行/隔离约束:')
    for constraint in payload['serial_constraints']:
        blocked = f" blocked_by={','.join(constraint.get('blocked_by', []))}" if constraint.get('blocked_by') else ''
        print(f"- {constraint['rule_id']} task_ids={','.join(constraint['task_ids'])}{blocked} :: {constraint['reason']}")
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description='Perf backlog routing fabfile')
    sub = parser.add_subparsers(dest='command', required=True)

    list_parser = sub.add_parser('list_tasks', aliases=['list-tasks'], help='列出当前 backlog 任务')
    list_parser.set_defaults(handler='list_tasks')

    show = sub.add_parser('show_task', aliases=['show-task'], help='查看单个任务详情')
    show.add_argument('task_id')
    show.add_argument('--json', action='store_true')
    show.set_defaults(handler='show_task')

    show_worktree = sub.add_parser('show_worktree_plan', help='按任务 ID 输出建议的 branch/worktree 名称与冲突说明')
    show_worktree.add_argument('task_id')
    show_worktree.add_argument('--json', action='store_true')
    show_worktree.set_defaults(handler='show_worktree_plan')

    list_worktrees = sub.add_parser('list_active_worktrees', help='列出当前 effect-v4.* worktree 状态')
    list_worktrees.add_argument('--json', action='store_true')
    list_worktrees.set_defaults(handler='list_active_worktrees')

    list_merge_ready = sub.add_parser(
        'list_merge_ready',
        aliases=['list-merge-ready'],
        help='列出相对主分支恰好多 1 个提交且 worktree clean 的 satellite branch',
    )
    list_merge_ready.add_argument('--json', action='store_true')
    list_merge_ready.set_defaults(handler='list_merge_ready')

    show_branch_diff = sub.add_parser(
        'show_branch_diff',
        aliases=['show-branch-diff'],
        help='展示某个 satellite branch 相对主分支的 ahead/behind 与最新提交信息',
    )
    show_branch_diff.add_argument('branch')
    show_branch_diff.add_argument('--json', action='store_true')
    show_branch_diff.set_defaults(handler='show_branch_diff')

    plan = sub.add_parser('plan_parallel', aliases=['plan-parallel'], help='输出当前推荐并行组')
    plan.add_argument('--json', action='store_true')
    plan.set_defaults(handler='plan_parallel')

    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    tasks = load_tasks()
    worktrees = load_active_worktrees()
    if args.handler == 'list_tasks':
        return cmd_list_tasks(tasks)
    if args.handler == 'show_task':
        return cmd_show_task(tasks, args.task_id, args.json)
    if args.handler == 'show_worktree_plan':
        return cmd_show_worktree_plan(tasks, worktrees, args.task_id, args.json)
    if args.handler == 'list_active_worktrees':
        return cmd_list_active_worktrees(worktrees, args.json)
    if args.handler == 'list_merge_ready':
        return cmd_list_merge_ready(worktrees, args.json)
    if args.handler == 'show_branch_diff':
        return cmd_show_branch_diff(worktrees, args.branch, args.json)
    if args.handler == 'plan_parallel':
        return cmd_plan_parallel(tasks, worktrees, args.json)
    parser.error(f'未知命令: {args.command}')
    return 2


if __name__ == '__main__':
    raise SystemExit(main())
