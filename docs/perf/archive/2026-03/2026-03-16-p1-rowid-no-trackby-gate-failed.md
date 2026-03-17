# 2026-03-16 · P1 no-trackBy list RowId gate failed

> 说明：本文记录的是较早失败试探。当前母线裁决已被 `2026-03-16-d3-no-trackby-rowid-gate.md` 的 D-3 收口结果覆盖；是否接受代码以 D-3 文档为准。

## 这刀做了什么

尝试给 `no-trackBy list` 的 `RowIdStore.ensureList(...)` 增加结构门控：

- 只打 `source.impl` 与 `validate.impl` 对无 `trackBy` list 的强制 `ensureList(...)`
- 条件设想：
  - 同一个 list instance
  - `txnDirtyEvidence` 没命中 list root
  - 没命中 `trackBy` 路径
  - `items` 引用未变，或能证明没有结构变化

实现试探落点：

- `packages/logix-core/src/internal/state-trait/rowid.ts`
- `packages/logix-core/src/internal/state-trait/validate.impl.ts`
- `packages/logix-core/src/internal/state-trait/source.impl.ts`

当前所有代码改动已回退，本线只保留本文档。

## 证据与验证

行为守门：

- `StateTrait.NestedList.RowId.Stability.test.ts`
- `StateTrait.TraitCheckEvent.DiagnosticsLevels.test.ts`

结果：

- 现有基线行为仍然成立
- 一旦把 no-trackBy gate 真正打开，行为测试会暴露两类风险：
  - reorder 场景可能错误复用旧 ids
  - shrink 场景可能跳过必要的 removed 通知

贴边 micro-bench：

数据规模：

- `128 / 512 / 2048 rows`

干扰类型：

- 普通字段更新
- list root 更新
- parent reorder

关键结果：

- `128 rows`
  - `fieldLegacyP95=0.0553ms`
  - `fieldGatedP95=0.0330ms`
  - `rootLegacyP95=0.0515ms`
  - `rootGatedP95=0.0786ms`
  - `reorderLegacyP95=0.0847ms`
  - `reorderGatedP95=0.0747ms`

- `512 rows`
  - `fieldLegacyP95=0.2311ms`
  - `fieldGatedP95=0.1181ms`
  - `rootLegacyP95=0.1540ms`
  - `rootGatedP95=0.3098ms`
  - `reorderLegacyP95=0.3897ms`
  - `reorderGatedP95=0.0587ms`

- `2048 rows`
  - `fieldLegacyP95=1.4879ms`
  - `fieldGatedP95=1.3061ms`
  - `rootLegacyP95=1.5174ms`
  - `rootGatedP95=1.2347ms`
  - `reorderLegacyP95=1.3850ms`
  - `reorderGatedP95=0.6778ms`

## 结论

这条线当前不满足可合入门槛。

原因：

1. 普通字段更新路径有正向信号。
2. list root 更新与 reorder 场景无法稳定证明语义安全。
3. 当前实现需要更强的结构判定与嵌套 list 约束，否则容易把保守路径误判成可跳过。

## 当前裁决

- 结果分类：`discarded_or_pending`
- 不建议合入代码
- 只回收 docs/evidence-only

## 若未来重开

只建议在以下前提下再重开：

1. 先把 no-trackBy 的“结构变化判定”独立成更强约束
2. 先补 nested list + parent reorder 的更细语义门
3. 再单独测 `validate.impl` 和 `source.impl`，不要把两条路径绑成一刀
