# SelectorGraph reads 单次遍历归一化（PR18）

## Branch
- `refactor/logix-core-perf-pr18-selectorgraph-reads-single-pass`
- PR: `#85` (https://github.com/yoyooyooo/logix/pull/85)

## 核心改动
- `packages/logix-core/src/internal/runtime/core/SelectorGraph.ts`
  - `ensureEntry` 改为单次遍历：一次性完成 string 过滤、`normalizeFieldPath`、`reads` 收集与 `readsByRootKey` 分桶。
  - 去除 `filter/map/filter` 中间数组分配，保持 `readRootKeys`/`indexByReadRoot` 语义一致。
- `packages/logix-core/test/Runtime/ModuleRuntime/SelectorGraph.test.ts`
  - 增加 mixed reads 回归用例，锁定非法 read 过滤与 root 索引行为。

## 验证
- `pnpm typecheck`
- `pnpm test:turbo`

## 独立审查
- 待 PR 创建后执行并回填。

## 机器人评论处理
- CodeRabbit: 待 PR 创建后拉取评论并回填。
- Vercel: 仅部署额度提示（若出现）按非代码质量事件记录。
