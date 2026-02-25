# Data Model: O-006 Runtime Assembly Graph

## 1. AssemblyStageId

```ts
type AssemblyStageId =
  | 'validate.modules'
  | 'validate.tags'
  | 'build.baseLayer'
  | 'build.baseEnv'
  | 'build.moduleEnvs'
  | 'merge.env'
  | 'rootContext.merge'
  | 'rootContext.ready'
  | 'process.install'
```

## 2. AssemblyStageStatus

```ts
type AssemblyStageStatus = 'pending' | 'running' | 'succeeded' | 'failed' | 'skipped'
```

## 3. AppAssemblyGraphNode

```ts
interface AppAssemblyGraphNode {
  stageId: AssemblyStageId
  stageSeq: number
  dependsOn: ReadonlyArray<AssemblyStageId>
  status: AssemblyStageStatus
  startedAtMs?: number
  endedAtMs?: number
  durationMs?: number
  reasonCode?: string
  message?: string
}
```

约束：

- `stageSeq` 在一次启动内单调递增，且同输入配置下保持稳定。
- `dependsOn` 固定由阶段拓扑决定，不依赖运行时随机条件。

## 4. RootContextLifecycleRecord

```ts
interface RootContextLifecycleRecord {
  state: 'uninitialized' | 'merged' | 'ready' | 'failed'
  mergedAtStageSeq?: number
  readyAtStageSeq?: number
  reasonCode?: string
}
```

## 5. BootFailureDiagnostic

```ts
interface BootFailureDiagnostic {
  stageId: AssemblyStageId
  stageSeq: number
  reasonCode:
    | 'boot::module_duplicate'
    | 'boot::tag_collision'
    | 'boot::base_layer_build_failed'
    | 'boot::module_layer_build_failed'
    | 'boot::env_merge_failed'
    | 'boot::root_context_merge_failed'
    | 'boot::root_context_ready_failed'
    | 'boot::process_install_failed'
    | 'boot::unknown'
  message: string
  upstreamStages: ReadonlyArray<AssemblyStageId>
}
```

## 6. BootAssemblyReport

```ts
interface BootAssemblyReport {
  version: 1
  appId: string
  success: boolean
  nodes: ReadonlyArray<AppAssemblyGraphNode>
  rootContextLifecycle: RootContextLifecycleRecord
  failure?: BootFailureDiagnostic
}
```

## 7. 状态转移

- 启动开始：所有节点 `pending`。
- 阶段运行：`pending -> running -> succeeded|failed`。
- 若前置阶段失败：后续阶段标记为 `skipped`。
- `rootContextLifecycle`：
  - 初始 `uninitialized`
  - `rootContext.merge` 成功后 `merged`
  - `rootContext.ready` 成功后 `ready`
  - 任意 RootContext 阶段失败后 `failed`
