# PR Draft: perf/cr88-statetransaction-dirtyset-evidence

## 目标
- 围绕 `StateTransaction` 的 lazy dirty-set 路径补充可复现性能证据入口（before/after 对比口径）。
- 补齐一条面向诊断可见元数据的定向验证，确保 `state:update` 事件中的 dirtySet metadata shape 与运行时语义一致。
- 不改公开 API。

## 模块阅读范围
- `packages/logix-core/src/internal/runtime/core/StateTransaction.ts`
- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.transaction.ts`
- `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.test.ts`
- `.codex/skills/logix-perf-evidence/package.json`
- `.codex/skills/logix-perf-evidence/scripts/061-state-transaction.lazy-dirtyset-baseline.ts`

## 本轮改动
- `.codex/skills/logix-perf-evidence/scripts/061-state-transaction.lazy-dirtyset-baseline.ts`
  - 新增最小 microbench：
    - `before.eager-read-dirty-set`：每次 commit 后强制读取 `txn.dirtySet`。
    - `after.lazy-skip-dirty-set`：commit 后不读取 `txn.dirtySet`。
  - 输出结构化 JSON（meta/before/after/diff），支持 `OUT_FILE` 落盘复现。
- `.codex/skills/logix-perf-evidence/package.json`
  - 新增脚本：`bench:061:state-transaction-lazy-dirtyset`。
- `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.test.ts`
  - 新增定向测试：`state:update diagnostics should keep dirtySet metadata anchors when rootIds are truncated`。
  - 断言点：`rootIds` 截断（light 下 topK=3）时，`rootCount/keySize/keyHash/rootIdsTruncated` 仍保持一致性锚点。

## 性能证据（本地一次性复现）
- 命令：
  - `RUNS=16 WARMUP_DISCARD=3 TXNS_PER_RUN=200 DIRTY_ROOTS=64 TOTAL_FIELDS=256 INSTRUMENTATION=light pnpm -C .codex/skills/logix-perf-evidence run bench:061:state-transaction-lazy-dirtyset`
- 结果摘要：
  - before median: `0.02397583499999996 ms/txn`
  - after median: `0.013468545000000063 ms/txn`
  - median delta: `+0.010507289999999897 ms/txn`（before-after）
  - median speedup ratio: `1.7801354934775693`

## 验证
- `pnpm -C packages/logix-core exec vitest run test/internal/FieldPath/FieldPath.DirtySetReason.test.ts test/internal/Runtime/ModuleRuntime/ModuleRuntime.test.ts`

## 机器人 Review 消化
- Gemini Code Assist：仅 PR summary，无 actionable inline 建议。
- CodeRabbit：本轮仅 rate-limit 提示，无 actionable 代码建议。
