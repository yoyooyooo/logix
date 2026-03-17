# 2026-03-19 · RuntimeStore / React bridge 只读识别

## 范围与约束

- 只读识别对象：`RuntimeStore`、`TickScheduler`、`RuntimeExternalStore`、`ModuleRuntimeExternalStore`
- 本 note 只给 future-only 开线候选
- 已吸收切口视为基线，避免重复：
  - `P1-4 cross-plane topic`（`docs/perf/archive/2026-03/2026-03-19-p1-4-crossplane-topic.md`）
  - `P2-3b process shared bus`（`docs/perf/archive/2026-03/2026-03-19-p2-3b-process-bus.md`）

## top2（future-only）

### top1：cross-plane 旧路径收口（去 `LOGIX_CROSSPLANE_TOPIC` 双分支）

#### 识别依据

- `TickScheduler` 仍保留 `crossPlaneTopicEnabled` 双路径，包含 legacy 的 `topicKey` 解析缓存与分支：
  - `storeTopicToModuleInstanceKey(...)`
  - `hasSelectorTopicSubscribers(...)`
  - `onSelectorChanged(...)`
  - 文件：`packages/logix-core/src/internal/runtime/core/TickScheduler.ts`
- `RuntimeExternalStore` 仍保留同一环境变量分支与本地 key 拼接回退：
  - `crossPlaneTopicEnabled`
  - `resolveModuleTopicKey(...)`
  - `resolveReadQueryTopicKey(...)`
  - 文件：`packages/logix-react/src/internal/store/RuntimeExternalStore.ts`
- `P1-4` 已经证明 cross-plane topic 语义与收益成立，legacy 分支当前主要承担对照与回退用途。

#### 正面收益

- 移除热路径分支判断与 legacy 解析缓存，降低常数开销和维护面。
- 统一 topic 口径到 `RuntimeStore`，减少 core/react 双侧漂移风险。
- 简化后续诊断链路，topic 分类与订阅判定来源更单一。

#### 反面风险

- 失去 runtime 级环境回退开关，定位回归时少一条快速 A/B 手段。
- 少量依赖 `LOGIX_CROSSPLANE_TOPIC=0` 的测试或脚本需要同步迁移。

#### API 变动

- 外部 public API 预期不变。
- 运行时行为开关变动：内部环境开关 `LOGIX_CROSSPLANE_TOPIC` 可删除，属于破坏性运维开关调整。

#### 最小验证命令

```bash
pnpm --dir packages/logix-core test -- --run test/internal/Runtime/TickScheduler.topic-classification.test.ts test/internal/Runtime/TickScheduler.listenerFanout.postCommit.test.ts test/internal/Runtime/RuntimeStore.listenerSnapshot.test.ts
pnpm --dir packages/logix-react test -- --run test/internal/RuntimeExternalStore.lowPriority.test.ts test/internal/RuntimeExternalStore.idleTeardown.test.ts
pnpm --dir packages/logix-core typecheck
pnpm --dir packages/logix-react typecheck
```

### top2：删除未接线的旧桥接实现（`ModuleRuntimeExternalStore*`）

#### 识别依据

- `useSelector` 已统一走 `RuntimeExternalStore`：
  - `getRuntimeModuleExternalStore(...)`
  - `getRuntimeReadQueryExternalStore(...)`
  - 文件：`packages/logix-react/src/internal/hooks/useSelector.ts`
- `ModuleRuntimeExternalStore.ts`、`ModuleRuntimeSelectorExternalStore.ts` 仍在仓库中，当前未被 `src` 其他模块引用：
  - 文件：`packages/logix-react/src/internal/store/ModuleRuntimeExternalStore.ts`
  - 文件：`packages/logix-react/src/internal/store/ModuleRuntimeSelectorExternalStore.ts`
- 两个旧文件维护独立调度语义（`queueMicrotask`、`setTimeout`、`requestAnimationFrame`）和独立 fiber 订阅生命周期，和 `RuntimeExternalStore` 的 hostScheduler 接线形成重复实现面。

#### 正面收益

- 降低 React bridge 双实现并行维护成本。
- 避免调度策略分叉，减少未来“同类问题修两套”的概率。

#### 反面风险

- 若存在仓库外或隐式内部引用，会出现编译或行为断裂。
- 删除后需要一次性补齐文档和迁移说明，避免团队认知残留。

#### API 变动

- public API 预期不变（当前未从 `packages/logix-react/src/index.ts` 暴露）。
- internal file surface 会发生删除或冻结，属于内部破坏式清理。

#### 最小验证命令

```bash
pnpm --dir packages/logix-react typecheck
pnpm --dir packages/logix-react test -- --run test/Hooks/useSelector.sharedSubscription.test.tsx test/Hooks/useSelector.readQueryRetainScope.test.tsx test/internal/RuntimeExternalStore.lowPriority.test.ts test/internal/RuntimeExternalStore.idleTeardown.test.ts
```

## 唯一建议下一线

`top1：cross-plane 旧路径收口（去 LOGIX_CROSSPLANE_TOPIC 双分支）`

理由：收益面覆盖 `RuntimeStore ↔ TickScheduler ↔ RuntimeExternalStore` 三方交界，且实现复杂度低于重开新的 bridge 形态调整；同时避免重做已吸收的 `P1-4/P2-3b` 既有成果。

## 是否建议后续开实施线

建议开一条实施线，优先做 top1。top2 可作为同轮后置清理或独立小线。
