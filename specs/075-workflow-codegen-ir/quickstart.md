# Quickstart: Workflow IR（最小示例）

> 本文件用“可读的伪代码”展示目标 DX；具体 TypeScript 类型以实现为准。

## 你会感受到的好处（为什么值得）

- **可解释**：Devtools 能导出 Program 的 Static IR（programId/nodeId）并用 tickSeq 把因果链串起来。
- **可治理**：并发/取消/时间语义变成“显式 policy”，而不是散落在 watcher/计时器里。
- **少胶水**：把“监听 action → 组织步骤 → 处理成功失败”从手写 watcher 变为结构化出码（Recipe/AI/Studio → Canonical AST → Static IR）；复杂细节下沉到 service/pattern。

## v1 定位（先读）

Workflow v1 明确定位为 **AI/平台专属出码层（IR DSL）**：

- 人类日常不需要手写完整 Program 图；推荐通过 Recipe（压缩输入）或 Studio/AI 直接产出 Canonical AST。
- Canonical AST 是语义规范形：无语法糖、分支显式、`stepKey` 必填；Static IR 是其可导出投影（version+digest+nodes/edges）。
- `call` v1 不提供结果数据流；若需要“基于结果计算后续 payload/分支”，必须下沉到 service 或拆分多个 Program 通过 action 串联。

## 示例 1：submit → API → success（Recipe → Canonical AST）

### 1.1 Recipe 输入（压缩）

```ts
const SubmitRecipe = {
  recipe: 'submit',
  version: 1,
  localId: 'submit',
  on: { actionTag: 'submit' },
  api: { serviceId: 'Checkout.SubmitOrder', timeoutMs: 10_000, retry: { times: 2 } },
  events: { started: 'submitStarted', succeeded: 'submitSucceeded', failed: 'submitFailed' },
  refresh: { fieldPaths: ['profile'] },
} as const
```

### 1.2 展开后的 Canonical AST（规范形，纯数据）

```ts
const SubmitCanonicalAst = {
  astVersion: 1,
  localId: 'submit',
  trigger: { kind: 'action', actionTag: 'submit' },
  policy: { concurrency: 'exhaust', priority: 'urgent' },
  steps: [
    { kind: 'dispatch', key: 'started', actionTag: 'submitStarted' },
    {
      kind: 'call',
      key: 'call',
      serviceId: 'Checkout.SubmitOrder',
      input: { kind: 'payload' },
      timeoutMs: 10_000,
      retry: { times: 2 },
      onSuccess: [
        { kind: 'dispatch', key: 'succeeded', actionTag: 'submitSucceeded' },
        {
          kind: 'call',
          key: 'kernel.sourceRefresh.profile',
          serviceId: 'logix/kernel/sourceRefresh',
          input: { kind: 'object', fields: { fieldPath: { kind: 'const', value: 'profile' } } },
          onSuccess: [],
          onFailure: [],
        },
      ],
      onFailure: [{ kind: 'dispatch', key: 'failed', actionTag: 'submitFailed' }],
    },
  ],
  meta: { generator: { kind: 'recipe', name: 'submit', version: 1 } },
} as const
```

### 1.3 validate/export（导出期强校验）

> 关键点：所有错误必须在 validate/export 暴露；运行时不承担校验成本。

## 安装与触发语义

1) 为什么有 `install(Module.tag)` 这种“看起来重复”的 API？

- `Workflow` 被设计成“可复用的 Program 定义”，不强绑定某个 Module：因此需要 `install(moduleTag)` 这一步来完成“绑定模块形状 + 编译挂载”。
- 大多数业务推荐只用 `Module.withWorkflow(program)`；平台/AI 出码（大量 programs）推荐用 `Module.withWorkflows(programs)` 避免 watcher 订阅膨胀；`install(tag)` 主要留给“在模块外部装配/复用 Program”的高级场景。

2) `trigger: onAction('submit')` 是不是“定义了一个 action”？

- 不是。`onAction('submit')` 表示**订阅这个模块的 action 流**里 `_tag === 'submit'` 的事件；`submit` 必须已经存在于 `Module.make(..., { actions })` 的 actions 里。
- 触发来自任意地方的 dispatch：例如 UI 调用 `module.actions.submit(payload)`（或其它逻辑 dispatch），Workflow watcher 才会运行。

## 示例 2：onStart 后 delay 3 秒 refresh

```ts
const RefreshCanonicalAst = {
  astVersion: 1,
  localId: 'refreshOnStart',
  trigger: { kind: 'lifecycle', phase: 'onStart' },
  steps: [
    { kind: 'delay', key: 'delay', ms: 3000 },
    {
      kind: 'call',
      key: 'kernel.sourceRefresh.profile',
      serviceId: 'logix/kernel/sourceRefresh',
      input: { kind: 'object', fields: { fieldPath: { kind: 'const', value: 'profile' } } },
      onSuccess: [],
      onFailure: [],
    },
  ],
} as const
```

关键目标：

- delay 必须进入 tick 参考系（可回放、可解释），禁止影子 setTimeout。

## 示例 3：搜索联想（debounce + runLatest + timeout）

```ts
const TypeaheadCanonicalAst = {
  astVersion: 1,
  localId: 'typeahead',
  trigger: { kind: 'action', actionTag: 'keywordChanged' },
  policy: { concurrency: 'latest', priority: 'urgent' },
  steps: [
    { kind: 'delay', key: 'debounce', ms: 200 },
    {
      kind: 'call',
      key: 'call',
      serviceId: 'Search.Suggest',
      input: { kind: 'object', fields: { q: { kind: 'payload.path', pointer: '' } } },
      timeoutMs: 1500,
      onSuccess: [{ kind: 'dispatch', key: 'loaded', actionTag: 'suggestionsLoaded' }],
      onFailure: [{ kind: 'dispatch', key: 'failed', actionTag: 'suggestionsFailed' }],
    },
  ],
} as const
```

你会得到：

- 自动取消（不需要手写 Fiber map / interrupt）
- debounce 的时间语义进入 tick（trace 可解释“为什么此刻触发”）

## 示例 4：乐观更新 + 回滚（compensation）

```ts
const ToggleFavoriteCanonicalAst = {
  astVersion: 1,
  localId: 'toggleFavorite',
  trigger: { kind: 'action', actionTag: 'toggleFavorite' },
  policy: { concurrency: 'latest', priority: 'urgent' },
  steps: [
    { kind: 'dispatch', key: 'optimistic', actionTag: 'favoriteOptimisticApplied' },
    {
      kind: 'call',
      key: 'call',
      serviceId: 'Item.ToggleFavorite',
      input: { kind: 'payload' },
      timeoutMs: 5000,
      onSuccess: [{ kind: 'dispatch', key: 'commit', actionTag: 'favoriteCommitted' }],
      onFailure: [{ kind: 'dispatch', key: 'rollback', actionTag: 'favoriteRollback' }],
    },
  ],
} as const
```

好处是：补偿/回滚变成结构化分支，Devtools 能看到“哪一步失败→为何回滚”。

## 示例 5：把“复杂细节”下沉到 service/pattern（Program 保持结构）

当你需要并行请求、复杂合并、或大量条件分支时，推荐把复杂度放进 service/pattern：

```ts
const ImportCanonicalAst = {
  astVersion: 1,
  localId: 'importSubmit',
  trigger: { kind: 'action', actionTag: 'importSubmit' },
  policy: { concurrency: 'exhaust', priority: 'urgent' },
  steps: [
    { kind: 'dispatch', key: 'started', actionTag: 'importStarted' },
    {
      kind: 'call',
      key: 'call',
      serviceId: 'Import.Pipeline',
      input: { kind: 'payload' },
      onSuccess: [
        { kind: 'dispatch', key: 'succeeded', actionTag: 'importSucceeded' },
        { kind: 'dispatch', key: 'finished', actionTag: 'importFinished' },
      ],
      onFailure: [
        { kind: 'dispatch', key: 'failed', actionTag: 'importFailed' },
        { kind: 'dispatch', key: 'finished', actionTag: 'importFinished' },
      ],
    },
  ],
} as const
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

Workflow 覆盖的是“值得被 IR 化/治理”的控制律（`Π`），不是替代所有代码。

- **强覆盖**：submit 工作流、typeahead（debounce+latest）、防重复提交（exhaust）、补偿回滚、timeout/retry、显式 refresh（manual-only）。
- **与 076 协同**：常见 “deps 变更 → source 刷新” 交给内核 `Π_source`，不必为每个 source 写 Program。
- **不强行覆盖**：极少见的一次性边界逻辑可继续用 `module.logic` 写（代价：结构 IR 不完整；只能通过边界 trace 解释）。

## 是否会“过于限制”？

Workflow 看起来像 workflow，这是刻意的：它只覆盖那些**值得被 IR 化/可解释/可预算**的控制律（`Π`）。

- 不替代 `$.logic`：复杂或一次性的逻辑仍可用 `module.logic(($) => ...)` 写代码；只是这类黑盒逻辑很难被导出为结构 IR（Devtools 只能看到边界事件/trace 锚点）。
- 限制是能力：写侧默认走 `dispatch`，IO 只能通过 `call`（事务窗口外），时间算子必须对齐 tick（避免影子时间线）。
- 最佳扩展姿势：把复杂算法/集成细节封装成 service/pattern，在 Workflow 里用 `call` 调用（既保留表达力，也保留结构与诊断边界）。
