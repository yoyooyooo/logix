# Research: React 集成冷启动/同步阻塞点与策略空间

**Feature**: `042-react-runtime-boot-dx`  
**Created**: 2025-12-27  
**Scope**: `@logixjs/react`（RuntimeProvider / useModule / ModuleCache / perf-boundaries）

## 1. 目标复盘（面向 DX）

目标不是“让 demo 不卡”，而是把导致卡顿的同步环节变成：**可配置、可解释、可回归**。

- 业务开发者：默认不踩坑（路由切换/首渲染不卡），必要时能用显式策略表达取舍（确定性 vs 响应性）。
- 维护者：有可复现的基线与阈值 gate，避免同步阻塞回归到默认链路。
- 诊断：错误与 trace 不依赖读源码猜测，且载荷 Slim、可序列化、禁用近零成本。

## 2. 关键实现链路（现状，作为“列入可能”）

### 2.1 `RuntimeProvider`：配置快照与潜在同步阻塞

- 入口：`packages/logix-react/src/internal/provider/RuntimeProvider.tsx`
- 关键行为：
  - 首次 render 的 state initializer 中尝试 `runtimeWithBindings.runSync(ReactRuntimeConfigSnapshot.load)`，失败则回退 `DEFAULT_CONFIG_SNAPSHOT`。
  - `useEffect` 中再异步 `runPromise(load)` 刷新快照并记录 debug log。
- 风险点：
  - `runSync(...)` 属于 **渲染期同步**；即使 `load` 很轻，也可能触发 runtime 的隐含初始化开销。
- 结论：Provider 的快照加载应被“策略化”治理（sync/async + budget + 诊断 + 回退）。

#### 2.1.1 重要副作用：快照变化会触发 ModuleCache 重建

当前实现里，Provider 会在快照变化时递增 `configVersion`，并把 `{ reactConfigSnapshot, configVersion }` 放入 React Context：

- `packages/logix-react/src/internal/provider/RuntimeProvider.tsx`：`return { snapshot, version: prev.version + 1 }`
- `packages/logix-react/src/internal/hooks/useModule.ts`：`getModuleCache(runtimeBase, snapshot, configVersion)`
- `packages/logix-react/src/internal/store/ModuleCache.ts`：当 version 变化时 `cached.cache.dispose()`，并创建新 cache

因此，如果我们把 Provider “改成异步加载快照”，且允许子组件先 mount（用默认快照）再更新为真实快照，会出现：

- 已创建的 ModuleCache 被 dispose（Scope 被关闭），模块实例可能被迫重建；
- 额外的初始化成本与潜在状态抖动（对 DX/性能都很糟糕）。

结论：Provider 的 “async 模式”不能仅仅是把 `runSync(load)` 去掉；必须同时治理 **cache-critical 配置的稳定性**（要么 gating 子树直到稳定快照就绪，要么把快照更新与 cache 版本解耦）。

进一步（审查结论对齐）：这里建议把“解耦”提升为硬约束：

- `configVersion`（传给 `getModuleCache`）应当只由 **cache-critical 字段**派生；
- 对当前实现而言，`ModuleCache` 的构造只使用 `gcTime`（`new ModuleCache(runtime, config.gcTime)`），因此 **`gcTime` 是唯一 critical 字段**；
- `initTimeoutMs` / `lowPriorityDelayMs` / `lowPriorityMaxDelayMs` 等应作为 **live 配置** 可刷新，但不应触发 cache dispose。

### 2.2 `useModule`（ModuleImpl）：`sync` vs `suspend` 已经存在

- 入口：`packages/logix-react/src/internal/hooks/useModule.ts`
- 关键行为（ModuleImpl 路径）：
  - 默认：`ModuleCache.readSync(...)`（同步，不触发 Suspense）
  - `options.suspend === true`：`ModuleCache.read(...)`（Suspense，render 阶段抛 Promise）
  - `suspend:true` 在 dev/test 环境要求显式 `options.key`（否则抛可读错误）。
  - `initTimeoutMs` 仅在 suspend:true 下通过 `Effect.timeoutFail` 提供 pending 上界。
- 结论：`useModule(Impl,{suspend:true})` 是现有机制，应优先复用为“可配置策略”的一部分。

### 2.3 `ModuleCache`：资源缓存 + StrictMode/Suspense 生命周期约束

- 入口：`packages/logix-react/src/internal/store/ModuleCache.ts`
- 关键行为：
  - `read`（Suspense）：render 阶段创建 Scope（用 `Effect.runSync(Scope.make())`），然后 `runtime.runPromise(factory(scope))`，并 `throw promise`。
  - `readSync`（同步）：`runtime.runSync(Scope.make())` + `runtime.runSync(factory(scope))`。
  - retain/release + 延迟 GC（默认 500ms）用于抵御 StrictMode mount/unmount 抖动。
- 结论：这里已经是“收敛点”，可作为策略执行器扩展，但需处理纯同步重活的边界（见 3.2）。

### 2.4 `useModuleRuntime`（ModuleTag）：当前是 render 阶段 `runSync(tag)`

- 入口：`packages/logix-react/src/internal/hooks/useModuleRuntime.ts`
- 关键行为：handle=ModuleTag 时 `runtime.runSync(tag as Effect)` 解析单例 ModuleRuntime。
- 风险点：这是 **渲染期同步**，且当前没有 `options`，也没有“可挂起缓存”。
- 结论：要让 ModuleTag 也能像 `useModule(Impl,{suspend:true})` 那样可控，需要新增策略入口 + 缓存（见 5）。

### 2.5 perf-boundaries（现状覆盖）

- 目录：`packages/logix-react/test/browser/perf-boundaries/`
- 代表性用例：
  - `converge-steps.test.tsx`：测 runtime.txnCommitMs / decisionMs（偏 converge runtime）。
  - 其他：诊断开销、StrictMode/Suspense jitter 等。
- 结论：需要新增针对 **React boot/resolve** 的 perf boundary（Provider/configSnapshot、ModuleTag resolve、ModuleImpl init）。

## 3. `suspend:true` 能解决吗？（边界）

### 3.1 能解决

当初始化链路存在真实异步边界时（例如 Layer 构建本身异步、或显式 yield/sleep），`read` 会在 render 阶段尽快 `throw promise`，使 React Suspense 接管，避免阻塞提交。

### 3.2 不能保证解决（关键）

即便 `suspend:true`，当前 `read` 仍会在 render 阶段调用 `runtime.runPromise(factory(scope))`；Effect Runtime 可能同步执行到“第一个异步点”。若 `factory(scope)` 在开始阶段有大量同步 CPU 工作，那么 Promise 还没返回之前主线程就可能被卡住。

结论：`suspend:true` 不是“把同步重活自动变成异步”的魔法；要治理纯同步重活，需要可配置的 **cooperative yield / 延后策略**，让 `runPromise` 尽早进入 pending。

## 4. 同步/冷启动阻塞点清单（必须收敛为策略）

> 以下是“可能在渲染关键路径发生”的同步点；不保证都慢，但都需要治理与可观测。

1. Provider 级：`RuntimeProvider` 初次 render 的 `runSync(ReactRuntimeConfigSnapshot.load)`。
2. ModuleImpl sync：`ModuleCache.readSync` 内 `runtime.runSync(Scope.make())` + `runtime.runSync(factory(scope))`。
3. ModuleTag resolve：`useModuleRuntime` 内的 `runtime.runSync(tag)`。
4. Suspense init（仍可能同步）：`ModuleCache.read` 内的 `runtime.runPromise(factory(scope))`。
5. Selector snapshot：`ModuleRuntimeExternalStore.getSnapshot` 内的 `runtime.runSync(moduleRuntime.getState)`（通常应很轻，但仍需纳入预算/诊断开关，避免误用）。

## 5. 如何“把现有实现列入可能”（策略空间）

### 5.1 已存在且应复用的机制

- `useModule(Impl, { suspend: true, key, initTimeoutMs })`：显式声明挂起语义。
- `ModuleCache`：Resource cache + retain/release + GC + key ownership 校验。
- React Runtime 配置快照模型：`ReactRuntimeConfigTag` / ConfigProvider / 默认值三段优先级（现有字段：gcTime/initTimeoutMs/lowPriority*）。
- 现有 trace：`trace:react.module-instance`、`trace:react-selector` 等（已有字段体系与稳定 id）。

### 5.2 必须新增、且要“可配置式收敛”的机制

1. Provider 冷启动策略（config snapshot）
   - `mode: sync | async`
   - `syncBudgetMs`：超预算必须回退 async，并记录诊断事件（避免继续卡住）。

2. Module 解析策略（ModuleImpl/ModuleTag）
   - `mode: sync | suspend`（defer 通过 Provider preload+gating 交付）
   - 明确每种模式的约束（是否要求显式 key / 是否允许异步 Layer / 缺失 preload 时的默认行为）。

3. Cooperative Yield / 延后策略（解决纯同步重活）
   - 在初始化 Effect 前缀插入可控 yield（例如 sleep 0 / microtask / macrotask 等策略），让 `runPromise` 尽早返回 pending。
   - 可选阈值：仅当预计/观测初始化超过 X ms 时启用（减少无谓异步化）。

4. 同步阻塞诊断与 guardrail
   - dev/test：对渲染期 `runSync` 的超预算行为告警或抛错（可行动提示）。
   - prod：默认不引入额外开销；开启诊断时输出 Slim 可序列化事件。

## 6. 方案对比（供后续 tasks 拍板）

### 推荐结论

- 推荐主线：**方案 B（cooperative yield）**
- 交付叠加：**方案 A（Provider 统一 fallback/Suspense 包装）**（作为 DX 收敛层）
- 交付叠加：**方案 C（defer）**（作为“延后冷启动/预初始化”的模式入口）

理由（面向本特性目标）：

- B 直击根因：解决“即使 suspend:true，`runPromise` 仍可能先同步跑很久”的主线程阻塞风险，且同一套机制可覆盖 ModuleImpl init 与 ModuleTag resolve。
- A 提升一致性：收敛业务侧样板（Suspense/fallback 形态），但不消灭同步重活；更适合作为 B 落地后的默认体验增强。
- C 的实现必须收敛：避免引入“返回半初始化句柄”的新 hook 语义；优先通过 Provider 级 gating + preload 交付延后能力，把复杂度封在 Provider 内，避免业务侧组合爆炸。

### 方案 A：Provider 侧统一 Suspense 包装（提升 DX）

- 做法：提供可选能力，让 Provider 在策略要求下统一提供 Suspense fallback（减少业务样板）。
- 风险：Provider 语义变重，需要明确与现有 `fallback`（layer 未就绪）如何组合。

### 方案 B：cooperative yield（直击“suspend 但仍卡”）

- 做法：为 ModuleImpl init / ModuleTag resolve 引入可配置 yield，使异步路径尽早 pending。
- 风险：yield 可能让“原本同步可用”的模块短暂进入 pending（UI 闪烁/时序抖动）；需明确默认值与迁移说明。
- 缓解：默认优先采用 microtask（`Effect.yieldNow()`）并提供可配置策略（none/microtask/macrotask），让业务在“响应性/确定性”之间做显式取舍；同时在 dev/test 提供 render 阶段超阈值同步阻塞告警（DX guardrails）。

### 方案 C：defer（不依赖 Suspense 的延后模式）

- 做法：通过 Provider 级 gating +（可选）模块 preload：先用统一 `fallback` 承接就绪前 UI；在 commit 后完成“配置快照稳定 + 关键模块预初始化”，ready 后再 mount 业务子树，避免泄漏半初始化句柄。
- 风险：若未声明 preload 且业务仍在 render 期触发同步构建，可能回退到同步阻塞；因此需要：默认策略（defer 下的 on-demand 行为）、诊断告警与基线用例兜底。
- 取舍：defer 的价值主要在“路由切换/首次进入页面”场景，将冷启动成本整体挪出渲染关键路径；与 B（yield）互补：B 兜底 on-demand 的同步前缀阻塞，C 覆盖“已知必用模块”的预初始化。

## 7. 结论

建议的落地顺序：

1. Provider 的“配置快照同步点”先策略化（sync/async + budget + 诊断 + 回退）。
2. ModuleTag resolve 纳入策略入口（做到可 suspend，并配套缓存与 yield；defer 通过 Provider preload+gating 交付）。
3. ModuleImpl 初始化补齐 yield 策略，让 `suspend:true` 真正能覆盖同步重活场景。
4. 新增 browser perf-boundaries 覆盖 boot/resolve 并设置阈值 gate，防止回归。
