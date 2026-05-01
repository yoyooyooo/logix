---
title: TASK-004 Control-plane Hygiene Scope
status: frozen
version: 2
---

# TASK-004 Control-plane Hygiene Scope

## 目标

压缩 `TASK-001 / TASK-002` 关闭后的活跃控制面，保证新会话从 `run-state.md` 恢复时只看到一个真实 cursor。

本页只做 control-plane hygiene，不承担 authority，不修改 exact surface，不删除历史 ledger。

## Source

- [run-state.md](./run-state.md)
- [post-conv-implementation-task-queue.md](./post-conv-implementation-task-queue.md)
- [implementation-ready-conversion.md](./implementation-ready-conversion.md)
- [proposal-portfolio.md](./proposal-portfolio.md)
- [surface-candidate-registry.md](./surface-candidate-registry.md)
- [housekeeping.md](./housekeeping.md)

## Scope

| field | value |
| --- | --- |
| task_id | `TASK-004` |
| status | `done` |
| execution_topology | `fallback-local` |
| owner_lane | control-plane hygiene |
| source | `CONV-001` |
| proof_gate | docs checks |
| public_surface_budget | no public concept |

## Cleanup Decisions

| area | decision |
| --- | --- |
| `run-state.md` | keep only current resume state and compact closed artifacts into grouped rows |
| `post-conv-implementation-task-queue.md` | mark `TASK-004` done and keep `TASK-003` as deferred authority-intake |
| `README.md` | index `TASK-001..TASK-004` outcomes and point current status to paused post-CONV queue |
| `implementation-ready-conversion.md` | consumed conversion compressed into outcome index |
| `proposal workspace` | keep `PROP-001` frozen and point cursor to paused post-CONV queue |
| `surface registry` | record that verification artifact cleanup closed and root compare productization remains deferred |

## Queue Result

| task | result |
| --- | --- |
| `TASK-001` | done, narrow source receipt proof |
| `TASK-002` | done, verification artifact lifecycle markers |
| `TASK-003` | deferred authority-intake, only open on productization request |
| `TASK-004` | done, control-plane hygiene |

## Non-claims

- no authority rewrite
- no exact surface change
- no archive deletion
- no proposal reopening
- no root `Runtime.compare` productization

## Reopen Bar

Reopen `TASK-004` only if:

- `run-state.md` again points at more than one active cursor
- consumed implementation tasks appear as active work
- `TASK-003` is started without explicit productization or authority-intake request
- docs checks find stale active cursor references

## 当前一句话结论

`TASK-004` closes post-CONV control-plane hygiene. The queue is now paused with only deferred `TASK-003` authority-intake remaining.
