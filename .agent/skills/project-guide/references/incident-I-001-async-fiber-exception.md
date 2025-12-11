# I-001 · React + Logix Runtime：AsyncFiberException（runSync 碰上异步 Env/Layer）

> 目的：记录一条已经完整走通的长链路问题，方便后续遇到类似症状时可以直接对照，而不用重新在代码里“盲人摸象”。

---

## 症状与触发场景

- 典型报错：
  - 浏览器或 Vitest 输出：
    - `(FiberFailure) AsyncFiberException: Fiber #X cannot be resolved synchronously. This is caused by using runSync on an effect that performs async work`
- 已观测触发场景：
  - `examples/logix-react/src/demos/AppDemoLayout.tsx` 中，为 Runtime 挂上 `Debug.layer({ mode: 'dev' })` / `Debug.traceLayer(...)` 后，在 React 环境中渲染示例；
  - `examples/logix-sandbox-mvp` 集成 `@logix/sandbox`（Worker + wasm）后，初次加载页面或触发运行。

> 直觉：只要在“看起来应该是同步初始化”的路径上，Effect 抱怨遇到了异步工作，就优先怀疑属于本条 Incident。

---

## 根因模式：runSync + 异步 Env / Layer / Logic 构造

抽象一下，本质上是 **在「需要严格同步结束」的初始化链路里，偷偷做了异步工作**，典型有三类：

### 1. Runtime 构造阶段：ModuleRuntime.setup 写了异步

背景：

- `ModuleRuntime.make` 在 Runtime 构造路径上通过 `runSync` 执行，以便：
  - 同步完成初始 state；
  - 同步挂上 reducer / watcher / lifecycle；
  - 再把 `run` 段以 fork 的方式长期跑在后台。

错误模式：

- 在 Logic 的 **setup 段** 中写入真实的异步逻辑，例如：
  - `yield* Effect.sleep(...)`
  - `yield* Effect.tryPromise(...)`
  - 直接 `yield* Stream.runForEach(...)` 等价于在构造阶段就跑一个长生命周期流；
  - 或者在 setup 段调用了只在 run 段才安全的 API（`$.onAction / $.use / $.lifecycle.onInit / $.on` 等），间接触发 Env / 外部服务。

结果：

- `ModuleRuntime.make` 的构造 Effect 不再是纯同步程序，`runSync` 在等待异步 fiber 时抛出 `AsyncFiberException`，并沿 React / Runtime 链路向上冒泡。

### 2. React 集成：在 render 链路对 Runtime 调用 runSync

历史实现里有几处高危路径：

1. **RuntimeProvider layer 绑定：**

   - 旧实现中在组件渲染期用：
     - `runtime.runSync(Layer.buildWithScope(layer, scope))`
   - 一旦业务传入的 `layer` 内部包含异步初始化（例如未来的 sandbox Env / 外部服务连接），就会触发 `AsyncFiberException`。

2. **ReactModuleConfig 配置读取：**

   - 曾经通过：
     - `runtime.runSync(ReactModuleConfig.gcTime)`
     - `runtime.runSync(ReactModuleConfig.initTimeoutMs)`
   - 间接让“读取配置”这一步也触发 Runtime.layer 的构建，如果 layer 内含异步，结果同上。

3. **ModuleCache.readSync：**

   - 同步模式 `useModule(Impl)` 会走 `ModuleCache.readSync(...)`：
     - 内部通过 `this.runtime.runSync(Scope.make())` + `this.runtime.runSync(factory(scope))` 构建新 ModuleRuntime；
   - 当 factory 和 Runtime.layer 组合在一起引入异步 Layer 时，会在这里集中爆炸。

### 3. Playground / Sandbox：异步 Layer / Worker 初始化

在 sandbox MVP 中，真正的异步点集中在：

- Worker 里：
  - `handleInit`：`await initCompiler(wasmUrl)` 加载 `esbuild.wasm`，并设置 kernel bundle 路径；
  - `handleCompile`：`await compile(code, filename)` 走 wasm 编译；
  - `handleRun`：
    - 用 Blob + `import(blobUrl)` 动态加载用户编译产物；
    - `await import("https://esm.sh/effect@3.19.8")` 拉取 effect runtime；
    - `await EffectRuntime.runPromise(effectToRun)` 执行 effect 程序。
- Host（浏览器主线程）里的 SandboxClient：
  - `init/compile/run/uiCallback` 都是 `new Promise(...)` + Worker postMessage + 超时控制；
- service 层：这些 Promise 被包成 `Effect.tryPromise(...)`。

设计上我们已经把这些异步点都放在 **Logic run 段**，而不是 Layer 构造中；但如果未来在别处“把这些服务挂进初始化 Layer 并通过 runSync 构建”，就等价于把上面的异步链路重新塞回构造阶段。

---

## 方案与当前实现：Phase Guard + React 适配层修复

### A. Phase Guard：setup / run 分离与降级处理

文件：`packages/logix-core/src/internal/runtime/ModuleRuntime.ts` + `BoundApiRuntime.ts`

关键设计：

- 引入 `PhaseRef` + 全局 `globalLogicPhaseRef`：
  - 明确区分 Logic 的 `setup` 与 `run`；
  - Bound API 在内部通过 Phase Service 判断当前是否处于 setup。
- 在 Bound API 内部对“run-only 能力”加守卫：
  - `$.use / $.onAction / $.onState / $.on / $.lifecycle.onInit` 等在 setup 段调用时，会抛出 `LogicPhaseError`；
  - `ModuleRuntime.make` 捕获该错误后：
    - 通过 `LogicDiagnostics.emitInvalidPhaseDiagnosticIfNeeded` 生成 `logic::invalid_phase` Debug 事件；
    - 构造一个仅执行空 `setup` 的 noop LogicPlan（带 `__skipRun: true`），不再 fork run 段；
    - 整个 ModuleRuntime.make 仍能在 runSync 路径上同步结束。
- 对返回 LogicPlan 的 Logic 做特殊处理：
  - 若在解析 plan 的 Effect 中遇到 `LogicPhaseError`，同样降级为 noop plan，不让构造路径被 AsyncFiberException 打断。

效果：

- “setup 里误用 run-only API”的情况不再炸 Runtime，而是转为 Debug 诊断事件；
- ModuleRuntime 的构造路径保持同步可完成，便于与 React / Runtime.make 对接。

### B. React 集成：避免在 render 链路对异步工作使用 runSync

文件：`packages/logix-react/src/components/RuntimeProvider.tsx`，`packages/logix-react/src/internal/ModuleCache.ts`，`hooks/useModule.ts`

主要修改：

1. **RuntimeProvider layer 构建：**

   - Scope 构建：用 `Effect.runSync(Scope.make())`，不依赖业务 Runtime Env；
   - Layer 构建流程：
     - 先尝试：
       ```ts
       const result = runtime.runSync(buildEffect)
       ```
     - 若同步构建失败（可能因为 layer 内含异步），不再把错误往上抛给 React，而是：
       - 降级到 `runtime.runPromise(buildEffect)`，并通过 `fallback` / loading 状态控制 UI；
       - 保证对外 Observable 结果是“要么 layer ready，要么有明确错误日志”，而不是 AsyncFiberException。
   - Logger 集成：通过 `FiberRef.currentLoggers` 将 Debug/Logger Layer 的效果叠加，而不是直接覆盖全局 logger。

2. **React 配置读取（gcTime / initTimeoutMs）：**

   - 修改前：`runtime.runSync(ReactModuleConfig.gcTime)` / `runtime.runSync(ReactModuleConfig.initTimeoutMs)`；
   - 修改后：统一使用全局默认 Runtime：
     ```ts
     const gcDelayMs = Effect.runSync(ReactModuleConfig.gcTime)
     const timeoutOpt = Effect.runSync(ReactModuleConfig.initTimeoutMs)
     ```
   - 避免“读配置”这一步间接触发业务 Runtime.layer 构建。

3. **ModuleCache：read vs readSync**

   - `read`（suspend:true 场景）：
     - 始终通过 `runtime.runPromise(factory(scope))` 构建 ModuleRuntime；
     - 利用“抛 Promise”机制驱动 Suspense，不走 runSync，适合含异步 Layer 的场景。
   - `readSync`（同步模式）：
     - 要求 `factory` 不能包含真正异步步骤，仅适用于纯同步 Layer；
     - 命中 pending/error 状态时会给出清晰的错误提示（例如同一个 key 被同时用于 suspend 和 sync）。

4. **推荐使用方式：**

   - **普通 Runtime（纯同步 Env）：**
     - `const appRuntime = Logix.Runtime.make(AppImpl, { layer: Debug.layer({ mode: "dev" }) })`
     - React 侧用 `<RuntimeProvider runtime={appRuntime}>` + `useModule(Impl)`（默认同步模式）即可。
   - **包含异步初始化的 Runtime（如 sandbox Worker + wasm）：**
     - 提供专门的 `SandboxRuntimeProvider` / `SandboxImpl`；
     - 或使用 `useModule(Impl, { suspend: true, key }) + <Suspense>`，让 ModuleRuntime 初始化走异步路径。

---

## 遇到同类问题时的操作指南

1. **认症状：**
   - 一看到 `AsyncFiberException: ... cannot be resolved synchronously`，优先怀疑本条 Incident。

2. **定位 runSync 调用点：**
   - `rg "runSync(" packages/logix-react src examples`；
   - 特别检查：
     - 新增或修改过的 `RuntimeProvider` / 自定义 Provider；
     - 配置读取逻辑（ReactModuleConfig / RuntimeConfig）；
     - 任何“构造 ModuleRuntime / Layer”的工厂里是否调用了 `runtime.runSync(...)`。

3. **检查 Layer / Logic 构造是否纯同步：**
   - 查看被构建的 Layer / Logic：
     - 是否在构造阶段用到了 `Effect.tryPromise / Effect.async / Effect.sleep / Stream.run*` 等异步原语；
     - 是否在 setup 段调用了 run-only Bound API（`$.use / $.onAction` 等）。

4. **按以下顺序修复：**
   - 若是 Logic 写法问题：
     - 把异步行为移到 run 段，setup 只做注册；
     - 依赖 Env / 平台的逻辑统一放在 run 段，通过 Phase Guard 保证构造路径稳定。
   - 若是 React 集成问题：
     - 不在 render 链路上对“可能含异步 Env 的 Effect”使用 `runtime.runSync`；
     - 改为 `runPromise` + Suspense，或将异步初始化下沉到专用 RuntimeProvider / 业务逻辑中。
   - 若是 Layer 设计问题：
     - 将异步初始化（Worker / wasm / 远程连接）从 Layer 构造中拆出，放到 service 方法或 Logic run 段；
     - 仅在确实需要时，定义“异步 Layer”，并在命名 + 文档中明确标注只支持异步构建。

---

## 相关代码与文档锚点

- Core Runtime：
  - `packages/logix-core/src/internal/runtime/ModuleRuntime.ts`
  - `packages/logix-core/src/internal/runtime/BoundApiRuntime.ts`
- React 集成：
  - `packages/logix-react/src/components/RuntimeProvider.tsx`
  - `packages/logix-react/src/internal/ModuleCache.ts`
  - `packages/logix-react/src/hooks/useModule.ts`
- Sandbox / Playground：
  - Host：`packages/logix-sandbox/src/client.ts`、`packages/logix-sandbox/src/service.ts`
  - Worker：`packages/logix-sandbox/src/worker/sandbox.worker.ts`
  - Demo：`examples/logix-sandbox-mvp/*`
- 相关草案文档：
  - `docs/specs/drafts/L5/runtime-logic-phase-guard-and-diagnostics.md`
  - `docs/specs/drafts/L6/react-runtime-config-overrides.md`
