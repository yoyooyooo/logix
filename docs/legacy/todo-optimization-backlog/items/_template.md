---
id: O-XXX
title: <一句话标题>
priority: P0
status: pool
owner: <owner>
updatedAt: YYYY-MM-DD
links:
  spec:
    spec: specs/<id>/spec.md
    plan: specs/<id>/plan.md
    tasks: specs/<id>/tasks.md
  implementation: []
  evidence:
    perf: []
    diagnostics: []
  writeback:
    ssot: []
    userDocs: []
notes:
  blockingReason: ""
  freezeReason: ""
---

# O-XXX <标题>

## problem

> 说明要解决的根因与影响范围（只写问题，不写方案）。

## evidence

> 给出现状证据：代码锚点、日志、perf 基线、诊断事件、复现步骤。

## design

> 给出最小可实施设计：分层边界、取舍、迁移策略（breaking 必写迁移）。

## budget

> 写预算与门禁：perf 阈值、诊断成本、N/A 原因（若不触达核心路径）。

## check

- [ ] C1 机会池 -> spec 链路已补齐（`links.spec.*`）
- [ ] C2 spec -> 实现链路已补齐（`links.implementation[]`）
- [ ] C3 实现 -> 证据链路已补齐（`links.evidence.*`）
- [ ] C4 证据 -> 回写链路已补齐（`links.writeback.*`）
- [ ] C5 `items/README.md` 与 `status-registry.json` 状态一致

