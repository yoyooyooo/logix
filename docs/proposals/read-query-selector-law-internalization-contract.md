---
title: ReadQuery Selector Law Internalization Contract
status: consumed
owner: read-query-selector-internalization
target-candidates:
  - docs/ssot/runtime/01-public-api-spine.md
  - docs/ssot/runtime/10-react-host-projection-boundary.md
  - docs/standards/logix-api-next-guardrails.md
  - docs/proposals/public-api-surface-inventory-and-disposition-plan.md
last-updated: 2026-04-21
---

# ReadQuery Selector Law Internalization Contract

## 目标

冻结 `ReadQuery` 的终局 delta contract，确保它完整回收到 selector law internal owner，并把 repo consumer 级 noun、repo-internal grouped contract 与 helper 公开类型残留一起收口。

本页只补四件事：

- `ReadQuery` noun extinction
- `repo-internal` exact closure
- helper public type ban
- closure proof matrix

## 页面角色

- 本页是 umbrella proposal 的 `Proposal A`
- 本页承接 [ReadQuery ExternalStore Resource Final Owner Map Contract](./read-query-external-store-resource-final-owner-map-contract.md) 里关于 `ReadQuery` 的冻结结果
- 本页只补 `ReadQuery` 特有 delta
- 本页不重写 React host public formula
- 本页不重写 helper exact noun、import shape 与 owner
- 本页不处理 `ExternalStore` seam
- 本页不处理 `Resource` owner relocation

## 当前 authority baseline

- [./read-query-external-store-resource-final-owner-map-contract.md](./read-query-external-store-resource-final-owner-map-contract.md)
- [./core-read-projection-protocol-contract.md](./core-read-projection-protocol-contract.md)
- [../ssot/runtime/01-public-api-spine.md](../ssot/runtime/01-public-api-spine.md)
- [../ssot/runtime/10-react-host-projection-boundary.md](../ssot/runtime/10-react-host-projection-boundary.md)
- [../standards/logix-api-next-guardrails.md](../standards/logix-api-next-guardrails.md)

## Adopted Candidate

本轮 adopted candidate 固定为：

- `ReadQuery Closure-First Delta Contract`

## Frozen Decisions

### 1. noun extinction

`ReadQuery` 不再保留任何 repo consumer 级主名词地位。

冻结要求：

- 对用户与 repo consumer，读侧公式继续只承认 `useSelector(handle)` 与 `useSelector(handle, selector, equalityFn?)`
- 非 archive 文档、examples、公开类型面与公开教学口径不再出现 explicit `ReadQuery` authoring route
- `ReadQuery` 只能作为 selector law internal 工件存在

### 2. internal owner

`ReadQuery` 的唯一 owner 固定为 core selector law internal。

本页只冻结语义，不冻结具体内部目录、具体测试家族名或当前实现文件组织。

必须保留的语义级能力只有：

- selector compile
- compile quality
- strict gate
- 窄更新
- 可诊断的 read topic / read metadata

### 3. repo-internal exact closure

本页冻结一个单值终局：

- `ReadQuery` 不保留任何 workspace repo-internal survivor

这条 closure 同时覆盖：

- `repo-internal/read-contracts`
- `repo-internal/InternalContracts`
- 任何后续新增的 workspace repo-internal export

若执行阶段发现必须短期桥接，只能进入 implementation plan 或 migration annex。桥接文本不具备 authority，不改变本页终局 contract，并且必须满足：

- 不继续暴露 `ReadQuery` noun
- 绑定 exact path
- 绑定唯一消费者
- 绑定 sunset gate
- 绑定删除触发条件

### 4. helper public type ban

`fieldValue(valuePath)` 与 `rawFormMeta()` 的 exact noun、import shape 与 owner，继续由 [../ssot/runtime/10-react-host-projection-boundary.md](../ssot/runtime/10-react-host-projection-boundary.md) 单点持有。

本页只冻结一条增量约束：

- helper 的公开类型、公开文案、examples 与 proposal 口径不得暴露 `ReadQuery` noun，也不得新增任何可命名的 descriptor family、alias 或 import path
  - 公开面不得新增任何可命名的中间对象家族、alias 或 import path

公开叙事只承认：

- helper 暴露可被 `useSelector` 消费的 selector input

任何中间工件都只属于 internal-only 层。

## Non-goals

- 不重开 React host public formula
- 不定义新的 helper family
- 不定义 implementation bridge 细节
- 不处理 `ExternalStore` 与 `Resource`
- 不把当前内部目录结构冻结成终局 contract

## Closure Proof Matrix

| closure obligation | required witness | authority owner | reopen condition |
| --- | --- | --- | --- |
| public root / subpath closure | `@logixjs/core` root 与 package exports 不出现 `ReadQuery` | `runtime/01 + guardrails` | 只有出现新的 canonical public selector noun 需求时，才允许 reopen |
| repo-internal closure | workspace export map 与 allowlist 证明 `ReadQuery` 已从 `read-contracts`、`InternalContracts` 与任何 grouped repo-internal route 消失 | 本页 | 只有证明存在不可替代的 repo consumer 窄合同，且能通过单独 reopen 绑定 exact path / sole consumers / sunset gate 时，才允许 reopen |
| public type closure | `@logixjs/react` 等公开 d.ts 与公开 helper type witness 不出现 `ReadQuery` noun | `runtime/10 + 本页` | 只有 helper exact contract 被正式重开时，才允许 reopen |
| docs / examples / tests residue closure | 非 archive docs、examples、长期 witness 不再把 `ReadQuery` 当成显式 authoring route；残余若保留，必须显式标记为 stale / residue | 本页 + inventory | 只有 residue 被提升回 active authority 时，才允许 reopen |
| semantic capability continuity | selector compile、compile quality、strict gate、窄更新、read topic diagnostics 的行为级 witness 继续成立 | selector law internal owner | 只有低层语义本身被判定不足时，才允许 reopen |

## 当前实现 witness

- `repo-internal/read-contracts` 与 `repo-internal/InternalContracts` 已不再暴露 `ReadQuery`
- `@logixjs/react` 的公开 selector helper 类型面已去掉 `ReadQuery` noun，只保留 selector input 语义
- runtime seam 当前固定通过 `RuntimeContracts.Selector` 消费 selector compile / strict gate / topic route
- consumed proposal 与活跃 examples 已移除把 helper 产物写成 `ReadQuery` noun 的教学口径
- focused witness 已覆盖：
  - `packages/logix-core/test/PublicSurface/Core.InternalContractsBoundary.test.ts`
  - `packages/logix-core/test/PublicSurface/Core.RootExportsBoundary.test.ts`
  - `packages/logix-core/test/Contracts/CoreRootBarrel.allowlist.test.ts`
  - `packages/logix-core/test/ReadQuery/ReadQuery.buildGate.test.ts`
  - `packages/logix-core/test/ReadQuery/ReadQuery.compile.test.ts`
  - `packages/logix-core/test/ReadQuery/ReadQuery.strictGate.test.ts`
  - `packages/logix-core/test/ReadQuery/ReadQuery.runtimeConsumption.test.ts`
  - `packages/logix-core/test/Runtime/ModuleRuntime/SelectorGraph.test.ts`
  - `packages/logix-react/test/Hooks/useSelector.readQueryInput.test.tsx`
  - `packages/logix-react/test/Hooks/useSelector.test.tsx`
  - `packages/logix-react/test/Hooks/useSelector.structMemo.test.tsx`

## Writeback Targets

### Live authority

- `docs/ssot/runtime/01-public-api-spine.md`
- `docs/ssot/runtime/10-react-host-projection-boundary.md`
- `docs/standards/logix-api-next-guardrails.md`
- `docs/proposals/public-api-surface-inventory-and-disposition-plan.md`

### Planning residue cleanup

下面这些页在 `ReadQuery` 议题上不再持有活 authority，后续若仍保留相关旧句，必须显式去权威或改口径：

- `docs/proposals/core-residual-surface-contract.md`
- `docs/proposals/core-residual-adjunct-contract.md`
- `docs/proposals/form-react-sugar-factory-api-candidate.md`

## 当前一句话结论

`ReadQuery` 的终局是 selector law internal owner；这页只负责把 noun extinction、repo-internal closure、helper public type ban 与 closure proof 一次性收成单值 contract。

## 去向

- 消费日期：2026-04-21
- 已回写：
  - `docs/ssot/runtime/01-public-api-spine.md`
  - `docs/ssot/runtime/10-react-host-projection-boundary.md`
  - `docs/standards/logix-api-next-guardrails.md`
  - `docs/proposals/public-api-surface-inventory-and-disposition-plan.md`
  - `docs/proposals/form-react-sugar-factory-api-candidate.md`
