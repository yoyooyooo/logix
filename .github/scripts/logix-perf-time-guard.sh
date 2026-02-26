#!/usr/bin/env bash

set -euo pipefail

logix_perf_guard_now_epoch() {
  date +%s
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
  shift
  if command -v timeout >/dev/null 2>&1; then
    timeout "${timeout_seconds}s" "$@"
    return $?
  fi
  "$@"
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

  echo "[logix-perf][time-guard] phase=${phase} preset=${preset} remaining=${remaining}s"
  if [ "$remaining" -gt "$min_full_remaining" ]; then
    return 0
  fi
  if [ "$preset" = "fast" ] || [ "$preset" = "fast-adaptive" ]; then
    return 0
  fi

  local fallback_steps="${PERF_TIME_GUARD_FALLBACK_STEPS_LEVELS:-2000,3200,4800,6400,8000}"
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
}
