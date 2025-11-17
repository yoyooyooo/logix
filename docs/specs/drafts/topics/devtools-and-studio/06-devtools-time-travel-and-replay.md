---
title: Logix Devtools Time Travel & Replay (Draft)
status: draft
version: 0.1.0
layer: L6
value: core
priority: 1800
related:
  - ./03-debug-roadmap.md
  - ./04-devtools-and-runtime-tree.md
  - .codex/skills/project-guide/references/runtime-logix/logix-core/observability/09-debugging.md
---

# Logix Devtools Time Travel & Replay（草案）

> 目标：在现有 Devtools v1（Runtime / Module / Instance + Timeline + 状态快照）的基础上，设计一条可渐进落地的 Time Travel / Replay 方案，使 Logix 应用可以在开发环境下类似 Redux DevTools 那样「回看任意事件当时的状态」，并为后续更完整的 Replay / Trace 视图打基础。

## 0. 现状小结（2025-12）

- Debug 事件与快照：
  - `@logix/core` 的 `ModuleRuntime` 已在以下时机通过 `Debug.record` 发送事件：
    - `module:init` / `module:destroy`：携带 `moduleId` / `instanceId` / （可选）`runtimeLabel`；
    - `action:dispatch`：携带 `moduleId` / `instanceId` 以及原始 `action`；
    - `state:update`：携带 `moduleId` / `instanceId` 以及更新后的完整 `state`；
    - `lifecycle:error` / `diagnostic`：用于错误与诊断。
  - `@logix/devtools-react` 的 `devtoolsLayer` 基于 Debug API 组合了一个内存快照：
    - `ModuleRuntimeCounter`：按 `runtimeLabel::moduleId` 统计活跃实例数；
    - `RingBufferSink`：保留最近 N 条 Debug 事件（当前 500 条）；
    - `latestStates`：按 `runtimeLabel::moduleId::instanceId` 维度记录最近一次 `state:update` 的完整状态。
- Devtools v1 视图：
  - 左列：Runtime 列表（按 `runtimeLabel` 分组）；
  - 中列：选中 Runtime 下的 Module 列表 + 实例数量；
  - 右列：
    - 顶部：Selected Event 区域，展示当前选中事件的 type / payload；
    - 底部：State JSON 区块，展示选中实例在某条事件后的 `state` 快照（或退化为 latest state）。
  - 当前实现已具备「事件级状态快照」能力，但 UI 与 DevtoolsState 尚未完全对齐 Redux DevTools 风格的「按事件回看当时状态」：
    - 部分逻辑仍偏向“总是展示最新状态”，而不是严格区分“当前事件后的状态”与“最新状态”；
    - 尚未提供真正的 time travel（回写业务 Runtime 状态），仅是视图级回看。

## 1. 设计目标与边界

### 1.1 Time Travel 的目标

- Primary 目标（短期）：
  - 在 Devtools 的 Timeline 中点击任意事件时，右侧 Inspector 能稳定展示「该事件发生之后的模块状态」，而不是被最新 state 覆盖；
  - 在同一 Module 实例下，事件序列形成一条「state:update 快照链」，开发者可以直观对比任意两步之间的状态差异（先以肉眼 JSON 对比为主，后续可考虑 diff 高亮）。
- Secondary 目标（中期）：
  - 支持“业务状态 Time Travel”：Devtools 可以将真实业务 ModuleRuntime 的 state 回跳到某条事件之后的状态，React 组件同步随之更新；
  - 提供「Back to live」/「Resume」能力，将业务状态从历史点恢复到最新状态。

### 1.2 非目标与风险边界

- Time Travel 不负责撤销已发生的外部副作用（网络请求、日志、外部存储写入等），仅对 Logix 模块内部 state 做回滚：
  - 必须在文档与 UI 上明确提示：“Time Travel 只回滚状态，不回滚外部世界”；
  - 对强依赖时间 / 顺序的复杂业务流程，time travel 后的状态可能是“历史上曾经出现过，但与当前外部世界不再完全匹配”的调试态。
- 初期不引入完整的 “Action Replay Engine”：
  - 不要求从初始状态开始重放全部 action 链条再到某个 index；
  - 优先实现“直接使用当时的 `state` 快照进行回写”的快捷方案，为后续 Replay 做铺垫。

## 2. 数据面设计：Timeline & State Snapshots

### 2.1 DevtoolsSnapshot 与 TimelineEntry（现状）

- 当前 `DevtoolsSnapshot` 结构：
  - `instances: ReadonlyMap<string, number>`：来自 ModuleRuntimeCounter（按 `runtimeLabel::moduleId` 聚合）；
  - `events: ReadonlyArray<Debug.Event>`：RingBuffer 中最近 N 条 Debug 事件；
  - `latestStates: ReadonlyMap<string, unknown>`：按 `runtimeLabel::moduleId::instanceId` 记录最近一次 `state:update` 的 state。
- `DevtoolsState.timeline`（在 devtools-react 中）：
  - 每个元素是 `TimelineEntry = { event, stateAfter? }`；
  - 构造逻辑（针对当前选中的 runtime/module/instance）：
    - 遍历 `snapshot.events`，过滤出满足 runtime/module/instance 的事件序列；
    - 在遍历过程中，维护一个 `lastStateByInstance`（按 runtimeLabel/moduleId/instanceId）：
      - 对 `state:update`：`stateAfter = event.state`，并更新 `lastStateByInstance`；
      - 对其它事件：`stateAfter = lastStateByInstance.get(instanceKey)`，表示“该事件之后的状态（如果已有快照）”。
    - 对时间线长度做窗口截断（如仅保留最近 50 条）。

### 2.2 Time Travel 视角下的约束

为支撑 time travel / replay，Timeline 与 Snapshot 需满足：

1. **状态快照与事件严格顺序对应**  
   - 对于同一实例（runtimeLabel/moduleId/instanceId），每个 state:update 必须被视为“完整状态快照”，在时间轴上作为关键帧；
   - 其它事件的 `stateAfter` 必须是“最近一次 state:update 之后的状态”，而不能在后续某处被重写为“最新状态”。
2. **DevtoolsState 必须区分“查看模式”与“实时模式”**  
   - 在“查看模式”（用户主动点击某条事件）下：
     - Inspector 应优先展示当前事件对应的 `stateAfter`（若存在），即使这不是最新状态；
     - 若该事件没有独立快照（例如早期 trace / diagnostic），应显式显示“无快照”，而不是悄悄退回 latest state。
   - 在“实时模式”（未选中具体事件，或用户点击 Back to live）下：
     - Inspector 可以将 `activeState` 视为 `latestStates` 中的最新值。

## 3. Time Travel 核心机制：TimeTravelRegistry

### 3.1 问题：如何从 Debug 事件回到模块实例？

Devtools 当前只掌握 `(runtimeLabel, moduleId, instanceId)` 和对应的 `stateAfter`，但无法直接操作业务 ModuleRuntime，因此需要引入一个统一的运行时注册表：

- `TimeTravelRegistry`（草案接口）：

```ts
interface TimeTravelRegistry {
  registerInstance(key: {
    runtimeLabel?: string
    moduleId?: string
    instanceId: string
  }, handle: {
    getState: () => Effect.Effect<unknown, never, never>
    setState: (state: unknown) => Effect.Effect<void, never, never>
  }): void

  unregisterInstance(key: {
    runtimeLabel?: string
    moduleId?: string
    instanceId: string
  }): void

  lookupInstance(key: {
    runtimeLabel?: string
    moduleId?: string
    instanceId: string
  }): { getState: () => Effect.Effect<unknown, never, never>; setState: (state: unknown) => Effect.Effect<void, never, never> } | undefined
}
```

### 3.2 注册表的落点与生命周期

- 落点建议：
  - 类型与 Tag 放在 `@logix/core` 的 `Debug` 或 `internal/runtime/core` 命名空间中；
  - 具体实现由 `devtoolsLayer` 提供，以避免在默认 Runtime 下引入额外开销。
- 生命周期：
  - 在 `ModuleRuntime.make` 中：
    - `module:init` 完成后调用 `TimeTravelRegistry.registerInstance`；
    - 在 ModuleRuntime scope 生命周期结束（或 `module:destroy` Debug 事件产生）时调用 `unregisterInstance`；
  - 注册表内部可以使用 `Map<string, Handle>`，key 形式为 `runtimeLabel::moduleId::instanceId`（与 DevtoolsSnapshot 一致）。

## 4. DevtoolsModule 行为扩展：jumpTo / resume

### 4.1 DevtoolsState 扩展字段

在 `DevtoolsState` 中增加：

- `timeTraveling?: boolean`：当前是否处于 time travel 模式；
- `viewMode?: "live" | "event"`：显示是“实时状态”还是“事件后的状态”（可选字段，用于 UI 文案）。

### 4.2 新增 Actions

- `jumpToEventIndex: Schema.Struct<{ index: Schema.Number }>`  
  - 用户在 Timeline 中点击「Jump」或双击某条事件时触发。
- `resumeLive: Schema.Void`  
  - 用户点击「Back to live」按钮时触发。

### 4.3 jumpToEventIndex 行为（伪代码）

```ts
$.onAction("jumpToEventIndex").run((action) =>
  $.state.update((prev) =>
    Effect.gen(function* () {
      const snapshot = getDevtoolsSnapshot()
      const base = prev as DevtoolsState | undefined

      const { selectedRuntime, selectedModule, selectedInstance } =
        computeSelection(base, snapshot) // 复用现有 selection 逻辑

      const timeline = buildTimelineForSelection(snapshot, {
        runtime: selectedRuntime,
        module: selectedModule,
        instance: selectedInstance,
      })

      const entry = timeline[action.payload.index]
      if (!entry) return base ?? emptyDevtoolsState

      const stateAfter = entry.stateAfter
      const event = entry.event
      const key = {
        runtimeLabel: selectedRuntime,
        moduleId: selectedModule,
        instanceId: selectedInstance,
      }

      // 业务实例回写
      if (stateAfter !== undefined) {
        const registry = yield* TimeTravelRegistryTag // 通过 Tag 获取 registry
        const handle = registry.lookupInstance(key)
        if (handle) {
          yield* handle.setState(stateAfter)
        }
      }

      return {
        ...computeDevtoolsState(base, snapshot, {
          selectedEventIndex: action.payload.index,
          userSelectedEvent: true,
        }),
        timeTraveling: true,
      }
    }),
  ),
)
```

### 4.4 resumeLive 行为

- 从 `snapshot.latestStates` 中取出当前选中实例的最新 state，并通过 `registry.setState` 回写；
- 将 `DevtoolsState.timeTraveling` 置为 `false`，`selectedEventIndex` 可以跳到 timeline 的最后一条（或置空表示“未选中具体事件”）。

## 5. Devtools UI 增强：Jump & Back to live

### 5.1 Timeline 上的 Jump 控件

- 在 Timeline 的每条事件行上增加一个「●」或「Jump」小按钮（悬停可见），点击时派发 `jumpToEventIndex`；
- 双击事件行也可以作为快捷触发 jump。

### 5.2 Inspector 顶部的模式提示

- 当 `timeTraveling: true` 时：
  - 在 Inspector 顶部显示一条状态条，例如：
    - `Time travel: viewing state after event #23 (AppDemoRuntime / AppCounter / <instanceId>)`
  - 提供一个 `Back to live` 按钮，点击后派发 `resumeLive`。
- 当不在 time travel 模式时：
  - Inspector 标题保持当前的 `Current State` / `State After Event` 文案即可。

## 6. 渐进落地计划

1. **阶段 1：修正视图层的「当时状态」语义（不改业务状态）**  
   - 清理 `DevtoolsState` 与 Inspector 的行为，确保：
     - `selectedEventIndex` 每次变化时，右侧 JSON 确实展示该事件的 `stateAfter`；
     - 不再在“用户选中事件”的情况下悄然 fallback 到 `latestStates`。
   - 验证示例：`examples/logix-react/src/demos/AppDemoLayout.tsx` 计数器，点击多次 +1 后，Timeline 上不同 `state:update` 事件应显示递增的 count。
2. **阶段 2：引入 `TimeTravelRegistry`（不暴露到公开 API）**  
   - 在 `@logix/core` internal 中增加 registry 接口与 Tag；
   - 在 `ModuleRuntime.make` 中注册/注销实例；
   - 在 `devtoolsLayer` 中提供一个默认实现，并验证 registry 与 DebugSnapshot 的 key 对齐。
3. **阶段 3：DevtoolsModule & UI 支持 jump/resume**  
   - 按 4/5 节设计实现 `jumpToEventIndex` / `resumeLive` 行为与 UI 控件；
   - 在 `examples/logix-react` 中跑通一个端到端场景（如 AppDemo 计数器），验证：
     - 点击 Jump 后，业务 UI（计数器）能跳回对应 count；
     - 点击 Back to live 后，状态回到最新值。
4. **阶段 4：文档与规范收敛**  
   - 在 `.codex/skills/project-guide/references/runtime-logix/logix-core/observability/09-debugging.md` 中补充：  
     - Debug 事件与 TimeTravelRegistry 的约束与语义；  
     - Time Travel 模式的边界与风险提醒。  
   - 在 devtools roadmap 草案中将本文件的结论合并为一个「Time Travel & Replay」小节。

## 7. 开放问题

- 是否需要为每条 DebugEvent 引入稳定的 `eventId` / `sequenceId`，以便在网络传输或多消费端场景下保持顺序一致？
- Time Travel 时是否需要提供“只回写部分字段”的能力（例如只回滚 form state，不回滚整个模块）？
- 在未来引入完整 Replay 能力时，如何优雅区分：
  - “真实执行 Replay”（可能触发副作用）；
  - “纯计算 Replay”（只用 reducer/Flow 计算 state，不触发外部副作用）。
