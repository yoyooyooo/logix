---
title: Runtime Docs Followups
status: done
target:
  - docs/README.md
  - docs/ssot/README.md
  - docs/ssot/runtime/README.md
  - docs/ssot/platform/README.md
  - docs/adr/README.md
  - docs/standards/README.md
  - docs/proposals/README.md
  - docs/next/README.md
  - docs/standards/docs-governance.md
  - docs/ssot/runtime/01-public-api-spine.md
  - docs/ssot/runtime/02-hot-path-direction.md
  - docs/ssot/runtime/03-canonical-authoring.md
  - docs/ssot/runtime/04-capabilities-and-runtime-control-plane.md
  - docs/ssot/runtime/05-logic-composition-and-override.md
  - docs/ssot/runtime/06-form-field-kernel-boundary.md
  - docs/ssot/runtime/07-standardized-scenario-patterns.md
  - docs/ssot/runtime/08-domain-packages.md
  - docs/ssot/runtime/09-verification-control-plane.md
  - docs/ssot/platform/01-layered-map.md
  - docs/ssot/platform/02-anchor-profile-and-instantiation.md
owner: specs/120-docs-full-coverage-roadmap
last-updated: 2026-04-07
---

# Runtime Docs Followups

本页承接 `120-docs-full-coverage-roadmap` 之下 `121` 到 `129` 的 group-level followups dispatch。

当前状态：

- 已全部消费完成
- 不再作为 active next topic 或新 writeback 入口
- 仅保留为这批 docs 收口的历史记录

## 作用

- 作为 `121` 到 `129` 的统一待升格专题入口
- 记录每一批 owner spec 的当前状态、目标页和下一批顺序
- 避免收尾项漂回 `docs/proposals/**`

## 当前分发顺序

### 1. `121` docs foundation / governance convergence

- 状态：done
- 目标页：`docs/README.md`、`docs/ssot/README.md`、`docs/ssot/runtime/README.md`、`docs/ssot/platform/README.md`、`docs/adr/README.md`、`docs/standards/README.md`、`docs/proposals/README.md`、`docs/next/README.md`、`docs/standards/docs-governance.md`
- 完成信号：
  - foundation 页角色与最短跳转一致
  - `proposal / next / ssot / adr / standards` 写入路径可在 2 分钟内判断
  - active next topic 的 owner、target 和回写动作可审计

### 2. `122` runtime public authoring convergence

- 状态：done
- 目标页：`docs/ssot/runtime/01-public-api-spine.md`、`docs/ssot/runtime/03-canonical-authoring.md`、`docs/ssot/runtime/05-logic-composition-and-override.md`、`docs/adr/2026-04-04-logix-api-next-charter.md`、`docs/standards/logix-api-next-guardrails.md`
- 完成信号：
  - `Program.make(Module, config)` 已进入 `@logixjs/core` 公开导出
  - canonical SSoT 与代表性内核 examples 已切到 `Program.make(...)`
  - 公开 `Module` 定义对象已不再反射 `implement`，legacy `Module.implement(...)` 已标成 carry-over wrapper，`apps/docs/**` 已记为 deferred

### 3. `123` runtime hotpath convergence

- 状态：done
- 目标页：`docs/ssot/runtime/02-hot-path-direction.md`
- 完成信号：
  - kernel / shell / control plane / process / runner 边界已收成单一账本
  - active perf evidence 路由已收敛到 `specs/<id>/perf/*.json`
  - `docs/perf/**` 缺失已显式裁决，不再作为活跃事实源假入口

### 4. `124` runtime control plane / verification convergence

- 状态：done
- 目标页：`docs/ssot/runtime/04-capabilities-and-runtime-control-plane.md`、`docs/ssot/runtime/09-verification-control-plane.md`
- 完成信号：
  - stage / mode / input contract / machine report 已收成单一账本
  - CLI 机器报告已补齐 `mode / errorCode / environment`
  - `trialrun`、`ir.validate`、`ir.diff` 已固定为 expert / archive 路由

### 5. `125 / 126 / 127` form / scenario / domain second wave

- 状态：done
- 目标页：`docs/ssot/runtime/06-form-field-kernel-boundary.md`、`docs/ssot/runtime/07-standardized-scenario-patterns.md`、`docs/ssot/runtime/08-domain-packages.md`
- 当前关注点：
  - form / field-kernel 边界继续压紧
  - host scenario 与 examples 映射继续收口
  - domain package 模板与 admission 规则继续对齐

其中：

- `125`：done
  - `Form.make / Form.from` 已固定为顶层主入口
  - `Form.derived` 已退出顶层 barrel
  - canonical examples 与 package tests 已迁到 `$.fields / $.derived`
- `126`：done
  - standard scenario matrix 已补齐到 global / local / imports / layer / session / suspend / subtree process
  - host projection、examples、verification subtree 已收成单一边界
- `127`：done
  - future domain package admission 已固定只认 `service-first / program-first`
  - `@logixjs/domain` 的 pattern-kit 身份已降成 package 组织形态，不再算第三主输出

### 6. `128 / 129` platform layered map / anchor profile governance

- 状态：done
- 目标页：`docs/ssot/platform/01-layered-map.md`、`docs/ssot/platform/02-anchor-profile-and-instantiation.md`
- 完成信号：
  - layer-to-code ownership 与三条链边界已补齐
  - static role keep/drop、instantiation boundary、naming bucket reopen 条件已补齐

## 升格完成条件

- `121` 到 `129` 对应条目已全部回写到目标事实源
- `docs/next/README.md` 仍在列出的活跃专题都能说明 owner、target 和当前批次
- 命名后置项只停留在 `docs/standards/logix-api-next-postponed-naming-items.md`

## 回写约束

- 事实稳定后，直接改目标页
- 每完成一批，回写对应 spec 的 `tasks.md` 与必要的 `spec.md`
- 若批次状态变化影响总控，回写 `120/spec-registry.json`、`120/spec-registry.md`、`120/checklists/group.registry.md`
- 本页已停止 dispatch；若未来再开新专题，直接新建新的 next 页面
