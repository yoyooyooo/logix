# 2026-03-19 · RuntimeStore / React bridge 旧桥接收口（top2-2）

## 范围

本线只做 identify note top2 的第二条：删除未接线旧桥接实现 `ModuleRuntimeExternalStore*` 的实现面，并统一收口到 `RuntimeExternalStore`。

- 对齐基线：
  - `docs/perf/archive/2026-03/2026-03-19-identify-runtimestore-reactbridge.md`
  - `docs/perf/archive/2026-03/2026-03-19-p1-4-crossplane-topic.md`
- 本线明确不做：
  - cross-plane cleanup 返工
  - selector/process 相关切口

## 代码改动

### 1) `ModuleRuntimeExternalStore.ts` 改为薄代理

文件：`packages/logix-react/src/internal/store/ModuleRuntimeExternalStore.ts`

- 删除旧桥接实现中的本地状态、fiber 订阅与调度逻辑：
  - `queueMicrotask`
  - `setTimeout`
  - `requestAnimationFrame`
- 保留旧入口函数名 `getModuleRuntimeExternalStore(...)`，内部直接转发到 `getRuntimeModuleExternalStore(...)`。
- `ExternalStore` / `ExternalStoreOptions` 类型来源统一为 `RuntimeExternalStore`。

结果：旧桥接实现代码面已收口，桥接语义单点回到 `RuntimeExternalStore`。

### 2) `RuntimeExternalStore.ts`

文件：`packages/logix-react/src/internal/store/RuntimeExternalStore.ts`

- 本线未新增分支、未改语义。
- `ModuleRuntimeExternalStore.ts` 的调用已全部落到该文件现有实现。

## 风险与约束核对

- 语义漂移风险：通过现有 `RuntimeExternalStore` 贴边测试覆盖低优先级调度、空闲拆卸、共享订阅和 readQuery retain scope。
- 兼容面：`ModuleRuntimeExternalStore.ts` 仍保留函数导出名，内部实现已切换，避免隐式内部引用在本轮直接断裂。
- 禁区核对：未改动 `SelectorGraph.ts`、`process/**`、`ModuleRuntime.dispatch.ts`。

## 验证

### 最小验证命令

1. `pnpm --dir packages/logix-react test -- --run test/internal/RuntimeExternalStore.lowPriority.test.ts test/internal/RuntimeExternalStore.idleTeardown.test.ts test/Hooks/useSelector.sharedSubscription.test.tsx test/Hooks/useSelector.readQueryRetainScope.test.tsx`
2. `pnpm --dir packages/logix-react typecheck`
3. `python3 fabfile.py probe_next_blocker --json`

### 结果

- 贴边测试：通过（4 files / 6 tests）
- `logix-react` typecheck：通过
- `probe_next_blocker`：
  - 第 1 次：`blocked`（`externalStore.ingest.tickNotify` 的 `full/off<=1.25`）
  - 第 2 次：`clear`

证据落盘：

- `specs/103-effect-v4-forward-cutover/perf/2026-03-19-reactbridge-cleanup.validation.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-19-reactbridge-cleanup.probe-next-blocker.json`

## 结果分类

`accepted_with_evidence`
