---
title: React Expert Host Residue Contract
status: living
owner: react-expert-host-residue
target-candidates:
  - docs/ssot/runtime/10-react-host-projection-boundary.md
  - docs/ssot/runtime/07-standardized-scenario-patterns.md
  - docs/standards/logix-api-next-guardrails.md
  - docs/proposals/public-api-surface-inventory-and-disposition-plan.md
  - docs/proposals/orchestration-existence-challenge.md
  - packages/logix-react/README.md
last-updated: 2026-04-18
---

# React Expert Host Residue Contract

## 目标

冻结 `R3` 这组 React residue 的公开去向：

- `@logixjs/react/ExpertHooks`
- `useProcesses`
- `@logixjs/react/ReactPlatform`
- `@logixjs/react/Platform`
- `ReactPlatformLayer`

本页先裁决这些对象今天是否还配继续存在于公开 surface，再裁决若有 surviving candidate，它最小该长成什么样。

本页不做实现 patch，不直接回写 live SSoT。

## 页面角色

- 本页是 `R3` 的单点 proposal
- 本页承接 [Public API Surface Inventory And Disposition Plan](./public-api-surface-inventory-and-disposition-plan.md) 里的 `R3`
- 本页必须继承 [Orchestration Existence Challenge](./orchestration-existence-challenge.md) 已冻结的 `R3 upstream constraint packet`
- 本页不允许通过 React host residue 反证 core orchestration surface 该保留

## 当前 authority baseline

- [../ssot/runtime/10-react-host-projection-boundary.md](../ssot/runtime/10-react-host-projection-boundary.md)
- [../ssot/runtime/07-standardized-scenario-patterns.md](../ssot/runtime/07-standardized-scenario-patterns.md)
- [../standards/logix-api-next-guardrails.md](../standards/logix-api-next-guardrails.md)
- [./public-api-surface-inventory-and-disposition-plan.md](./public-api-surface-inventory-and-disposition-plan.md)
- [./orchestration-existence-challenge.md](./orchestration-existence-challenge.md)
- [../review-plan/runs/2026-04-18-k1-orchestration-fate-review.md](../review-plan/runs/2026-04-18-k1-orchestration-fate-review.md)

## 当前 challenge override

下面这些 live 语句在本页只算 prior baseline witness，不算默认结论：

- `useProcesses` 继续作为公开 expert host route
- `ReactPlatform` 继续作为兼容聚合器存在
- `Platform` 继续作为 React 平台桥公开入口存在
- examples / README / docs api page 里仍展示这些对象

原因：

- 当前 public host contract 已明确只保留 canonical host law
- residue 只能以更小 contract 存活，不能靠“以前公开过”继续占位

### explicit override matrix

| surface | superseded-authority | witness-only-source | future live-doc owner |
| --- | --- | --- | --- |
| `useProcesses` | `README`、`apps/docs api/react/use-processes*.md`、React integration guides 中把它当公开 expert host route 的语句 | `packages/logix-react/README.md`、`apps/docs/content/docs/api/react/use-processes*.md`、`apps/docs/content/docs/guide/essentials/react-integration*.md`、`apps/docs/content/docs/guide/recipes/react-integration*.md`、examples | `R3` |
| `ReactPlatform` | `README`、tests、demo 中把它当兼容聚合器继续公开的语句 | `packages/logix-react/README.md`、`packages/logix-react/test/ReactPlatform/ReactPlatform.test.tsx`、`packages/logix-react/test-dts/public-subpaths.surface.ts`、examples | `R3` |
| `ReactPlatformLayer` | `README`、tests、demo 中把它当公开 platform bridge 的语句 | `packages/logix-react/README.md`、`packages/logix-react/test/Platform/*.test.ts*`、`apps/docs` guides、`examples/logix-react/src/demos/SessionModuleLayout.tsx` | `R3` |

这些 witness 全部：

- `closure-gate = no`
- 只影响 `migration-cost` 与 `docs cleanup cost`
- 不得反证 `semantic-disposition`

## R3 upstream constraint packet

从 `K1` 继承的上游约束固定为：

- `useProcesses` 不得生成新的 public process noun
- `useProcesses` 不得绕开 canonical host law
- `useProcesses` 不得单独证明 `Process` 应保留
- `useProcesses` 不得形成新的 host-owned assembly slot

本页不能推翻这些约束。

## Admissibility Table

### 可作为 survival proof 的证据

- 删掉后会新长出更大的 React host public 边界
- canonical host law 无法覆盖某个真实 host-local integration 任务
- 删除会直接伤害 host integration、lifecycle bridge、diagnostics 或 no-tearing 保证，且没有更小 contract 可替代
- 候选对象能给出明确 `owner / future-authority / de-sugared mapping / why-not-delete`

### 只能算 witness 的证据

- README 还在写
- examples / demos 还在用
- `apps/docs` api page 还在挂
- 当前测试仍在测
- 兼容聚合器存在

这些 witness 最多只影响：

- `migration-cost`
- `docs cleanup cost`

不能影响：

- `semantic-disposition`
- `why-not-delete`

## Row Sheet

| surface | carrier-reach | same-fate carrier | candidate-disposition | surviving-proof | delete-path | decision-owner | future-authority | witness-contracts | host-constraint |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `useProcesses` | `./ExpertHooks` | `@logixjs/react/ExpertHooks` 与相关 docs/demo promise 同 fate | `delete` | 只有在它能证明自己不是 orchestration residue 的 host 投影，而是不可替代的 host-local subtree lifetime adjunct，才允许翻案 | 从公开 host residue 删除；root import promise 无效；docs 只影响 cleanup cost；若未来保留，只能改造成机械回解到 canonical host law 的更小 contract | `R3` | `pending` | `packages/logix-react/README.md`、`apps/docs/content/docs/api/react/use-processes*.md`、React integration guides、`packages/logix-react/test/Hooks/useProcesses.test.tsx`、`examples/logix-react/src/demos/ProcessSubtreeDemo.tsx` | `受 R3 upstream constraint packet 约束` |
| `ReactPlatform` | `root .`、`./ReactPlatform` | `@logixjs/react` root 与 `./ReactPlatform` 同 fate；成员 `Provider / useModule / useSelector / useDispatch / createRoot` 同 fate | `delete` | 只有在它能证明自己不是简单聚合器、且删除会新长出更差的迁移边界，才允许翻案 | 删除兼容聚合器；`Provider / useModule / useSelector / useDispatch` 直接回到 canonical host law；`createRoot(runtime)` 退糖为返回 `<RuntimeProvider runtime={runtime}>{children}</RuntimeProvider>` 的薄组件工厂 | `R3` | `pending` | `packages/logix-react/README.md`、`packages/logix-react/test/ReactPlatform/ReactPlatform.test.tsx`、`packages/logix-react/test-dts/public-subpaths.surface.ts` | `不得复制 canonical host law` |
| `ReactPlatformLayer` | `root . via Platform export`、`./Platform` | `@logixjs/react/Platform` 与 `ReactPlatformLayer` 默认同 fate | `delete` | 只有在它能补齐完整 bridge contract，证明自己是不可替代的 host-local lifecycle bridge，且不增加第二 host truth，才允许 reopen | 默认删除；若未来翻案，必须先补 `surface-owner / entrypoint-shell / trigger-surface / de-sugared mapping / future-authority / single delete-path owner` 六列 bridge packet；若不翻案，lifecycle bridge internalize | `R3` | `pending` | `packages/logix-react/README.md`、`packages/logix-react/test/Platform/*.test.ts*`、`apps/docs` guides、`examples/logix-react/src/demos/SessionModuleLayout.tsx` | `不得形成第二 host truth；不得长出新构造族` |

## Reopen Bar

只有当 reviewer 能提出一个严格支配当前 delete-first row sheet 的更小方案时，才允许 reopen。

对 `ReactPlatformLayer`，reopen 至少要一次性补齐：

- `surface-owner`
- `entrypoint-shell`
- `trigger-surface`
- `de-sugared mapping`
- `future-authority`
- `single delete-path owner`

补不齐就继续停在 `delete`。

## 预期去向

本页消费后，后续至少要同步回写：

- `docs/ssot/runtime/10-react-host-projection-boundary.md`
- `docs/ssot/runtime/07-standardized-scenario-patterns.md`
- `docs/standards/logix-api-next-guardrails.md`
- `docs/proposals/public-api-surface-inventory-and-disposition-plan.md`
- `packages/logix-react/README.md`
- 必要的 `apps/docs` React API 页面

## 当前一句话结论

`R3` 的默认方向是继续删除 React host residue：`useProcesses / ReactPlatform / ReactPlatformLayer` 全部先站在删除一侧；若 `ReactPlatformLayer` 想活，只能靠后续补出完整 bridge contract 来翻案。
