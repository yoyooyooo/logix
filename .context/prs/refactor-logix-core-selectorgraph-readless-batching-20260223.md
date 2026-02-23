# PR Draft: refactor/logix-core-selectorgraph-readless-batching-20260223

## 目标
- 优化 `SelectorGraph.onCommit` 的多 selector 热路径，降低同 rootKey 下 dirty root 重复扫描带来的额外开销。
- 修复 `reads=[]`（dynamic/readless）selector 在 `multi-selector + registry` 场景下可能漏评估的问题。

## 模块阅读范围
- `packages/logix-core/src/internal/runtime/core/SelectorGraph.ts`
- `packages/logix-core/src/internal/runtime/core/ReadQuery.ts`
- `packages/logix-core/test/Runtime/ModuleRuntime/SelectorGraph.test.ts`

## 本轮改动
- `packages/logix-core/src/internal/runtime/core/SelectorGraph.ts`
  - 新增 `selectorsWithoutReads` 索引，显式维护 `reads=[]` selector 集合。
  - `ensureEntry/releaseEntry` 同步维护 readless 索引，避免在 `onCommit` 里全表扫描识别 readless selector。
  - `onCommit` 在 `multi-selector + registry` 路径按 `rootKey` 批处理 dirty roots（`dirtyRootsByKey`），减少同 rootKey 下候选 selector 的重复遍历与 overlap 判断。
  - 当存在未知 dirty root（registry miss）时保留全量回退语义。
- `packages/logix-core/test/Runtime/ModuleRuntime/SelectorGraph.test.ts`
  - 新增回归：`recomputes readless selector in multi-selector mode when registry is available`。
  - 锁定行为：readless selector 在 registry 存在且 dirtyRoots 非空时仍应参与评估；同场景下无关 static selector 不被误触发。

## 验证
- `pnpm test -- test/Runtime/ModuleRuntime/SelectorGraph.test.ts`（`packages/logix-core`）✅
- `pnpm test -- test/Process/Process.Trigger.ModuleStateChange.test.ts test/Process/Process.Trigger.ModuleStateChange.SelectorDiagnostics.test.ts test/internal/Runtime/ModuleRuntime/ModuleRuntime.test.ts`（`packages/logix-core`）✅
- `pnpm typecheck` ✅
- `pnpm test:turbo` ✅

## 独立审查
- Reviewer：subagent（default，`agent_id=019c8b07-a145-7380-86a6-98109815f3ce`）
- 结论：无阻塞问题，可合并。
- 建议与处理：
  - 建议：补充 `releaseEntry` 清理路径与 unknown dirty root 回退分支的定向回归。
  - 处理：本轮先聚焦核心热路径与 readless 漏评估修复，建议用后续增量测试 PR 补齐上述边界用例。
