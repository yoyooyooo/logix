#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

sql_escape() {
  printf "%s" "$1" | sed "s/'/''/g"
}

default_global_db_path() {
  printf "%s/.refactor-pr-ci-loop/state/shared-tasks.db" "$HOME"
}

resolve_legacy_repo_db_path() {
  local common_git_dir
  common_git_dir="$(git rev-parse --git-common-dir 2>/dev/null || true)"
  if [[ -n "$common_git_dir" && "$common_git_dir" == */.git ]]; then
    local repo_root="${common_git_dir%/.git}"
    printf "%s/.codex/skills/refactor-pr-ci-loop/state/shared-tasks.db" "$repo_root"
  fi
}

resolve_db_path() {
  if [[ -n "${REFACTOR_TASK_STATE_DB:-}" ]]; then
    printf "%s" "${REFACTOR_TASK_STATE_DB}"
    return
  fi

  default_global_db_path
}

usage() {
  cat <<'EOF'
用法：
  refactor-task-state.sh init
  refactor-task-state.sh claim <task-key> <summary>
  refactor-task-state.sh check <task-key>
  refactor-task-state.sh set <task-key> <status> [note]
  refactor-task-state.sh list [active|all]

状态建议：
  claimed | in_progress | review | blocked | done | merged | cancelled

说明：
  - 默认状态库：~/.refactor-pr-ci-loop/state/shared-tasks.db
  - 可通过环境变量 REFACTOR_TASK_STATE_DB 覆盖。
EOF
}

command -v sqlite3 >/dev/null 2>&1 || {
  echo "[refactor-task-state] 缺少 sqlite3，请先安装。" >&2
  exit 1
}

DB_PATH="$(resolve_db_path)"
mkdir -p "$(dirname "$DB_PATH")"

migrate_legacy_repo_db_if_needed() {
  # 显式指定 DB 时不做自动迁移。
  if [[ -n "${REFACTOR_TASK_STATE_DB:-}" ]]; then
    return
  fi

  # 目标已存在，认为已完成迁移或已在使用。
  if [[ -f "$DB_PATH" ]]; then
    return
  fi

  local legacy_path
  legacy_path="$(resolve_legacy_repo_db_path)"
  if [[ -z "$legacy_path" || ! -f "$legacy_path" ]]; then
    return
  fi

  if sqlite3 -cmd ".timeout 10000" "$legacy_path" ".backup '$DB_PATH'" >/dev/null 2>&1; then
    echo "[refactor-task-state] migrated legacy db -> $DB_PATH"
    echo "[refactor-task-state] legacy db kept at: $legacy_path"
  fi
}

init_db() {
  sqlite3 -cmd ".timeout 10000" "$DB_PATH" >/dev/null <<'SQL'
PRAGMA journal_mode=WAL;
PRAGMA synchronous=NORMAL;
CREATE TABLE IF NOT EXISTS tasks (
  task_key TEXT PRIMARY KEY,
  status TEXT NOT NULL,
  summary TEXT NOT NULL,
  owner TEXT NOT NULL,
  worktree TEXT NOT NULL,
  branch TEXT NOT NULL,
  pr_ref TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
SQL
}

is_active_status() {
  case "$1" in
    claimed|in_progress|review|blocked) return 0 ;;
    *) return 1 ;;
  esac
}

now_utc() {
  date -u +"%Y-%m-%dT%H:%M:%SZ"
}

current_branch() {
  git branch --show-current 2>/dev/null || echo "detached"
}

current_worktree() {
  git rev-parse --show-toplevel 2>/dev/null || pwd
}

migrate_legacy_repo_db_if_needed
init_db

cmd="${1:-}"
case "$cmd" in
  init)
    echo "[refactor-task-state] initialized: $DB_PATH"
    ;;
  claim)
    [[ $# -ge 3 ]] || {
      usage
      exit 1
    }
    key="$2"
    summary="$3"

    key_esc="$(sql_escape "$key")"
    existing="$(sqlite3 -cmd ".timeout 10000" "$DB_PATH" "SELECT status || '|' || owner || '|' || worktree || '|' || branch || '|' || updated_at || '|' || summary FROM tasks WHERE task_key='${key_esc}' LIMIT 1;")"
    if [[ -n "$existing" ]]; then
      existing_status="${existing%%|*}"
      if is_active_status "$existing_status"; then
        echo "[refactor-task-state] conflict: task 已被占用"
        echo "task_key=$key"
        echo "existing=$existing"
        exit 2
      fi
    fi

    owner="${REFACTOR_TASK_OWNER:-${CODEX_AGENT_ID:-$(whoami)}}"
    worktree="$(current_worktree)"
    branch="$(current_branch)"
    now="$(now_utc)"
    owner_esc="$(sql_escape "$owner")"
    worktree_esc="$(sql_escape "$worktree")"
    branch_esc="$(sql_escape "$branch")"
    summary_esc="$(sql_escape "$summary")"
    now_esc="$(sql_escape "$now")"

    sqlite3 -cmd ".timeout 10000" "$DB_PATH" <<SQL
BEGIN IMMEDIATE;
INSERT INTO tasks(task_key, status, summary, owner, worktree, branch, pr_ref, notes, created_at, updated_at)
VALUES('${key_esc}', 'claimed', '${summary_esc}', '${owner_esc}', '${worktree_esc}', '${branch_esc}', '', '', '${now_esc}', '${now_esc}')
ON CONFLICT(task_key) DO UPDATE SET
  status='claimed',
  summary='${summary_esc}',
  owner='${owner_esc}',
  worktree='${worktree_esc}',
  branch='${branch_esc}',
  pr_ref='',
  notes='',
  updated_at='${now_esc}';
COMMIT;
SQL
    echo "[refactor-task-state] claimed task_key=$key owner=$owner branch=$branch"
    ;;
  check)
    [[ $# -ge 2 ]] || {
      usage
      exit 1
    }
    key_esc="$(sql_escape "$2")"
    row="$(sqlite3 -cmd ".timeout 10000" "$DB_PATH" "SELECT task_key, status, owner, branch, worktree, pr_ref, updated_at, summary, notes FROM tasks WHERE task_key='${key_esc}' LIMIT 1;")"
    if [[ -z "$row" ]]; then
      echo "[refactor-task-state] task not found: $2"
      exit 3
    fi
    echo "$row"
    ;;
  set)
    [[ $# -ge 4 ]] || {
      usage
      exit 1
    }
    key="$2"
    status="$3"
    note="${4:-}"
    key_esc="$(sql_escape "$key")"
    status_esc="$(sql_escape "$status")"
    note_esc="$(sql_escape "$note")"
    now_esc="$(sql_escape "$(now_utc)")"
    branch_esc="$(sql_escape "$(current_branch)")"
    worktree_esc="$(sql_escape "$(current_worktree)")"

    updated="$(sqlite3 -cmd ".timeout 10000" "$DB_PATH" <<SQL
BEGIN IMMEDIATE;
UPDATE tasks
SET status='${status_esc}',
    notes='${note_esc}',
    branch='${branch_esc}',
    worktree='${worktree_esc}',
    updated_at='${now_esc}'
WHERE task_key='${key_esc}';
SELECT changes();
COMMIT;
SQL
)"
    if [[ "${updated//$'\n'/}" == "0" ]]; then
      echo "[refactor-task-state] task not found: $key" >&2
      exit 3
    fi
    echo "[refactor-task-state] updated task_key=$key status=$status"
    ;;
  list)
    mode="${2:-active}"
    case "$mode" in
      active)
        sqlite3 -cmd ".timeout 10000" -header -column "$DB_PATH" \
          "SELECT task_key, status, owner, branch, substr(updated_at,1,19) AS updated_at, summary FROM tasks WHERE status IN ('claimed','in_progress','review','blocked') ORDER BY updated_at DESC;"
        ;;
      all)
        sqlite3 -cmd ".timeout 10000" -header -column "$DB_PATH" \
          "SELECT task_key, status, owner, branch, substr(updated_at,1,19) AS updated_at, summary FROM tasks ORDER BY updated_at DESC;"
        ;;
      *)
        usage
        exit 1
        ;;
    esac
    ;;
  *)
    usage
    exit 1
    ;;
esac
