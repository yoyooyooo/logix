# Quickstart: FlowProgram IR（最小示例）

> 本文件用“可读的伪代码”展示目标 DX；具体 TypeScript 类型以实现为准。

## 你会感受到的好处（为什么值得）

- **可解释**：Devtools 能导出 Program 的 Static IR（programId/nodeId）并用 tickSeq 把因果链串起来。
- **可治理**：并发/取消/时间语义变成“显式 policy”，而不是散落在 watcher/计时器里。
- **少胶水**：把“监听 action → 组织步骤 → 处理成功失败”从手写 watcher 变为结构化声明；复杂细节下沉到 service/pattern。

## 示例 1：submit → API → success → router.push

```ts
import * as Logix from '@logix/core'

// 假设：SubmitApiTag / RouterTag 为 Tag-only service（具体定义省略）

const Module = Logix.Module.make('Checkout', {
  state: StateSchema,
  actions: Actions,
  reducers,
  traits: StateTraits,
})

// FlowProgram 作为可挂载逻辑（避免先改 Module 蓝图）
const SubmitFlow = Logix.FlowProgram.make('Checkout.submit', {
  trigger: Logix.FlowProgram.onAction('submit'),
  // 防重复提交：in-flight 时忽略后续 submit（典型表单语义）
  policy: { concurrency: 'exhaust', priority: 'urgent' },
  steps: [
    Logix.FlowProgram.dispatch('submitStarted'),
    Logix.FlowProgram.serviceCall('submitOrder', (ctx) => ({
      service: SubmitApiTag,
      input: ctx.action.payload,
      // 这些时间语义必须进入 tick 证据链（可解释/可回放）
      timeoutMs: 10_000,
      retry: { times: 2 },
    })),
    Logix.FlowProgram.onSuccess([
      Logix.FlowProgram.dispatch('submitSucceeded'),
      Logix.FlowProgram.serviceCall('navigate', () => ({
        service: RouterTag,
        input: { to: '/done' },
      })),
      // 需要强制刷新某个 manual-only source 时，可显式 refresh（写回仍进事务窗口）
      Logix.FlowProgram.traits.source.refresh('profile'),
      Logix.FlowProgram.dispatch('submitFinished'),
    ]),
    Logix.FlowProgram.onFailure([Logix.FlowProgram.dispatch('submitFailed'), Logix.FlowProgram.dispatch('submitFinished')]),
  ],
})

// 推荐 DX sugar（更少重复）：Module.withFlow(SubmitFlow)
// 等价写法（底层仍是挂载一个 ModuleLogic）：
export const Checkout = Module.withLogic(SubmitFlow.install(Module.tag))
```

## 安装与触发语义（你问的两点）

1) `install(Module.tag)` 为什么看起来重复？

- `FlowProgram` 被设计成“可复用的 Program 定义”，不强绑定某个 Module：因此需要 `install(moduleTag)` 这一步来完成“绑定模块形状 + 编译挂载”。
- `Module.withFlow(SubmitFlow)` 完全可以作为 sugar（内部就是 `withLogic(program.install(Module.tag))`），而且更适合多数业务写法；`install(tag)` 留给“在模块外部装配/复用 Program”的场景。

2) `trigger: onAction('submit')` 是不是“定义了一个 action”？

- 不是。`onAction('submit')` 表示**订阅这个模块的 action 流**里 `_tag === 'submit'` 的事件；`submit` 必须已经存在于 `Module.make(..., { actions })` 的 actions 里。
- 触发来自任意地方的 dispatch：例如 UI 调用 `module.actions.submit(payload)`（或其它逻辑 dispatch），FlowProgram watcher 才会运行。

## 示例 2：onStart 后 delay 3 秒 refresh

```ts
const RefreshFlow = Logix.FlowProgram.make('Profile.refreshOnStart', {
  trigger: Logix.FlowProgram.onStart(),
  steps: [
    Logix.FlowProgram.delay(3000),
    Logix.FlowProgram.traits.source.refresh('profile'),
  ],
})
```

关键目标：

- delay 必须进入 tick 参考系（可回放、可解释），禁止影子 setTimeout。

## 示例 3：搜索联想（debounce + runLatest + timeout）

```ts
const TypeaheadFlow = Logix.FlowProgram.make('Search.typeahead', {
  trigger: Logix.FlowProgram.onAction('keywordChanged'),
  // latest + delay = debounce：新输入会取消前一次 delay + 请求
  policy: { concurrency: 'latest', priority: 'urgent' },
  steps: [
    Logix.FlowProgram.delay(200),
    Logix.FlowProgram.serviceCall('fetchSuggestions', (ctx) => ({
      service: SuggestApiTag,
      input: { q: ctx.action.payload },
      timeoutMs: 1500,
    })),
    Logix.FlowProgram.onSuccess([Logix.FlowProgram.dispatch('suggestionsLoaded')]),
    Logix.FlowProgram.onFailure([Logix.FlowProgram.dispatch('suggestionsFailed')]),
  ],
})
```

你会得到：

- 自动取消（不需要手写 Fiber map / interrupt）
- debounce 的时间语义进入 tick（trace 可解释“为什么此刻触发”）

## 示例 4：乐观更新 + 回滚（compensation）

```ts
const ToggleFavoriteFlow = Logix.FlowProgram.make('Item.toggleFavorite', {
  trigger: Logix.FlowProgram.onAction('toggleFavorite'),
  policy: { concurrency: 'latest', priority: 'urgent' },
  steps: [
    Logix.FlowProgram.dispatch('favoriteOptimisticApplied'),
    Logix.FlowProgram.serviceCall('toggleFavoriteRemote', (ctx) => ({
      service: FavoriteApiTag,
      input: ctx.action.payload,
      timeoutMs: 5000,
    })),
    Logix.FlowProgram.onSuccess([Logix.FlowProgram.dispatch('favoriteCommitted')]),
    Logix.FlowProgram.onFailure([Logix.FlowProgram.dispatch('favoriteRollback')]),
  ],
})
```

好处是：补偿/回滚变成结构化分支，Devtools 能看到“哪一步失败→为何回滚”。

## 示例 5：把“复杂细节”下沉到 service/pattern（Program 保持结构）

当你需要并行请求、复杂合并、或大量条件分支时，推荐把复杂度放进 service/pattern：

```ts
const ImportFlow = Logix.FlowProgram.make('Import.submit', {
  trigger: Logix.FlowProgram.onAction('importSubmit'),
  policy: { concurrency: 'exhaust', priority: 'urgent' },
  steps: [
    Logix.FlowProgram.dispatch('importStarted'),
    Logix.FlowProgram.serviceCall('runImportPipeline', (ctx) => ({
      service: ImportPipelineTag, // 内部可用 Effect.all/match 做复杂编排
      input: ctx.action.payload,
    })),
    Logix.FlowProgram.onSuccess([Logix.FlowProgram.dispatch('importSucceeded'), Logix.FlowProgram.dispatch('importFinished')]),
    Logix.FlowProgram.onFailure([Logix.FlowProgram.dispatch('importFailed'), Logix.FlowProgram.dispatch('importFinished')]),
  ],
})
```

好处是：Program 的 IR 仍然稳定（触发/步骤/边界），复杂细节的“黑盒”被明确隔离在 service 内。

## 示例 6：和 073/076 组合（很多“刷新”其实不需要写 Program）

典型链路：“Router 外部输入变化 → 下游 query/source 刷新 → UI 读一致快照”：

```ts
const Traits = Logix.StateTrait.from(StateSchema)({
  // 073：externalStore 进入 tick 参考系（signal-dirty + pull snapshot），并写回事务窗口
  'inputs.router': Logix.StateTrait.externalStore({
    store: RouterExternalStore,
    select: (snap) => ({ pathname: snap.pathname, params: snap.params }),
  }),

  // 076：deps 变更自动触发 refresh（Π_source），不需要监听 action 写 watcher
  profile: Logix.StateTrait.source({
    deps: ['inputs.router.params.id'],
    resource: 'user/profile',
    key: (id) => (id ? { id } : undefined),
    // autoRefresh 默认开启：onMount + depsChange（debounce 也属于 Π_source 的受限能力）
  }),
})
```

你会得到：UI 不写“同步 useEffect”；Logic 不写“监听 router/反查 trait”；只声明绑定事实与收敛规则。

## 覆盖范围（v1 心智）

FlowProgram 覆盖的是“值得被 IR 化/治理”的控制律（`Π`），不是替代所有代码。

- **强覆盖**：submit 工作流、typeahead（debounce+latest）、防重复提交（exhaust）、补偿回滚、timeout/retry、显式 refresh（manual-only）。
- **与 076 协同**：常见 “deps 变更 → source 刷新” 交给内核 `Π_source`，不必为每个 source 写 Program。
- **不强行覆盖**：极少见的一次性边界逻辑可继续用 `module.logic` 写（代价：结构 IR 不完整；只能通过边界 trace 解释）。

## 是否会“过于限制”？

FlowProgram 看起来像 workflow，这是刻意的：它只覆盖那些**值得被 IR 化/可解释/可预算**的控制律（`Π`）。

- 不替代 `$.logic`：复杂或一次性的逻辑仍可用 `module.logic(($) => ...)` 写代码；只是这类黑盒逻辑很难被导出为结构 IR（Devtools 只能看到边界事件/trace 锚点）。
- 限制是能力：写侧默认走 `dispatch`，IO 只能通过 `serviceCall`（事务窗口外），时间算子必须对齐 tick（避免影子时间线）。
- 最佳扩展姿势：把复杂算法/集成细节封装成 service/pattern，在 FlowProgram 里用 `serviceCall` 调用（既保留表达力，也保留结构与诊断边界）。
