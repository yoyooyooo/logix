---
title: Logix API Proposal Workspace
status: living
version: 10
---

# Logix API Proposal Workspace

## 目标

承接 `logix-capability-planning-loop` 产生的 API planning proposal 文件。

本目录只放 planning proposal，不承担 authority。proposal 进入 implementation-ready 之前，必须回链 portfolio、capability harness、review ledger 与必要 authority target。

## Source

- [../../next/logix-api-planning/proposal-portfolio.md](../../next/logix-api-planning/proposal-portfolio.md)
- [../../next/logix-api-planning/surface-candidate-registry.md](../../next/logix-api-planning/surface-candidate-registry.md)
- [../../next/logix-api-planning/run-state.md](../../next/logix-api-planning/run-state.md)
- [../../ssot/capability/01-planning-harness.md](../../ssot/capability/01-planning-harness.md)
- [../../ssot/capability/02-api-projection-decision-policy.md](../../ssot/capability/02-api-projection-decision-policy.md)

## Proposal File Convention

| field | rule |
| --- | --- |
| path | `docs/proposals/logix-api/<proposal-id>.md` |
| id | `PROP-*` |
| status | `draft / reviewed / portfolio-admitted / collision-review / principle-candidate / frozen-projection / implementation-ready / retired` |
| required backlinks | portfolio row、run-state cursor、review ledger |
| surface candidate backlinks | any public concept candidate must link `docs/next/logix-api-planning/surface-candidate-registry.md` |

## Starter Files

| file | role |
| --- | --- |
| [PROP-TEMPLATE.md](./PROP-TEMPLATE.md) | 起新 proposal 时复制这份模板 |

## Proposal Index

| proposal | status | portfolio row | review ledger | next action |
| --- | --- | --- | --- | --- |
| `PROP-001` | `implementation-ready` | `docs/next/logix-api-planning/proposal-portfolio.md` | `docs/review-plan/runs/2026-04-24-prop-001-implementation-ready-check.md`, `docs/review-plan/runs/2026-04-24-vob-01-expectation-evaluator-packet.md`, `docs/review-plan/runs/2026-04-24-surf-002-promotion-readiness-review.md`, `docs/review-plan/runs/2026-04-24-global-api-shape-closure-gate-after-pf-09.md` | `keep PROP-001 frozen; CONV-001 is consumed as outcome index and post-CONV queue is paused after TASK-004` |

## Lifecycle Rule

- proposal 只在本目录承接单一 planning object
- proposal 一旦进入 `consumed / superseded`，正文应压缩，只保留结论、去向和链接
- proposal 的活跃状态由 portfolio 和 run-state 决定，本目录不单独持第二套 active queue

## 当前一句话结论

Proposal 文件在本目录工作，是否进入 authority 由 portfolio 和 adoption gate 决定；当前 `PROP-001` 已冻结，`CONV-001` 已消费为 outcome index，post-CONV queue 已暂停。
