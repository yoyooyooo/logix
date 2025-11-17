# 062 Migration Playbook: Txn Lanes 默认开启

## 目标

- 将 Txn Lanes 从“显式 opt-in”切换为“默认开启（default-on）”。
- 保留可解释的止血/对照入口（forced_off / forced_sync），禁止隐式 fallback。

## 步骤（高层）

1. 修改默认策略为 default-on（保持 override 优先级与可解释证据字段）。
2. 补齐默认/回退的单测与证据字段断言。
3. 落盘 Node + Browser 的 perf before/after/diff（off vs default-on，core + core-ng）。
4. 更新用户文档（默认开启、怎么回退、怎么验证生效）。

## 回退口径

- `overrideMode=forced_off`：强制关闭（回到 baseline 行为）。
- `overrideMode=forced_sync`：强制全同步（用于对照差异/止血）。

## 失败口径（Fail-fast）

- Node 或 Browser 任一 diff 出现 `summary.regressions>0` → 视为未完成，不得切默认。
- `diagnostics=off` 成本明显上升 → 视为 bug，必须先修复或收紧证据范围并复测。
