# SelectorGraph dirty root 双向去冗余（PR1）

## Branch
- `perf/cr88-selectorgraph-bidir-dedup`
- 目标 PR 标题：`perf(logix-core): prune selectorgraph redundant dirty roots`

## 改动
- `packages/logix-core/src/internal/runtime/core/SelectorGraph.ts`
  - 保留“已有祖先 dirty root 时跳过新增后代”的去冗余逻辑。
  - 新增 `upsertDirtyRoot`：当后续出现更泛化路径（祖先）时，先移除已存在的更具体路径（后代）再加入。
  - dirty root 收集由线性列表改为 `Map<rootKey, FieldPath[]>` 的按根聚合去冗余，后续调度只遍历去冗余结果。
- `packages/logix-core/test/Runtime/ModuleRuntime/SelectorGraph.test.ts`
  - 新增回归：`prunes earlier descendant dirty roots when a broader dirty root arrives later`。
  - 新增回归：`keeps existing ancestor dirty root dedup when descendant arrives later`。

## 测试
- 命令：`pnpm -C packages/logix-core exec vitest run test/Runtime/ModuleRuntime/SelectorGraph.test.ts`
- 结果：`1 passed, 13 passed`。

## 风险
- 行为面：外部 API 不变，仅 dirty root 去冗余顺序与集合优化，语义应保持一致。
- 性能面：新增“祖先覆盖后代”的剪枝可减少同 root 下重复 overlap 扫描；极端情况下仍为同 root 内线性比较。
- 回归面：若后续引入新的 dirty path 归一化规则，需同步校验 `upsertDirtyRoot` 与 `field-path` 前缀语义一致。

## 机器人 Review 消化
- Gemini Code Assist：
  - inline 建议：将 candidate 循环上提到外层，避免重复 subscriber/txnSeq 检查，已采纳。
- 对应修复提交：`2df7d6ae`（保持单 commit）。
- CodeRabbit：本轮仅 rate-limit 提示，无 actionable 代码建议。
