# Feature Specification: PR94 triggerStreams dedupe 性能证据回填

**Feature Branch**: `spec/101-pr94-triggerstreams-dedupe-perf-evidence`
**Created**: 2026-02-25
**Status**: Backfill（已交付实现的规格补录）
**PR Reference**: [#94](https://github.com/yoyooyooo/logix/pull/94)

## 背景

PR #94 已合并并补齐 `triggerStreams` 的 dedupe 性能证据，但缺少独立 `specs/*` 目录。
本 spec 用于补齐审计链路，让 PR 与 spec 一一对应。

## Goals

1. 补录 PR #94 的目标、证据与复现步骤。
2. 绑定证据产物路径与测试文件，避免后续追溯丢失。
3. 完成任务闭环。

## Non-Goals

1. 不改动 `triggerStreams` 生产逻辑。
2. 不重新定义 dedupe 策略，仅做回填与收口。

## Acceptance Criteria

1. 存在独立 spec 包：`spec.md`、`plan.md`、`tasks.md`、`quickstart.md`、`research.md`。
2. `tasks.md` 全部闭合并映射到 PR #94 的真实变更文件。
3. quickstart 可以执行最小复现命令。
