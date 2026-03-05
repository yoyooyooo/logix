#!/usr/bin/env bash

set -euo pipefail

logix_perf_guard_now_epoch() {
  date +%s
}

logix_perf_guard_now_iso() {
  date -u +"%Y-%m-%dT%H:%M:%SZ"
}

logix_perf_guard_job_elapsed_seconds() {
  local run_start_epoch="${PERF_RUN_START_EPOCH:-0}"
  local now_epoch
  now_epoch="$(logix_perf_guard_now_epoch)"
  if [ "$run_start_epoch" -le 0 ]; then
    echo 0
    return 0
  fi
  echo $((now_epoch - run_start_epoch))
}

logix_perf_guard_remaining_seconds() {
  local now_epoch
  now_epoch="$(logix_perf_guard_now_epoch)"
  local deadline_epoch="${PERF_SOFT_DEADLINE_EPOCH:-0}"
  if [ "$deadline_epoch" -le 0 ]; then
    echo 999999
    return 0
  fi
  echo $((deadline_epoch - now_epoch))
}

logix_perf_guard_append_timeline() {
  local message="$1"
  local timeline_file="${PERF_DEBUG_TIMELINE_FILE:-}"
  if [ -z "$timeline_file" ]; then
    return 0
  fi
  mkdir -p "$(dirname "$timeline_file")"
  echo "$message" >> "$timeline_file" || true
}

logix_perf_guard_log() {
  local level="$1"
  shift
  local message="$*"
  local iso_ts
  iso_ts="$(logix_perf_guard_now_iso)"
  local elapsed
  elapsed="$(logix_perf_guard_job_elapsed_seconds)"
  local remaining
  remaining="$(logix_perf_guard_remaining_seconds)"
  local line="[logix-perf][time-guard][${level}] ts=${iso_ts} elapsed=${elapsed}s remaining=${remaining}s ${message}"
  echo "$line"
  logix_perf_guard_append_timeline "$line"
}

logix_perf_guard_report_budget() {
  local phase="$1"
  logix_perf_guard_log "budget" "phase=${phase} softBudgetMin=${PERF_TIME_GUARD_SOFT_BUDGET_MINUTES:-n/a}"
}

logix_perf_guard_dump_state() {
  local phase="$1"
  local levels="${PERF_STEPS_LEVELS:-}"
  local levels_count="0"
  if [ -n "$levels" ]; then
    IFS=',' read -r -a _levels <<< "$levels"
    levels_count="${#_levels[@]}"
  fi
  logix_perf_guard_log "state" "phase=${phase} preset=${PERF_RUN_PRESET:-unknown} profile=${PERF_PROFILE:-unknown} stepsMode=${PERF_STEPS_MODE:-unknown} stepsCount=${levels_count} autoProbeTarget=${PERF_STEPS_AUTO_PROBE_TARGET:-head} diffMode=${PERF_DIFF_MODE:-triage} capacityFloorMin=${PERF_CAPACITY_FLOOR_MIN:-n/a}"
  if [ "${PERF_DEBUG_TRACE_SHOW_STEPS_LEVELS:-0}" = "1" ] && [ -n "$levels" ]; then
    logix_perf_guard_log "state" "phase=${phase} stepsLevels=${levels}"
  fi
}

logix_perf_guard_step_timeout_seconds() {
  local requested_seconds="$1"
  local reserve_seconds="${2:-900}"
  local min_timeout_seconds="${PERF_TIME_GUARD_MIN_TIMEOUT_SECONDS:-900}"
  local remaining
  remaining="$(logix_perf_guard_remaining_seconds)"
  local max_allowed=$((remaining - reserve_seconds))
  if [ "$max_allowed" -lt "$min_timeout_seconds" ]; then
    echo "$min_timeout_seconds"
    return 0
  fi
  if [ "$requested_seconds" -gt "$max_allowed" ]; then
    echo "$max_allowed"
    return 0
  fi
  echo "$requested_seconds"
}

logix_perf_guard_run_with_timeout() {
  local timeout_seconds="$1"
  local label="$2"
  shift
  shift
  local command_name="${1:-unknown}"
  local started_epoch
  started_epoch="$(logix_perf_guard_now_epoch)"
  logix_perf_guard_log "run-start" "label=${label} timeout=${timeout_seconds}s command=${command_name}"

  local rc
  set +e
  if command -v timeout >/dev/null 2>&1; then
    timeout "${timeout_seconds}s" "$@"
    rc=$?
  else
    "$@"
    rc=$?
  fi
  set -e

  local ended_epoch
  ended_epoch="$(logix_perf_guard_now_epoch)"
  local duration_seconds=$((ended_epoch - started_epoch))
  if [ "$rc" -eq 0 ]; then
    logix_perf_guard_log "run-end" "label=${label} rc=0 duration=${duration_seconds}s"
  elif [ "$rc" -eq 124 ]; then
    logix_perf_guard_log "run-timeout" "label=${label} rc=124 duration=${duration_seconds}s timeout=${timeout_seconds}s"
  else
    logix_perf_guard_log "run-fail" "label=${label} rc=${rc} duration=${duration_seconds}s"
  fi
  return "$rc"
}

logix_perf_guard_maybe_downgrade() {
  local env_out_file="$1"
  local phase="$2"
  local enable="${PERF_TIME_GUARD_ENABLE:-1}"
  if [ "$enable" != "1" ]; then
    return 0
  fi

  local remaining
  remaining="$(logix_perf_guard_remaining_seconds)"
  local min_full_remaining="${PERF_TIME_GUARD_MIN_FULL_REMAINING_SECONDS:-7200}"
  local preset="${PERF_RUN_PRESET:-full}"

  logix_perf_guard_log "phase-check" "phase=${phase} preset=${preset} minFullRemaining=${min_full_remaining}s"
  if [ "$remaining" -gt "$min_full_remaining" ]; then
    return 0
  fi
  if [ "$preset" = "fast" ] || [ "$preset" = "fast-adaptive" ]; then
    logix_perf_guard_log "phase-check" "phase=${phase} keepPreset=${preset}"
    return 0
  fi

  local fallback_steps="${PERF_TIME_GUARD_FALLBACK_STEPS_LEVELS:-2000,3200,4800,6400,8000}"
  logix_perf_guard_log "downgrade" "phase=${phase} from=${preset} to=fast-adaptive fallbackSteps=${fallback_steps}"
  echo "::warning::[logix-perf] downgrade full->fast-adaptive at ${phase} (remaining=${remaining}s)"

  export PERF_RUN_PRESET="fast-adaptive"
  export PERF_PROFILE="quick"
  export PERF_STEPS_MODE="manual"
  export PERF_STEPS_LEVELS="${fallback_steps}"
  export PERF_DIFF_MODE="triage"
  export PERF_CAPACITY_AUTO_RETRY_ON_TIMEOUT="0"
  export PERF_CAPACITY_DYNAMIC_ENFORCE_HARD="0"
  export PERF_ARTIFACT_NAME="logix-perf-sweep-fast-adaptive-${GITHUB_RUN_ID:-local}"

  {
    echo "PERF_RUN_PRESET=${PERF_RUN_PRESET}"
    echo "PERF_PROFILE=${PERF_PROFILE}"
    echo "PERF_STEPS_MODE=${PERF_STEPS_MODE}"
    echo "PERF_STEPS_LEVELS=${PERF_STEPS_LEVELS}"
    echo "PERF_DIFF_MODE=${PERF_DIFF_MODE}"
    echo "PERF_CAPACITY_AUTO_RETRY_ON_TIMEOUT=${PERF_CAPACITY_AUTO_RETRY_ON_TIMEOUT}"
    echo "PERF_CAPACITY_DYNAMIC_ENFORCE_HARD=${PERF_CAPACITY_DYNAMIC_ENFORCE_HARD}"
    echo "PERF_ARTIFACT_NAME=${PERF_ARTIFACT_NAME}"
  } >> "$env_out_file"
  logix_perf_guard_dump_state "${phase}:after_downgrade"
}
